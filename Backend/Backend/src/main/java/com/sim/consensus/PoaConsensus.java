package com.sim.consensus;

import java.util.ArrayList;
import java.util.List;

import com.sim.agent.BlockchainAgent;
import com.sim.engine.SimulationState;

/**
 * PoA uses the configured authorityIds. When none are configured, the first
 * deterministic ceil(N/3) agent IDs form the default authority set.
 */
public class PoaConsensus extends ConsensusStrategy {
    public static List<String> getAuthorizedValidatorIds(SimulationState state) {
        List<String> configured = state.getConfig().getAuthorityIds();
        if (!configured.isEmpty()) {
            return configured.stream()
                    .filter(id -> state.getAgent(id) != null)
                    .distinct()
                    .sorted()
                    .toList();
        }

        List<String> fallback = state.getAgents().stream()
                .map(BlockchainAgent::getId)
                .sorted()
                .toList();
        int authorityCount = Math.max(1, (fallback.size() + 2) / 3);
        return new ArrayList<>(fallback.subList(0, Math.min(authorityCount, fallback.size())));
    }

    public static boolean isAuthorized(BlockchainAgent agent, SimulationState state) {
        return isAuthorized(agent.getId(), state);
    }

    public static boolean isAuthorized(String agentId, SimulationState state) {
        return getAuthorizedValidatorIds(state).contains(agentId);
    }

    @Override
    public void execute(BlockchainAgent agent, SimulationState state) {
        List<String> authorities = getAuthorizedValidatorIds(state);
        if (!authorities.isEmpty()
                && authorities.get(Math.floorMod(state.getCurrentTick(), authorities.size())).equals(agent.getId())) {
            produceBlock(agent, state);
        }
    }
}
