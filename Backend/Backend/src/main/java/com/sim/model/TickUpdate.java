package com.sim.model;

import lombok.Data;

@Data
public class TickUpdate {
    private String simulationId;
    private double currentTick;
    private int activeForks;
    private double instantGini;
    private int blockCount;
}
