package com.sim.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.UUID;

@Data
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
}
