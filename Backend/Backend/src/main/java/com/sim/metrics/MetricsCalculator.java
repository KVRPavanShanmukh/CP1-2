package com.sim.metrics;

import com.sim.engine.SimulationState;
import com.sim.agent.BlockchainAgent;

public class MetricsCalculator {
    public double currentGini = 0.0;

    public void calculateMetrics(SimulationState state) {
        double[] blocks = state.getAgents().stream().mapToDouble(BlockchainAgent::getBlocksProduced).sorted().toArray();
        currentGini = GiniCalculator.calculate(blocks);
    }
    
    public double getCurrentGini() { return currentGini; }
}