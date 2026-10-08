package com.sim.engine;

import com.sim.agent.BlockchainAgent;
import com.sim.model.SimulationConfig;
import com.sim.network.NetworkModel;
import com.sim.consensus.ConsensusStrategy;
import com.sim.metrics.MetricsCalculator;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

public class SimulationEngine {
    private SimulationState state;
    private NetworkModel networkModel;
    private ConsensusStrategy consensusStrategy;
    private MetricsCalculator metricsCalculator;

    public SimulationEngine(SimulationConfig config) {
        Random rng = new Random(config.getRandomSeed() != null ? config.getRandomSeed() : System.currentTimeMillis());
        this.state = new SimulationState(config, rng);
        this.networkModel = new NetworkModel(this.state);
        this.state.setNetworkModel(this.networkModel);
        this.consensusStrategy = ConsensusStrategy.create(config.getConsensusType());
        this.metricsCalculator = new MetricsCalculator();
        initializeAgents();
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
        }
        networkModel.initializeTopology();
    }

    public SimulationTick tick() {
        state.incrementTick();
        networkModel.deliverMessages();
        
        for (BlockchainAgent agent : state.getAgents()) {
            agent.processMessages();
            consensusStrategy.execute(agent, state);
        }
        
        metricsCalculator.calculateMetrics(state);
        return new SimulationTick(state);
    }
    
    public SimulationState getState() {
        return state;
    }
}