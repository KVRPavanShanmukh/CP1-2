package com.sim.metrics;

import java.util.HashMap;
import java.util.Map;

import com.sim.agent.BlockchainAgent;
import com.sim.engine.SimulationState;

public class MetricsCalculator {
    public double currentGini = 0.0;
    private MetricsSnapshot currentSnapshot = new MetricsSnapshot();
    private int convergenceTick = -1;

    public MetricsSnapshot calculateMetrics(SimulationState state) {
        double[] blocks = state.getAgents().stream().mapToDouble(BlockchainAgent::getBlocksProduced).sorted().toArray();
        currentGini = GiniCalculator.calculate(blocks);
        MetricsSnapshot snapshot = new MetricsSnapshot();
        snapshot.setTick(state.getCurrentTick());
        snapshot.setBlockProposals(state.getAgents().stream().mapToInt(BlockchainAgent::getBlocksProposed).sum());
        snapshot.setBlocksProduced((int) state.getAgents().stream().mapToInt(BlockchainAgent::getBlocksProduced).sum());
        snapshot.setBlocksAccepted(Math.max(0, state.getBlockchainState().getTotalBlocks() - 1));
        snapshot.setBlocksRejected(state.getAgents().stream().mapToInt(BlockchainAgent::getBlocksRejected).sum());
        snapshot.setActiveForks(state.getBlockchainState().getActiveForks());
        snapshot.setMessagesSent(state.getNetworkModel().getMessagesSent());
        snapshot.setMessagesDelivered(state.getNetworkModel().getMessagesDelivered());
        snapshot.setQueuedMessages(state.getNetworkModel().getQueuedMessages());
        snapshot.setMessagesDropped(state.getNetworkModel().getMessagesDropped());
        snapshot.setDuplicateMessages(state.getNetworkModel().getDuplicateMessages()
            + state.getAgents().stream().mapToInt(BlockchainAgent::getDuplicateMessages).sum());
        snapshot.setAveragePropagationDelayTicks(state.getNetworkModel().getAverageDeliveryDelayTicks());
        snapshot.setAttestationsProduced(state.getAgents().stream().mapToInt(BlockchainAgent::getAttestationsProduced).sum());
        snapshot.setAttestationsReceived(state.getAgents().stream().mapToInt(BlockchainAgent::getAttestationsReceived).sum());
        snapshot.setByzantineAgents((int) state.getAgents().stream().filter(agent -> agent instanceof com.sim.agent.ByzantineNodeAgent).count());

        int canonicalBlocks = 0;
        int staleBlocks = 0;
        int orphanBlocks = 0;
        Map<String, Integer> headCounts = new HashMap<>();
        for (BlockchainAgent agent : state.getAgents()) {
            canonicalBlocks += agent.getCanonicalBlockIds().size();
            staleBlocks += (int) agent.getKnownBlocks().keySet().stream()
                    .filter(agent::isStale).count();
            orphanBlocks += agent.getOrphanBlocks().size();
            if (agent.getCanonicalHeadId() != null) {
                headCounts.merge(agent.getCanonicalHeadId(), 1, Integer::sum);
            }
        }
        snapshot.setCanonicalBlocks(canonicalBlocks);
        snapshot.setStaleBlocks(staleBlocks);
        snapshot.setOrphanBlocks(orphanBlocks);
        snapshot.setCompetingBlocks(staleBlocks);
        int maxHeads = headCounts.values().stream().mapToInt(Integer::intValue).max().orElse(0);
        double agreement = state.getAgents().isEmpty() ? 1.0 : (double) maxHeads / state.getAgents().size();
        snapshot.setCanonicalHeadAgreement(agreement);
        snapshot.setConverged(!state.getAgents().isEmpty() && agreement == 1.0);
        if (snapshot.isConverged() && convergenceTick < 0) {
            convergenceTick = state.getCurrentTick();
        }
        snapshot.setConvergenceTick(convergenceTick);
        snapshot.setBlockProductionRate(state.getCurrentTick() == 0 ? 0.0 : (double) snapshot.getBlocksProduced() / state.getCurrentTick());
        snapshot.setMessageThroughput(state.getCurrentTick() == 0 ? 0.0 : (double) snapshot.getMessagesDelivered() / state.getCurrentTick());
        snapshot.setGiniCoefficient(currentGini);
        currentSnapshot = snapshot;
        return snapshot;
    }
    
    public double getCurrentGini() { return currentGini; }
    public MetricsSnapshot getCurrentSnapshot() { return currentSnapshot; }
}