package com.sim.experiment;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Full comparison report: shared seeds, the baseline aggregate, one entry per
 * treatment, and the measurements the simulation cannot support.
 */
public class ExperimentComparisonResult {
    private final String baselineName;
    private final List<Long> seeds;
    private final ExperimentAggregate baseline;
    private final List<TreatmentComparison> treatments;
    private final Map<String, String> unsupportedMeasurements;

    public ExperimentComparisonResult(String baselineName, List<Long> seeds, ExperimentAggregate baseline,
            List<TreatmentComparison> treatments, Map<String, String> unsupportedMeasurements) {
        this.baselineName = baselineName;
        this.seeds = List.copyOf(seeds);
        this.baseline = baseline;
        this.treatments = List.copyOf(treatments);
        this.unsupportedMeasurements = Collections.unmodifiableMap(new LinkedHashMap<>(unsupportedMeasurements));
    }

    public String getBaselineName() { return baselineName; }
    /** Ordered seed list applied to the baseline and every treatment. */
    public List<Long> getSeeds() { return seeds; }
    public ExperimentAggregate getBaseline() { return baseline; }
    public List<TreatmentComparison> getTreatments() { return treatments; }
    /** Measurement name to the reason no value is reported. */
    public Map<String, String> getUnsupportedMeasurements() { return unsupportedMeasurements; }
}
