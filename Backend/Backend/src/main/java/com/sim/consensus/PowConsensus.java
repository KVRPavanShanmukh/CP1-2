package com.sim.consensus;

import com.sim.agent.BlockchainAgent;
import com.sim.engine.SimulationState;

public class PowConsensus extends ConsensusStrategy {
    @Override
    public void execute(BlockchainAgent agent, SimulationState state) {
        double totalHash = state.getAgents().stream().mapToDouble(BlockchainAgent::getHashPower).sum();
        double prob = agent.getHashPower() / (totalHash + 0.1);
        if (state.getRng().nextDouble() < prob * 0.5) { // 50% chance someone mines per tick
            produceBlock(agent, state);
        }
    }
}