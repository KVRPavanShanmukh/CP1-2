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
        snapshot.setBlockPropagationDelay(state.getNetworkModel().getAverageBlockPropagationDelay());
        snapshot.setPacketLossRate(state.getConfig().getPacketLossRate());
        snapshot.setNetworkPartitionActive(state.getNetworkModel().isPartitionActive());
        snapshot.setAttestationsProduced(state.getAgents().stream().mapToInt(BlockchainAgent::getAttestationsProduced).sum());
        snapshot.setAttestationsReceived(state.getAgents().stream().mapToInt(BlockchainAgent::getAttestationsReceived).sum());
        snapshot.setByzantineAgents((int) state.getAgents().stream().filter(agent -> agent instanceof com.sim.agent.ByzantineNodeAgent).count());
        int inactiveCount = (int) state.getAgents().stream().filter(BlockchainAgent::isInactive).count();
        snapshot.setInactiveAgents(inactiveCount);
        // activeAgents = all agents that are neither Byzantine nor inactive
        snapshot.setActiveAgents(state.getAgents().size() - snapshot.getByzantineAgents() - inactiveCount);

        int maliciousActions = state.getAgents().stream()
                .mapToInt(BlockchainAgent::getMaliciousActionsAttempted)
                .sum();
        int blocksWithheld = state.getAgents().stream()
                .mapToInt(BlockchainAgent::getBlocksWithheld)
                .sum();
        int conflictingAttestations = state.getAgents().stream()
                .mapToInt(BlockchainAgent::getConflictingAttestations)
                .sum();
        snapshot.setMaliciousActionsAttempted(maliciousActions);
        snapshot.setBlocksWithheld(blocksWithheld);
        snapshot.setConflictingAttestations(conflictingAttestations);

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
        // Use actual count of transactions that were accepted into mempools (not an estimate),
        // so seeded repeated runs produce consistent, honest metrics.
        int created = state.getTransactionsCreatedCount();
        int included = state.getBlockchainState().getIncludedTransactionCount();
        snapshot.setTransactionsCreated(created);
        snapshot.setTransactionsIncluded(included);
        // transactionSuccessRate = included unique txs / created txs; safe zero-denominator guard.
        snapshot.setTransactionSuccessRate(created == 0 ? 0.0 : (double) included / created);
        // transactionsPerSimulationTick: included txs divided by elapsed simulation ticks.
        // NOT labelled TPS because this is simulation time, not real wall-clock time.
        snapshot.setTransactionsPerSimulationTick(state.getCurrentTick() == 0 ? 0.0 : (double) included / state.getCurrentTick());
        currentSnapshot = snapshot;
        return snapshot;
    }
    
    public double getCurrentGini() { return currentGini; }
    public MetricsSnapshot getCurrentSnapshot() { return currentSnapshot; }
}
