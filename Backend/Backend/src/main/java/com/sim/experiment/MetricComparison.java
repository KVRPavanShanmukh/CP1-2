package com.sim.experiment;

/**
 * Baseline-versus-treatment comparison for one metric.
 *
 * <p>When either side has no successful observation the means stay {@code null},
 * {@link #isAvailable()} is false and {@link #getUnavailableReason()} explains why.
 * A relative delta is only reported when both means exist and the baseline is not
 * zero; it is never replaced with zero.</p>
 */
public class MetricComparison {
    private final String metric;
    private final String unit;
    private final String measurement;
    private final String definition;
    private final boolean available;
    private final String unavailableReason;
    private final int baselineSampleCount;
    private final int treatmentSampleCount;
    private final Double baselineMean;
    private final Double treatmentMean;
    private final Double absoluteDelta;
    private final Double relativeDelta;

    public MetricComparison(String metric, String unit, String measurement, String definition,
            boolean available, String unavailableReason, int baselineSampleCount, int treatmentSampleCount,
            Double baselineMean, Double treatmentMean, Double absoluteDelta, Double relativeDelta) {
        this.metric = metric;
        this.unit = unit;
        this.measurement = measurement;
        this.definition = definition;
        this.available = available;
        this.unavailableReason = unavailableReason;
        this.baselineSampleCount = baselineSampleCount;
        this.treatmentSampleCount = treatmentSampleCount;
        this.baselineMean = baselineMean;
        this.treatmentMean = treatmentMean;
        this.absoluteDelta = absoluteDelta;
        this.relativeDelta = relativeDelta;
    }

    public String getMetric() { return metric; }
    public String getUnit() { return unit; }
    public String getMeasurement() { return measurement; }
    public String getDefinition() { return definition; }
    public boolean isAvailable() { return available; }
    /** Reason the comparison, or only its relative delta, is unavailable. */
    public String getUnavailableReason() { return unavailableReason; }
    public int getBaselineSampleCount() { return baselineSampleCount; }
    public int getTreatmentSampleCount() { return treatmentSampleCount; }
    public Double getBaselineMean() { return baselineMean; }
    public Double getTreatmentMean() { return treatmentMean; }
    public Double getAbsoluteDelta() { return absoluteDelta; }
    /** Signed delta divided by the absolute baseline mean; null when undefined. */
    public Double getRelativeDelta() { return relativeDelta; }
}
