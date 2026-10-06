package com.sim.metrics;

public class GiniCalculator {
    public static double calculate(double[] values) {
        if (values == null || values.length == 0) return 0.0;
        double sumDifference = 0;
        double sum = 0;
        int n = values.length;
        for (int i = 0; i < n; i++) {
            sum += values[i];
            for (int j = 0; j < n; j++) {
                sumDifference += Math.abs(values[i] - values[j]);
            }
        }
        if (sum == 0) return 0.0;
        return sumDifference / (2 * n * sum);
    }
}