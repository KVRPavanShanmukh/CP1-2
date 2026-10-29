package com.sim.experiment;

import java.util.List;

/**
 * Result of one treatment compared against the shared baseline.
 *
 * <p>{@link #isControlled()} is true only when exactly one conceptual factor differs,
 * so a multi-factor comparison never implies isolated causation.</p>
 */
public class TreatmentComparison {
    private final String treatmentName;
    private final List<FactorChange> changedFactors;
    private final boolean controlled;
    private final String statusNote;
    private final ExperimentAggregate treatment;
    private final List<MetricComparison> comparisons;

    public TreatmentComparison(String treatmentName, List<FactorChange> changedFactors, boolean controlled,
            String statusNote, ExperimentAggregate treatment, List<MetricComparison> comparisons) {
        this.treatmentName = treatmentName;
        this.changedFactors = List.copyOf(changedFactors);
        this.controlled = controlled;
        this.statusNote = statusNote;
        this.treatment = treatment;
        this.comparisons = List.copyOf(comparisons);
    }

    public String getTreatmentName() { return treatmentName; }
    public List<FactorChange> getChangedFactors() { return changedFactors; }
    public boolean isControlled() { return controlled; }
    public String getStatusNote() { return statusNote; }
    public ExperimentAggregate getTreatment() { return treatment; }
    public List<MetricComparison> getComparisons() { return comparisons; }
}
