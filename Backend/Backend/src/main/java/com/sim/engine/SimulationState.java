package com.sim.engine;

import com.sim.agent.BlockchainAgent;
import com.sim.model.SimulationConfig;
import com.sim.blockchain.BlockchainState;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

public class SimulationState {
    private SimulationConfig config;
    private Random rng;
    private List<BlockchainAgent> agents = new ArrayList<>();
    private BlockchainState globalBlockchainState = new BlockchainState();
    private int currentTick = 0;

    public SimulationState(SimulationConfig config, Random rng) {
        this.config = config;
        this.rng = rng;
    }

    public void addAgent(BlockchainAgent agent) {
        agents.add(agent);
    }

    public List<BlockchainAgent> getAgents() { return agents; }
    public BlockchainState getBlockchainState() { return globalBlockchainState; }
    public SimulationConfig getConfig() { return config; }
    public Random getRng() { return rng; }
    
    public void incrementTick() { currentTick++; }
    public int getCurrentTick() { return currentTick; }
}