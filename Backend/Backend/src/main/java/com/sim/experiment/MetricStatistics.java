package com.sim.experiment;

import java.util.List;

/**
 * Summary statistics for one metric across the successful runs of an experiment.
 *
 * <p>When no successful run produced a measurement the numeric fields stay
 * {@code null} and {@link #getUnavailableReason()} explains why. Measurements are
 * never substituted with zero.</p>
 */
public class MetricStatistics {
    /** Value came straight from the simulation state or a snapshot counter. */
    public static final String DIRECT = "DIRECT";
    /** Value is derived from simulation time (ticks), not wall-clock time. */
    public static final String MODELED_TICK_PROXY = "MODELED_TICK_PROXY";
    /** Value is a sum of per-agent observations, so a block may be counted once per agent. */
    public static final String AGENT_LOCAL_OBSERVATION = "AGENT_LOCAL_OBSERVATION";

    private final String metric;
    private final String unit;
    private final String measurement;
    private final String definition;
    private final boolean available;
    private final String unavailableReason;
    private final int sampleCount;
    private final Double mean;
    private final Double populationStandardDeviation;
    private final Double minimum;
    private final Double maximum;

    private MetricStatistics(String metric, String unit, String measurement, String definition,
            boolean available, String unavailableReason, int sampleCount, Double mean,
            Double populationStandardDeviation, Double minimum, Double maximum) {
        this.metric = metric;
        this.unit = unit;
        this.measurement = measurement;
        this.definition = definition;
        this.available = available;
        this.unavailableReason = unavailableReason;
        this.sampleCount = sampleCount;
        this.mean = mean;
        this.populationStandardDeviation = populationStandardDeviation;
        this.minimum = minimum;
        this.maximum = maximum;
    }

    /**
     * Builds statistics from one value per successful run.
     *
     * @throws IllegalArgumentException when {@code values} is null or empty, because an
     *         empty sample set must be represented with {@link #unavailable}.
     */
    public static MetricStatistics of(String metric, String unit, String measurement, String definition,
            List<Double> values) {
        if (values == null || values.isEmpty()) {
            throw new IllegalArgumentException("Metric statistics require at least one successful observation");
        }
        int sampleCount = values.size();
        double sum = 0.0;
        for (double value : values) {
            sum += value;
        }
        double mean = sum / sampleCount;
        double squaredDeviations = 0.0;
        double minimum = values.get(0);
        double maximum = values.get(0);
        for (double value : values) {
            squaredDeviations += (value - mean) * (value - mean);
            minimum = Math.min(minimum, value);
            maximum = Math.max(maximum, value);
        }
        double standardDeviation = Math.sqrt(squaredDeviations / sampleCount);
        return new MetricStatistics(metric, unit, measurement, definition, true, null, sampleCount,
                mean, standardDeviation, minimum, maximum);
    }

    /** Represents a metric for which no successful run produced an observation. */
    public static MetricStatistics unavailable(String metric, String unit, String measurement, String definition,
            int attemptedRuns) {
        String reason = "No successful run produced this measurement (0 of " + attemptedRuns + " attempted runs).";
        return new MetricStatistics(metric, unit, measurement, definition, false, reason, 0,
                null, null, null, null);
    }

    public String getMetric() { return metric; }
    public String getUnit() { return unit; }
    public String getMeasurement() { return measurement; }
    public String getDefinition() { return definition; }
    public boolean isAvailable() { return available; }
    public String getUnavailableReason() { return unavailableReason; }
    public int getSampleCount() { return sampleCount; }
    public Double getMean() { return mean; }
    public Double getPopulationStandardDeviation() { return populationStandardDeviation; }
    public Double getMinimum() { return minimum; }
    public Double getMaximum() { return maximum; }
}
