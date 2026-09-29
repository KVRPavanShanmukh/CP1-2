package com.sim.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.Objects;
import java.util.UUID;

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

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getConfigId() { return configId; }
    public void setConfigId(String configId) { this.configId = configId; }

    public double getMainchainRate() { return mainchainRate; }
    public void setMainchainRate(double mainchainRate) { this.mainchainRate = mainchainRate; }

    public double getBranchingRatio() { return branchingRatio; }
    public void setBranchingRatio(double branchingRatio) { this.branchingRatio = branchingRatio; }

    public double getFinalGiniCoefficient() { return finalGiniCoefficient; }
    public void setFinalGiniCoefficient(double finalGiniCoefficient) { this.finalGiniCoefficient = finalGiniCoefficient; }

    public long getDurationMillis() { return durationMillis; }
    public void setDurationMillis(long durationMillis) { this.durationMillis = durationMillis; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        SimulationResult that = (SimulationResult) o;
        return Double.compare(that.mainchainRate, mainchainRate) == 0 &&
               Double.compare(that.branchingRatio, branchingRatio) == 0 &&
               Double.compare(that.finalGiniCoefficient, finalGiniCoefficient) == 0 &&
               durationMillis == that.durationMillis &&
               Objects.equals(id, that.id) &&
               Objects.equals(configId, that.configId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, configId, mainchainRate, branchingRatio, finalGiniCoefficient, durationMillis);
    }

    @Override
    public String toString() {
        return "SimulationResult{" +
                "id='" + id + '\'' +
                ", configId='" + configId + '\'' +
                ", mainchainRate=" + mainchainRate +
                ", branchingRatio=" + branchingRatio +
                ", finalGiniCoefficient=" + finalGiniCoefficient +
                ", durationMillis=" + durationMillis +
                '}';
    }
}
