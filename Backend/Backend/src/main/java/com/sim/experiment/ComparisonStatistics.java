package com.sim.experiment;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Builds per-metric baseline-versus-treatment comparisons from two aggregates.
 *
 * <p>Only successful observations reach an aggregate's statistics, so this class never
 * turns a failed run into a zero measurement. Unsupported measurements are listed
 * explicitly instead of being estimated.</p>
 */
public final class ComparisonStatistics {
    private static final String BASELINE_ZERO_REASON =
            "Baseline mean is zero, so a relative delta is undefined; no zero substitute was used.";

    private ComparisonStatistics() {
    }

    /** @return one comparison per metric reported by either aggregate, in baseline order */
    public static List<MetricComparison> compare(ExperimentAggregate baseline, ExperimentAggregate treatment) {
        if (baseline == null || treatment == null) {
            throw new IllegalArgumentException("Both baseline and treatment aggregates are required");
        }
        Map<String, MetricStatistics> baselineStats = baseline.getStatistics();
        Map<String, MetricStatistics> treatmentStats = treatment.getStatistics();
        Set<String> metrics = new LinkedHashSet<>(baselineStats.keySet());
        metrics.addAll(treatmentStats.keySet());

        List<MetricComparison> comparisons = new ArrayList<>(metrics.size());
        for (String metric : metrics) {
            MetricStatistics baselineStat = baselineStats.get(metric);
            MetricStatistics treatmentStat = treatmentStats.get(metric);
            MetricStatistics descriptor = baselineStat != null ? baselineStat : treatmentStat;
            int baselineSamples = baselineStat == null ? 0 : baselineStat.getSampleCount();
            int treatmentSamples = treatmentStat == null ? 0 : treatmentStat.getSampleCount();
            boolean baselineAvailable = baselineStat != null && baselineStat.isAvailable();
            boolean treatmentAvailable = treatmentStat != null && treatmentStat.isAvailable();

            if (!baselineAvailable || !treatmentAvailable) {
                comparisons.add(new MetricComparison(metric, descriptor.getUnit(), descriptor.getMeasurement(),
                        descriptor.getDefinition(), false,
                        describeUnavailable(baselineStat, treatmentStat),
                        baselineSamples, treatmentSamples, null, null, null, null));
                continue;
            }

            double baselineMean = baselineStat.getMean();
            double treatmentMean = treatmentStat.getMean();
            double absoluteDelta = treatmentMean - baselineMean;
            Double relativeDelta = null;
            String reason = null;
            if (baselineMean == 0.0) {
                reason = BASELINE_ZERO_REASON;
            } else {
                relativeDelta = absoluteDelta / Math.abs(baselineMean);
            }
            comparisons.add(new MetricComparison(metric, descriptor.getUnit(), descriptor.getMeasurement(),
                    descriptor.getDefinition(), true, reason,
                    baselineSamples, treatmentSamples, baselineMean, treatmentMean, absoluteDelta, relativeDelta));
        }
        return comparisons;
    }

    /**
     * Measurements the simulation cannot provide directly. They are reported as
     * unsupported so no reorganization or fork-depth value is invented.
     */
    public static Map<String, String> unsupportedMeasurements() {
        Map<String, String> unsupported = new LinkedHashMap<>();
        unsupported.put("reorganizations",
                "The simulation state has no reorganization event counter, so no reorganization count is reported.");
        unsupported.put("forkDepth",
                "Active forks and orphan counts exist, but no fork-depth measure is recorded, so no depth is reported.");
        return Collections.unmodifiableMap(unsupported);
    }

    private static String describeUnavailable(MetricStatistics baselineStat, MetricStatistics treatmentStat) {
        List<String> reasons = new ArrayList<>(2);
        if (baselineStat == null) {
            reasons.add("Baseline: metric not reported.");
        } else if (!baselineStat.isAvailable()) {
            reasons.add("Baseline: " + baselineStat.getUnavailableReason());
        }
        if (treatmentStat == null) {
            reasons.add("Treatment: metric not reported.");
        } else if (!treatmentStat.isAvailable()) {
            reasons.add("Treatment: " + treatmentStat.getUnavailableReason());
        }
        return String.join(" ", reasons);
    }
}
