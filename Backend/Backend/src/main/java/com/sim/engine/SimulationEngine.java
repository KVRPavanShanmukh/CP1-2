package com.sim.engine;

import java.util.Collections;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;

import com.sim.agent.BlockchainAgent;
import com.sim.consensus.ConsensusStrategy;
import com.sim.metrics.MetricsCalculator;
import com.sim.metrics.MetricsSnapshot;
import com.sim.model.SimulationConfig;
import com.sim.network.NetworkModel;

public class SimulationEngine {
    private SimulationState state;
    private NetworkModel networkModel;
    private ConsensusStrategy consensusStrategy;
    private MetricsCalculator metricsCalculator;

    public SimulationEngine(SimulationConfig config) {
        config.validate();
        Random rng = new Random(config.getRandomSeed() != null ? config.getRandomSeed() : System.currentTimeMillis());
        this.state = new SimulationState(config, rng);
        this.networkModel = new NetworkModel(this.state);
        this.state.setNetworkModel(this.networkModel);
        this.consensusStrategy = ConsensusStrategy.create(config.getConsensusType());
        this.metricsCalculator = new MetricsCalculator();
        initializeAgents();
        metricsCalculator.calculateMetrics(state);
    }

    private void initializeAgents() {
        int nodeCount = state.getConfig().getNodeCount();
        int byzantineCount = (int) (nodeCount * state.getConfig().getByzantineRatio());

        for (int i = 0; i < nodeCount; i++) {
            BlockchainAgent agent;
            if (i < byzantineCount) {
                agent = new com.sim.agent.ByzantineNodeAgent("Agent-" + i, state.getRng(), state);
            } else {
                agent = new BlockchainAgent("Agent-" + i, state.getRng(), state);
            }
            state.addAgent(agent);
            agent.receiveBlock(state.getBlockchainState().getGenesisBlock());
        }
        networkModel.initializeTopology();

        // Assign inactive agents deterministically from the non-Byzantine pool.
        // Uses the seeded state RNG *only* when inactiveCount > 0, so default
        // (ratio = 0) simulations produce bit-identical outputs to before.
        int inactiveCount = (int) (nodeCount * state.getConfig().getInactiveAgentRatio());
        if (inactiveCount > 0) {
            List<BlockchainAgent> nonByzantine = state.getAgents().stream()
                    .filter(a -> !(a instanceof com.sim.agent.ByzantineNodeAgent))
                    .collect(Collectors.toList());
            Collections.shuffle(nonByzantine, state.getRng());
            int toMark = Math.min(inactiveCount, nonByzantine.size());
            for (int i = 0; i < toMark; i++) {
                nonByzantine.get(i).setInactive(true);
            }
        }
    }

    public SimulationTick tick() {
        state.incrementTick();
        state.generateTransactions();
        networkModel.deliverMessages();

        for (BlockchainAgent agent : state.getAgents()) {
            agent.processMessages();
            // Inactive agents do not participate in consensus (no block production,
            // no attestation creation). processMessages() already suppresses all
            // outbound gossip and block requests for inactive agents.
            if (!agent.isInactive()) {
                consensusStrategy.execute(agent, state);
            }
        }

        metricsCalculator.calculateMetrics(state);
        return new SimulationTick(state);
    }

    public SimulationState getState() {
        return state;
    }

    public MetricsSnapshot getMetricsSnapshot() {
        return metricsCalculator.getCurrentSnapshot();
    }
}