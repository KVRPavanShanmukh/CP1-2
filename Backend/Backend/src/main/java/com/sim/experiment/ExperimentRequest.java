package com.sim.experiment;

import java.util.List;

import com.sim.model.SimulationConfig;

public class ExperimentRequest {
    private SimulationConfig configuration;
    private List<Long> seeds;

    public SimulationConfig getConfiguration() { return configuration; }
    public void setConfiguration(SimulationConfig configuration) { this.configuration = configuration; }
    public List<Long> getSeeds() { return seeds; }
    public void setSeeds(List<Long> seeds) { this.seeds = seeds; }
}
