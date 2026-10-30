package com.sim.worker;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sim.config.RabbitMQConfig;
import com.sim.metrics.MetricsSnapshot;
import com.sim.model.SimulationConfig;
import com.sim.model.SimulationResult;
import com.sim.model.TickUpdate;

@Component
public class SimulationWorker {

    @Autowired
    private RabbitTemplate rabbitTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @RabbitListener(queues = RabbitMQConfig.JOBS_QUEUE)
    public void processJob(String payload) {
        try {
            SimulationConfig config = objectMapper.readValue(payload, SimulationConfig.class);
            
            // Execute actual simulation asynchronously or inline depending on architecture
            // For now, we simulate the work in a separate thread so we don't block the listener
            new Thread(() -> runSimulation(config)).start();
            
        } catch (Exception e) {
            System.err.println("Worker failed to process job: " + e.getMessage());
        }
    }
    
    private void runSimulation(SimulationConfig config) {
        long startTime = System.currentTimeMillis();
        
        try {
            // Give frontend time to establish WebSocket subscription
            Thread.sleep(1500);
            
            com.sim.engine.SimulationEngine engine = new com.sim.engine.SimulationEngine(config);
            int ticks = config.getSimulationTicks();
            
            for (int i = 1; i <= ticks; i++) {
                Thread.sleep((long) config.getSlotDuration() > 0 ? (long) config.getSlotDuration() : 500); // Wait slot duration or 500ms
                
                engine.tick();
                MetricsSnapshot snapshot = engine.getMetricsSnapshot();
                
                TickUpdate tick = new TickUpdate();
                tick.setSimulationId(config.getId());
                tick.setCurrentTick(snapshot.getTick());
                tick.setActiveForks(snapshot.getActiveForks());
                tick.setInstantGini(snapshot.getGiniCoefficient());
                tick.setBlockCount(snapshot.getBlocksAccepted());
                tick.setMainchainRate(engine.getState().getBlockchainState().getMainchainRate());
                tick.setMetrics(snapshot);
                
                rabbitTemplate.convertAndSend(
                    RabbitMQConfig.EXCHANGE_NAME, 
                    "simulation.ticks." + config.getId(), 
                    objectMapper.writeValueAsString(tick)
                );
            }
            
            // Calculate final results
            SimulationResult result = new SimulationResult();
            result.setConfigId(config.getId());
            result.setStatus("COMPLETED");
            result.setConsensusType(config.getConsensusType());
            result.setRandomSeed(config.getRandomSeed());
            result.setSimulationTicks(ticks);
            
            double mainchainRate = engine.getState().getBlockchainState().getMainchainRate();
            result.setMainchainRate(mainchainRate);
            
            // Simple branching ratio calculation
            int total = engine.getState().getBlockchainState().getTotalBlocks();
            result.setBranchingRatio(total > 0 ? (double)engine.getState().getBlockchainState().getActiveForks() / total : 0.0);
            
            // Gini
            com.sim.metrics.MetricsCalculator metrics = new com.sim.metrics.MetricsCalculator();
            MetricsSnapshot snapshot = metrics.calculateMetrics(engine.getState());
            result.setFinalGiniCoefficient(metrics.getCurrentGini());
            result.setMetrics(snapshot);
            
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
