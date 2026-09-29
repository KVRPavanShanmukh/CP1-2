package com.sim.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.Objects;
import java.util.UUID;

@Document(collection = "simulation_configs")
public class SimulationConfig {
    @Id
    private String id;
    private int nodeCount;
    private String consensusType; // PoW, PoS, DPoS, PoA, PoL
    private String networkTopology; // Erdos-Renyi, Small-World, Scale-Free
    private double blockGossipLatency;
    private double slotDuration;

    public SimulationConfig() {
        this.id = UUID.randomUUID().toString();
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

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        SimulationConfig that = (SimulationConfig) o;
        return nodeCount == that.nodeCount &&
               Double.compare(that.blockGossipLatency, blockGossipLatency) == 0 &&
               Double.compare(that.slotDuration, slotDuration) == 0 &&
               Objects.equals(id, that.id) &&
               Objects.equals(consensusType, that.consensusType) &&
               Objects.equals(networkTopology, that.networkTopology);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, nodeCount, consensusType, networkTopology, blockGossipLatency, slotDuration);
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
                '}';
    }
}
