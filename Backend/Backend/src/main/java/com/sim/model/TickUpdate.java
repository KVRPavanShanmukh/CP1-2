package com.sim.model;

import java.util.Objects;

public class TickUpdate {
    private String simulationId;
    private double currentTick;
    private int activeForks;
    private double instantGini;
    private int blockCount;

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

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        TickUpdate that = (TickUpdate) o;
        return Double.compare(that.currentTick, currentTick) == 0 &&
               activeForks == that.activeForks &&
               Double.compare(that.instantGini, instantGini) == 0 &&
               blockCount == that.blockCount &&
               Objects.equals(simulationId, that.simulationId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(simulationId, currentTick, activeForks, instantGini, blockCount);
    }

    @Override
    public String toString() {
        return "TickUpdate{" +
                "simulationId='" + simulationId + '\'' +
                ", currentTick=" + currentTick +
                ", activeForks=" + activeForks +
                ", instantGini=" + instantGini +
                ", blockCount=" + blockCount +
                '}';
    }
}
