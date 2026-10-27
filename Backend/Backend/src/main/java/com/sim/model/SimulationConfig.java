package com.sim.model;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "simulation_configs")
public class SimulationConfig {
    @Id
    private String id;
    private int nodeCount;
    private String consensusType; // PoW, PoS, DPoS, PoA, PoL
    private String networkTopology; // Erdos-Renyi, Small-World, Scale-Free
    private double blockGossipLatency;
    private double slotDuration;
    private String status; // CREATED, RUNNING, COMPLETED, FAILED
    private Long randomSeed;
    private double byzantineRatio = 0.0; // Default no byzantine
    private boolean byzantineBehaviorEnabled = false;
    private List<String> authorityIds = new ArrayList<>();
    private int simulationTicks = 10;
    private int transactionsPerAgentPerTick = 0;
    private int mempoolCapacity = 100;
    private int maxTransactionsPerBlock = 100;
    private double transactionAmount = 1.0;
    /**
     * Fraction of agents to mark as inactive at simulation start.
     * Inactive agents receive incoming messages but do not produce blocks,
     * create attestations, generate transactions, or initiate gossip.
     * Default 0.0 = all agents active. Must satisfy: byzantineRatio + inactiveAgentRatio <= 1.
     */
    private double inactiveAgentRatio = 0.0;

    public SimulationConfig() {
        this.id = UUID.randomUUID().toString();
        this.status = "CREATED";
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public int getNodeCount() { return nodeCount; }
    public void setNodeCount(int nodeCount) { this.nodeCount = nodeCount; }

    public String getConsensusType() { return consensusType; }
    public void setConsensusType(String consensusType) { this.consensusType = consensusType; }

    public String getNetworkTopology() { return networkTopology; }
    public void setNetworkTopology(String networkTopology) { this.networkTopology = networkTopology; }

    public double getBlockGossipLatency() { return blockGossipLatency; }
    public void setBlockGossipLatency(double blockGossipLatency) { this.blockGossipLatency = blockGossipLatency; }

    public double getSlotDuration() { return slotDuration; }
    public void setSlotDuration(double slotDuration) { this.slotDuration = slotDuration; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Long getRandomSeed() { return randomSeed; }
    public void setRandomSeed(Long randomSeed) { this.randomSeed = randomSeed; }

    public double getByzantineRatio() { return byzantineRatio; }
    public void setByzantineRatio(double byzantineRatio) { this.byzantineRatio = byzantineRatio; }

    public boolean isByzantineBehaviorEnabled() { return byzantineBehaviorEnabled; }
    public void setByzantineBehaviorEnabled(boolean byzantineBehaviorEnabled) {
        this.byzantineBehaviorEnabled = byzantineBehaviorEnabled;
    }

    public List<String> getAuthorityIds() { return new ArrayList<>(authorityIds); }
    public void setAuthorityIds(List<String> authorityIds) {
        this.authorityIds = authorityIds == null ? new ArrayList<>() : new ArrayList<>(authorityIds);
    }

    public int getSimulationTicks() { return simulationTicks; }
    public void setSimulationTicks(int simulationTicks) { this.simulationTicks = simulationTicks; }
    public int getTransactionsPerAgentPerTick() { return transactionsPerAgentPerTick; }
    public void setTransactionsPerAgentPerTick(int value) { this.transactionsPerAgentPerTick = value; }
    public int getMempoolCapacity() { return mempoolCapacity; }
    public void setMempoolCapacity(int value) { this.mempoolCapacity = value; }
    public int getMaxTransactionsPerBlock() { return maxTransactionsPerBlock; }
    public void setMaxTransactionsPerBlock(int value) { this.maxTransactionsPerBlock = value; }
    public double getTransactionAmount() { return transactionAmount; }
    public void setTransactionAmount(double value) { this.transactionAmount = value; }
    public double getInactiveAgentRatio() { return inactiveAgentRatio; }
    public void setInactiveAgentRatio(double value) { this.inactiveAgentRatio = value; }

    public void validate() {
        if (nodeCount <= 0) throw new IllegalArgumentException("nodeCount must be greater than zero");
        if (consensusType == null || consensusType.isBlank()
                || !(consensusType.equalsIgnoreCase("PoW") || consensusType.equalsIgnoreCase("PoS")
                || consensusType.equalsIgnoreCase("DPoS") || consensusType.equalsIgnoreCase("PoA")
                || consensusType.equalsIgnoreCase("PoL"))) {
            throw new IllegalArgumentException("consensusType must be PoW, PoS, DPoS, PoA, or PoL");
        }
        if (networkTopology == null || networkTopology.isBlank()) {
            throw new IllegalArgumentException("networkTopology is required");
        }
        if (blockGossipLatency < 0 || slotDuration < 0) {
            throw new IllegalArgumentException("latencies and slotDuration cannot be negative");
        }
        if (simulationTicks <= 0) throw new IllegalArgumentException("simulationTicks must be greater than zero");
        if (transactionsPerAgentPerTick < 0 || mempoolCapacity <= 0 || maxTransactionsPerBlock <= 0
                || !Double.isFinite(transactionAmount) || transactionAmount <= 0) {
            throw new IllegalArgumentException("Transaction settings must be non-negative with positive capacity, block limit, and amount");
        }
        if (byzantineRatio < 0 || byzantineRatio > 1) {
            throw new IllegalArgumentException("byzantineRatio must be between 0 and 1");
        }
        if (inactiveAgentRatio < 0 || inactiveAgentRatio > 1) {
            throw new IllegalArgumentException("inactiveAgentRatio must be between 0 and 1");
        }
        if (byzantineRatio + inactiveAgentRatio > 1.0) {
            throw new IllegalArgumentException("byzantineRatio + inactiveAgentRatio must not exceed 1");
        }
        if (authorityIds.stream().anyMatch(id -> id == null || id.isBlank())) {
            throw new IllegalArgumentException("authorityIds cannot contain blank IDs");
        }
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        SimulationConfig that = (SimulationConfig) o;
        return nodeCount == that.nodeCount &&
               Double.compare(that.blockGossipLatency, blockGossipLatency) == 0 &&
               Double.compare(that.slotDuration, slotDuration) == 0 &&
               simulationTicks == that.simulationTicks &&
               byzantineBehaviorEnabled == that.byzantineBehaviorEnabled &&
               Objects.equals(id, that.id) &&
               Objects.equals(consensusType, that.consensusType) &&
               Objects.equals(networkTopology, that.networkTopology) &&
               Objects.equals(status, that.status) &&
               Objects.equals(randomSeed, that.randomSeed) &&
               Objects.equals(authorityIds, that.authorityIds);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, nodeCount, consensusType, networkTopology, blockGossipLatency, slotDuration,
            status, randomSeed, byzantineBehaviorEnabled, authorityIds, simulationTicks);
    }

    @Override
    public String toString() {
        return "SimulationConfig{" +
                "id='" + id + '\'' +
                ", nodeCount=" + nodeCount +
                ", consensusType='" + consensusType + '\'' +
                ", networkTopology='" + networkTopology + '\'' +
                ", blockGossipLatency=" + blockGossipLatency +
                ", slotDuration=" + slotDuration +
                ", status='" + status + '\'' +
                '}';
    }
}
