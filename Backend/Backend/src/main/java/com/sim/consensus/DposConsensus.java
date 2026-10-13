package com.sim.consensus;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import com.sim.agent.BlockchainAgent;
import com.sim.engine.SimulationState;

/**
 * DPoS uses stake as the deterministic delegation vote. The top ceil(N/3)
 * stake holders are delegates and one delegate is eligible per simulation tick.
 */
public class DposConsensus extends ConsensusStrategy {
    public static List<BlockchainAgent> selectDelegates(SimulationState state) {
        List<BlockchainAgent> delegates = new ArrayList<>(state.getAgents());
        delegates.sort(Comparator.comparingDouble(BlockchainAgent::getStake).reversed()
                .thenComparing(BlockchainAgent::getId));
        int delegateCount = Math.max(1, (delegates.size() + 2) / 3);
        return new ArrayList<>(delegates.subList(0, Math.min(delegateCount, delegates.size())));
    }

    public static boolean isEligible(BlockchainAgent agent, SimulationState state) {
        return isEligible(agent.getId(), state.getCurrentTick(), state);
    }

    public static boolean isEligible(String agentId, int tick, SimulationState state) {
        List<BlockchainAgent> delegates = selectDelegates(state);
        if (delegates.isEmpty()) {
            return false;
        }
        int scheduledIndex = Math.floorMod(tick, delegates.size());
        return delegates.get(scheduledIndex).getId().equals(agentId);
    }

    @Override
    public void execute(BlockchainAgent agent, SimulationState state) {
        if (isEligible(agent, state)) {
            produceBlock(agent, state);
        }
    }
}
