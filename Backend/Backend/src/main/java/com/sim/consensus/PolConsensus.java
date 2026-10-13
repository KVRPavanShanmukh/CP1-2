package com.sim.consensus;

import java.util.Comparator;

import com.sim.agent.BlockchainAgent;
import com.sim.engine.SimulationState;

/**
 * PoL assumption for this model: no geographic data exists, so the stable
 * lowest agent ID represents the closest eligible location. Only that agent
 * may produce a block. This is a deterministic proxy, not geographic proof.
 */
public class PolConsensus extends ConsensusStrategy {
    public static String getEligibleLocationAgentId(SimulationState state) {
        return state.getAgents().stream()
                .map(BlockchainAgent::getId)
                .min(Comparator.naturalOrder())
                .orElse(null);
    }

    public static boolean isEligible(BlockchainAgent agent, SimulationState state) {
        return isEligible(agent.getId(), state);
    }

    public static boolean isEligible(String agentId, SimulationState state) {
        return agentId.equals(getEligibleLocationAgentId(state));
    }

    @Override
    public void execute(BlockchainAgent agent, SimulationState state) {
        if (isEligible(agent, state)) {
            produceBlock(agent, state);
        }
    }
}
