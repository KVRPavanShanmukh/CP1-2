package com.sim.model;

import com.sim.metrics.MetricsSnapshot;
import java.util.Objects;

public class TickUpdate {
    private String simulationId;
    private double currentTick;
    private int activeForks;
    private double instantGini;
    private int blockCount;
    private MetricsSnapshot metrics;
    private double mainchainRate;
    /** Configured number of ticks for this run. */
    private int totalTicks;
    /** Completed fraction of the run in [0, 1]; 0 before the first tick. */
    private double progress;

    public String getSimulationId() { return simulationId; }
    public void setSimulationId(String simulationId) { this.simulationId = simulationId; }

    public double getCurrentTick() { return currentTick; }
    public void setCurrentTick(double currentTick) { this.currentTick = currentTick; }

    public int getActiveForks() { return activeForks; }
    public void setActiveForks(int activeForks) { this.activeForks = activeForks; }

    public double getInstantGini() { return instantGini; }
    public void setInstantGini(double instantGini) { this.instantGini = instantGini; }

    public int getBlockCount() { return blockCount; }
    public void setBlockCount(int blockCount) { this.blockCount = blockCount; }
    public MetricsSnapshot getMetrics() { return metrics; }
    public void setMetrics(MetricsSnapshot metrics) { this.metrics = metrics; }
    public double getMainchainRate() { return mainchainRate; }
    public void setMainchainRate(double mainchainRate) { this.mainchainRate = mainchainRate; }
    public int getTotalTicks() { return totalTicks; }
    public void setTotalTicks(int totalTicks) { this.totalTicks = totalTicks; }
    public double getProgress() { return progress; }
    public void setProgress(double progress) { this.progress = progress; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        TickUpdate that = (TickUpdate) o;
        return Double.compare(that.currentTick, currentTick) == 0 &&
               activeForks == that.activeForks &&
               Double.compare(that.instantGini, instantGini) == 0 &&
               Double.compare(that.mainchainRate, mainchainRate) == 0 &&
               totalTicks == that.totalTicks &&
               Double.compare(that.progress, progress) == 0 &&
               blockCount == that.blockCount &&
               Objects.equals(simulationId, that.simulationId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(simulationId, currentTick, activeForks, instantGini, mainchainRate, blockCount,
                totalTicks, progress);
    }

    @Override
    public String toString() {
        return "TickUpdate{" +
                "simulationId='" + simulationId + '\'' +
                ", currentTick=" + currentTick +
                ", activeForks=" + activeForks +
                ", instantGini=" + instantGini +
                ", mainchainRate=" + mainchainRate +
                ", blockCount=" + blockCount +
                ", totalTicks=" + totalTicks +
                ", progress=" + progress +
                '}';
    }
}
