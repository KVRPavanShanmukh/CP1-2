package com.sim.metrics;

public class MetricsSnapshot {
    private int tick;
    private int blocksProduced;
    private int blockProposals;
    private int blocksAccepted;
    private int blocksRejected;
    private int canonicalBlocks;
    private int staleBlocks;
    private int competingBlocks;
    private int orphanBlocks;
    private int activeForks;
    private double canonicalHeadAgreement;
    private boolean converged;
    private int messagesSent;
    private int messagesDelivered;
    private int messagesDropped;
    private int duplicateMessages;
    private double averagePropagationDelayTicks;
    private int attestationsProduced;
    private int attestationsReceived;
    private int byzantineAgents;
    /** Number of agents marked inactive for this simulation. */
    private int inactiveAgents;
    /** Number of agents that are neither Byzantine nor inactive. */
    private int activeAgents;
    private double blockProductionRate;
    private double messageThroughput;
    private double giniCoefficient;
    private int queuedMessages;
    private int convergenceTick = -1;
    private int transactionsCreated;
    private int transactionsIncluded;
    private double transactionSuccessRate;
    private double transactionsPerSimulationTick;

    public int getTick() { return tick; }
    public void setTick(int tick) { this.tick = tick; }
    public int getBlocksProduced() { return blocksProduced; }
    public void setBlocksProduced(int value) { blocksProduced = value; }
    public int getBlockProposals() { return blockProposals; }
    public void setBlockProposals(int value) { blockProposals = value; }
    public int getBlocksAccepted() { return blocksAccepted; }
    public void setBlocksAccepted(int value) { blocksAccepted = value; }
    public int getBlocksRejected() { return blocksRejected; }
    public void setBlocksRejected(int value) { blocksRejected = value; }
    public int getCanonicalBlocks() { return canonicalBlocks; }
    public void setCanonicalBlocks(int value) { canonicalBlocks = value; }
    public int getStaleBlocks() { return staleBlocks; }
    public void setStaleBlocks(int value) { staleBlocks = value; }
    public int getCompetingBlocks() { return competingBlocks; }
    public void setCompetingBlocks(int value) { competingBlocks = value; }
    public int getOrphanBlocks() { return orphanBlocks; }
    public void setOrphanBlocks(int value) { orphanBlocks = value; }
    public int getActiveForks() { return activeForks; }
    public void setActiveForks(int value) { activeForks = value; }
    public double getCanonicalHeadAgreement() { return canonicalHeadAgreement; }
    public void setCanonicalHeadAgreement(double value) { canonicalHeadAgreement = value; }
    public boolean isConverged() { return converged; }
    public void setConverged(boolean value) { converged = value; }
    public int getMessagesSent() { return messagesSent; }
    public void setMessagesSent(int value) { messagesSent = value; }
    public int getMessagesDelivered() { return messagesDelivered; }
    public void setMessagesDelivered(int value) { messagesDelivered = value; }
    public int getMessagesDropped() { return messagesDropped; }
    public void setMessagesDropped(int value) { messagesDropped = value; }
    public int getDuplicateMessages() { return duplicateMessages; }
    public void setDuplicateMessages(int value) { duplicateMessages = value; }
    public double getAveragePropagationDelayTicks() { return averagePropagationDelayTicks; }
    public void setAveragePropagationDelayTicks(double value) { averagePropagationDelayTicks = value; }
    public int getAttestationsProduced() { return attestationsProduced; }
    public void setAttestationsProduced(int value) { attestationsProduced = value; }
    public int getAttestationsReceived() { return attestationsReceived; }
    public void setAttestationsReceived(int value) { attestationsReceived = value; }
    public int getByzantineAgents() { return byzantineAgents; }
    public void setByzantineAgents(int value) { byzantineAgents = value; }
    public int getInactiveAgents() { return inactiveAgents; }
    public void setInactiveAgents(int value) { inactiveAgents = value; }
    public int getActiveAgents() { return activeAgents; }
    public void setActiveAgents(int value) { activeAgents = value; }
    public double getBlockProductionRate() { return blockProductionRate; }
    public void setBlockProductionRate(double value) { blockProductionRate = value; }
    public double getMessageThroughput() { return messageThroughput; }
    public void setMessageThroughput(double value) { messageThroughput = value; }
    public double getGiniCoefficient() { return giniCoefficient; }
    public void setGiniCoefficient(double value) { giniCoefficient = value; }
    public int getQueuedMessages() { return queuedMessages; }
    public void setQueuedMessages(int value) { queuedMessages = value; }
    public int getConvergenceTick() { return convergenceTick; }
    public void setConvergenceTick(int value) { convergenceTick = value; }
    public int getTransactionsCreated() { return transactionsCreated; }
    public void setTransactionsCreated(int value) { transactionsCreated = value; }
    public int getTransactionsIncluded() { return transactionsIncluded; }
    public void setTransactionsIncluded(int value) { transactionsIncluded = value; }
    public double getTransactionSuccessRate() { return transactionSuccessRate; }
    public void setTransactionSuccessRate(double value) { transactionSuccessRate = value; }
    public double getTransactionsPerSimulationTick() { return transactionsPerSimulationTick; }
    public void setTransactionsPerSimulationTick(double value) { transactionsPerSimulationTick = value; }
}