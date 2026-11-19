package com.sim.worker;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sim.agent.BlockchainAgent;
import com.sim.agent.ByzantineNodeAgent;
import com.sim.config.RabbitMQConfig;
import com.sim.metrics.MetricsSnapshot;
import com.sim.model.EdgeTelemetry;
import com.sim.model.EventTelemetry;
import com.sim.model.NodeTelemetry;
import com.sim.model.SimulationConfig;
import com.sim.model.SimulationResult;
import com.sim.model.TickUpdate;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Component
public class SimulationWorker {

    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;

    public SimulationWorker(RabbitTemplate rabbitTemplate, ObjectMapper objectMapper) {
        this.rabbitTemplate = rabbitTemplate;
        this.objectMapper = objectMapper;
    }

    @RabbitListener(queues = RabbitMQConfig.JOBS_QUEUE)
    public void processJob(String payload) {
        try {
            SimulationConfig config = objectMapper.readValue(payload, SimulationConfig.class);
            // Execute synchronously on the listener thread so tick/result ordering and the
            // persisted config status stay deterministic for one simulation run.
            runSimulation(config);
        } catch (Exception e) {
            System.err.println("Worker failed to process job: " + e.getMessage());
        }
    }
    
    private void runSimulation(SimulationConfig config) {
        long startTime = System.currentTimeMillis();

        try {
            // Give the frontend time to establish its WebSocket/STOMP subscription before
            // the first tick is published. Ticks travel worker -> RabbitMQ -> listener -> WS.
            Thread.sleep(1500);

            com.sim.engine.SimulationEngine engine = new com.sim.engine.SimulationEngine(config);
            int ticks = config.getSimulationTicks();
            // slotDuration is expressed in seconds; enforce a small floor so a zero slot
            // duration cannot flood the tick stream.
            long tickMillis = Math.max(50L, Math.round(config.getSlotDuration() * 1000.0));

            for (int i = 1; i <= ticks; i++) {
                Thread.sleep(tickMillis);

                engine.tick();
                MetricsSnapshot snapshot = engine.getMetricsSnapshot();

                TickUpdate tick = new TickUpdate();
                tick.setSimulationId(config.getId());
                tick.setCurrentTick(snapshot.getTick());
                tick.setActiveForks(snapshot.getActiveForks());
                tick.setInstantGini(snapshot.getGiniCoefficient());
                tick.setBlockCount(snapshot.getBlocksAccepted());
                tick.setMainchainRate(snapshot.getMainchainRate());
                tick.setTotalTicks(ticks);
                tick.setProgress(ticks == 0 ? 1.0 : Math.min(1.0, (double) i / ticks));
                tick.setMetrics(snapshot);

                // Collect compact real-time agent telemetry for 3D visualization
                List<NodeTelemetry> nodeSnapshots = new ArrayList<>();
                for (BlockchainAgent agent : engine.getState().getAgents()) {
                    NodeTelemetry node = new NodeTelemetry();
                    node.setId(agent.getId());
                    node.setRole(agent instanceof ByzantineNodeAgent ? "BYZANTINE" : agent.isInactive() ? "INACTIVE" : "HONEST");
                    node.setPartitionId(engine.getState().getNetworkModel().getPartitionMap().getOrDefault(agent.getId(), 0));
                    node.setStake(agent.getStake());
                    node.setHashPower(agent.getHashPower());
                    node.setHeadBlockId(agent.getCanonicalHeadId());
                    node.setMempoolSize(agent.getMempoolSize());
                    node.setPeers(agent.getPeers());

                    if (agent.isInactive()) {
                        node.setCurrentAction("IDLE");
                        node.setProposer(false);
                    } else if (agent.getHighestBlock() != null && agent.getId().equals(agent.getHighestBlock().getProducerAgentId())
                            && agent.getHighestBlock().getTickProduced() == i) {
                        node.setCurrentAction("PROPOSING");
                        node.setProposer(true);
                    } else if (agent instanceof ByzantineNodeAgent byz && byz.getBlocksWithheld() > 0) {
                        node.setCurrentAction("WITHHOLDING");
                        node.setProposer(false);
                    } else if (agent.getAttestationsProduced() > 0) {
                        node.setCurrentAction("ATTESTING");
                        node.setProposer(false);
                    } else {
                        node.setCurrentAction("VALIDATING");
                        node.setProposer(false);
                    }
                    nodeSnapshots.add(node);
                }

                List<EdgeTelemetry> edges = new ArrayList<>();
                Set<String> seenEdges = new HashSet<>();
                for (BlockchainAgent agent : engine.getState().getAgents()) {
                    for (String peerId : agent.getPeers()) {
                        String key = agent.getId().compareTo(peerId) < 0 ? agent.getId() + "--" + peerId : peerId + "--" + agent.getId();
                        if (seenEdges.add(key)) {
                            edges.add(new EdgeTelemetry(agent.getId(), peerId));
                        }
                    }
                }

                List<EventTelemetry> events = engine.getState().consumeTickEvents();

                tick.setNodes(nodeSnapshots);
                tick.setEdges(edges);
                tick.setEvents(events);

                rabbitTemplate.convertAndSend(
                    RabbitMQConfig.EXCHANGE_NAME,
                    "simulation.ticks." + config.getId(),
                    objectMapper.writeValueAsString(tick)
                );
            }

            // Final results come from the engine's own final snapshot so the persisted
            // metrics are exactly the ones streamed on the last tick.
            MetricsSnapshot finalSnapshot = engine.getMetricsSnapshot();
            SimulationResult result = new SimulationResult();
            result.setConfigId(config.getId());
            result.setStatus("COMPLETED");
            result.setConsensusType(config.getConsensusType());
            result.setRandomSeed(config.getRandomSeed());
            result.setSimulationTicks(ticks);
            result.setMainchainRate(finalSnapshot.getMainchainRate());
            result.setBranchingRatio(finalSnapshot.getBranchingRatio());
            result.setFinalGiniCoefficient(finalSnapshot.getGiniCoefficient());
            result.setMetrics(finalSnapshot);
            result.setDurationMillis(System.currentTimeMillis() - startTime);

            // Publish result
            rabbitTemplate.convertAndSend(
                RabbitMQConfig.EXCHANGE_NAME,
                "simulation.results." + config.getId(),
                objectMapper.writeValueAsString(result)
            );

        } catch (Exception e) {
            SimulationResult failed = new SimulationResult();
            failed.setConfigId(config.getId());
            failed.setStatus("FAILED");
            failed.setConsensusType(config.getConsensusType());
            failed.setRandomSeed(config.getRandomSeed());
            failed.setSimulationTicks(config.getSimulationTicks());
            failed.setErrorMessage(e.getMessage());
            failed.setDurationMillis(System.currentTimeMillis() - startTime);
            try {
                rabbitTemplate.convertAndSend(
                    RabbitMQConfig.EXCHANGE_NAME,
                    "simulation.results." + config.getId(),
                    objectMapper.writeValueAsString(failed)
                );
            } catch (Exception publishFailure) {
                publishFailure.printStackTrace();
            }
        }
    }
}
