package com.sim.experiment;

import java.util.List;

import com.sim.model.SimulationConfig;

/**
 * Request for a baseline-versus-treatment comparison executed with one shared,
 * ordered seed list.
 */
public class ExperimentComparisonRequest {
    private NamedExperimentConfig baseline;
    private List<NamedExperimentConfig> treatments;
    private List<Long> seeds;

    public NamedExperimentConfig getBaseline() { return baseline; }
    public void setBaseline(NamedExperimentConfig baseline) { this.baseline = baseline; }
    public List<NamedExperimentConfig> getTreatments() { return treatments; }
    public void setTreatments(List<NamedExperimentConfig> treatments) { this.treatments = treatments; }
    public List<Long> getSeeds() { return seeds; }
    public void setSeeds(List<Long> seeds) { this.seeds = seeds; }

    /** A named configuration participating in the comparison. */
    public static class NamedExperimentConfig {
        private String name;
        private SimulationConfig configuration;

        public NamedExperimentConfig() {
        }

        public NamedExperimentConfig(String name, SimulationConfig configuration) {
            this.name = name;
            this.configuration = configuration;
        }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public SimulationConfig getConfiguration() { return configuration; }
        public void setConfiguration(SimulationConfig configuration) { this.configuration = configuration; }
    }
}
