package com.sim.experiment;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import com.sim.model.SimulationConfig;

/**
 * Runs a baseline and every treatment with the same ordered seed list and reports
 * per-metric treatment deltas.
 *
 * <p>Each side is executed through {@link ExperimentRunner#runRepeated}, which copies
 * the template configuration per seed. The baseline and treatment templates are never
 * mutated, so every run keeps the configuration and seed it actually used.</p>
 */
public class ExperimentComparisonRunner {
    /** Mirrors the controller's experiment seed limit. */
    public static final int DEFAULT_MAX_SEEDS = 50;

    private final ExperimentRunner experimentRunner;
    private final int maxSeeds;

    public ExperimentComparisonRunner() {
        this(DEFAULT_MAX_SEEDS);
    }

    public ExperimentComparisonRunner(int maxSeeds) {
        if (maxSeeds <= 0) {
            throw new IllegalArgumentException("maxSeeds must be greater than zero");
        }
        this.maxSeeds = maxSeeds;
        this.experimentRunner = new ExperimentRunner();
    }

    public ExperimentComparisonResult run(ExperimentComparisonRequest request) {
        validate(request);
        List<Long> seeds = List.copyOf(request.getSeeds());
        SimulationConfig baselineConfig = request.getBaseline().getConfiguration();

        ExperimentAggregate baselineAggregate = experimentRunner.runRepeated(baselineConfig, seeds);

        List<TreatmentComparison> treatments = new ArrayList<>(request.getTreatments().size());
        for (ExperimentComparisonRequest.NamedExperimentConfig treatment : request.getTreatments()) {
            ExperimentAggregate treatmentAggregate =
                    experimentRunner.runRepeated(treatment.getConfiguration(), seeds);
            List<FactorChange> changedFactors = FactorDetector.detect(baselineConfig, treatment.getConfiguration());
            boolean controlled = changedFactors.size() == 1;
            treatments.add(new TreatmentComparison(treatment.getName().trim(), changedFactors, controlled,
                    statusNote(changedFactors, controlled), treatmentAggregate,
                    ComparisonStatistics.compare(baselineAggregate, treatmentAggregate)));
        }

        return new ExperimentComparisonResult(request.getBaseline().getName().trim(), seeds, baselineAggregate,
                treatments, ComparisonStatistics.unsupportedMeasurements());
    }

    private void validate(ExperimentComparisonRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Comparison request is required.");
        }
        ExperimentComparisonRequest.NamedExperimentConfig baseline = request.getBaseline();
        if (baseline == null || baseline.getConfiguration() == null) {
            throw new IllegalArgumentException("Baseline configuration is required.");
        }
        if (baseline.getName() == null || baseline.getName().isBlank()) {
            throw new IllegalArgumentException("Baseline configuration name is required.");
        }
        List<ExperimentComparisonRequest.NamedExperimentConfig> treatments = request.getTreatments();
        if (treatments == null || treatments.isEmpty()) {
            throw new IllegalArgumentException("At least one treatment configuration is required.");
        }
        Set<String> names = new HashSet<>();
        for (int index = 0; index < treatments.size(); index++) {
            ExperimentComparisonRequest.NamedExperimentConfig treatment = treatments.get(index);
            if (treatment == null || treatment.getConfiguration() == null) {
                throw new IllegalArgumentException("Treatment configuration at index " + index + " is required.");
            }
            if (treatment.getName() == null || treatment.getName().isBlank()) {
                throw new IllegalArgumentException(
                        "Treatment configuration at index " + index + " requires a name.");
            }
            String normalizedName = treatment.getName().trim().toLowerCase(Locale.ROOT);
            if (!names.add(normalizedName)) {
                throw new IllegalArgumentException("Duplicate treatment name: " + treatment.getName().trim() + ".");
            }
        }
        List<Long> seeds = request.getSeeds();
        if (seeds == null || seeds.isEmpty()) {
            throw new IllegalArgumentException("At least one shared experiment seed is required.");
        }
        if (seeds.size() > maxSeeds) {
            throw new IllegalArgumentException("Maximum of " + maxSeeds + " experiment seeds allowed.");
        }
        for (Long seed : seeds) {
            if (seed == null) {
                throw new IllegalArgumentException("Experiment seeds cannot be null.");
            }
        }
        // Validate every configuration before any run starts, so an invalid treatment
        // fails the request instead of wasting the completed baseline runs.
        baseline.getConfiguration().validate();
        for (ExperimentComparisonRequest.NamedExperimentConfig treatment : treatments) {
            treatment.getConfiguration().validate();
        }
    }

    private String statusNote(List<FactorChange> changedFactors, boolean controlled) {
        if (changedFactors.isEmpty()) {
            return "No configuration factor differs, so only seed-to-seed variation is observed.";
        }
        if (controlled) {
            return "Single factor manipulated: " + changedFactors.get(0).getLabel()
                    + ". Treatment deltas are attributable to this factor.";
        }
        List<String> labels = changedFactors.stream().map(FactorChange::getLabel).toList();
        return changedFactors.size() + " factors changed (" + String.join(", ", labels)
                + "). This comparison is uncontrolled: effects cannot be attributed to one factor.";
    }
}
