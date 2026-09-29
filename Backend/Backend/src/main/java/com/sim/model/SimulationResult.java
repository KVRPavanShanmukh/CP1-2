package com.sim.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.UUID;

@Data
@Document(collection = "simulation_results")
public class SimulationResult {
    @Id
    private String id;
    private String configId;
    private double mainchainRate;
    private double branchingRatio;
    private double finalGiniCoefficient;
    private long durationMillis;

    public SimulationResult() {
        this.id = UUID.randomUUID().toString();
    }
}
