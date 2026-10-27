package com.sim.experiment;

import java.util.ArrayList;
import java.util.List;

public class ExperimentAggregate {
    private final List<ExperimentRunResult> runs = new ArrayList<>();
    private int successfulRuns;
    private int failedRuns;
    private double meanBlocksProduced;
    private double standardDeviationBlocksProduced;
    private int minimumBlocksProduced;
    private int maximumBlocksProduced;
    /** Mean transaction success rate (included unique txs / created txs) across successful runs. */
    private double meanTransactionSuccessRate;

    public void addRun(ExperimentRunResult run) {
        runs.add(run);
        if ("COMPLETED".equals(run.getStatus()) && run.getMetrics() != null) {
            successfulRuns++;
        } else {
            failedRuns++;
        }
        recalculate();
    }

    private void recalculate() {
        List<ExperimentRunResult> successful = runs.stream()
                .filter(run -> "COMPLETED".equals(run.getStatus()) && run.getMetrics() != null)
                .toList();
        if (successful.isEmpty()) {
            meanBlocksProduced = 0.0;
            standardDeviationBlocksProduced = 0.0;
            minimumBlocksProduced = 0;
            maximumBlocksProduced = 0;
            meanTransactionSuccessRate = 0.0;
            return;
        }
        List<Integer> values = successful.stream()
                .map(run -> run.getMetrics().getBlocksProduced())
                .toList();
        meanBlocksProduced = values.stream().mapToInt(Integer::intValue).average().orElse(0.0);
        minimumBlocksProduced = values.stream().mapToInt(Integer::intValue).min().orElse(0);
        maximumBlocksProduced = values.stream().mapToInt(Integer::intValue).max().orElse(0);
        double variance = values.stream()
                .mapToDouble(value -> Math.pow(value - meanBlocksProduced, 2))
                .average().orElse(0.0);
        standardDeviationBlocksProduced = Math.sqrt(variance);
        meanTransactionSuccessRate = successful.stream()
                .mapToDouble(run -> run.getMetrics().getTransactionSuccessRate())
                .average().orElse(0.0);
    }

    public List<ExperimentRunResult> getRuns() { return List.copyOf(runs); }
    public int getSampleCount() { return successfulRuns; }
    public int getSuccessfulRuns() { return successfulRuns; }
    public int getFailedRuns() { return failedRuns; }
    public double getMeanBlocksProduced() { return meanBlocksProduced; }
    public double getStandardDeviationBlocksProduced() { return standardDeviationBlocksProduced; }
    public int getMinimumBlocksProduced() { return minimumBlocksProduced; }
    public int getMaximumBlocksProduced() { return maximumBlocksProduced; }
    /** Mean transaction success rate across all successful runs (0.0 if no transactions were generated). */
    public double getMeanTransactionSuccessRate() { return meanTransactionSuccessRate; }
}

