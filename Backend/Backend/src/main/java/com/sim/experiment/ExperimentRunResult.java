package com.sim.experiment;

import com.sim.metrics.MetricsSnapshot;
import com.sim.model.SimulationConfig;

public class ExperimentRunResult {
    private String status;
    private Long randomSeed;
    /**
     * Configuration actually executed for this run. Repeated runs hand the runner a
     * fresh copy per seed, so this snapshot keeps the copied values instead of a
     * shared template reference.
     */
    private SimulationConfig configuration;
    private String consensusType;
    private int simulationTicks;
    private long durationMillis;
    private MetricsSnapshot metrics;
    private String errorMessage;

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Long getRandomSeed() { return randomSeed; }
    public void setRandomSeed(Long randomSeed) { this.randomSeed = randomSeed; }
    public SimulationConfig getConfiguration() { return configuration; }
    public void setConfiguration(SimulationConfig configuration) { this.configuration = configuration; }
    public String getConsensusType() { return consensusType; }
    public void setConsensusType(String consensusType) { this.consensusType = consensusType; }
    public int getSimulationTicks() { return simulationTicks; }
    public void setSimulationTicks(int simulationTicks) { this.simulationTicks = simulationTicks; }
    public long getDurationMillis() { return durationMillis; }
    public void setDurationMillis(long durationMillis) { this.durationMillis = durationMillis; }
    public MetricsSnapshot getMetrics() { return metrics; }
    public void setMetrics(MetricsSnapshot metrics) { this.metrics = metrics; }
    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }
}
