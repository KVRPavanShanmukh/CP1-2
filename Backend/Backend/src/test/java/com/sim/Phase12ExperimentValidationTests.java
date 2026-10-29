package com.sim;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertIterableEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

import com.sim.experiment.ComparisonStatistics;
import com.sim.experiment.ExperimentAggregate;
import com.sim.experiment.ExperimentComparisonRequest;
import com.sim.experiment.ExperimentComparisonResult;
import com.sim.experiment.ExperimentComparisonRunner;
import com.sim.experiment.ExperimentRunResult;
import com.sim.experiment.FactorDetector;
import com.sim.experiment.MetricComparison;
import com.sim.experiment.MetricStatistics;
import com.sim.experiment.TreatmentComparison;
import com.sim.engine.SimulationEngine;
import com.sim.metrics.MetricsSnapshot;
import com.sim.model.SimulationConfig;

/**
 * Focused validation for Task 3C: experiment reproducibility, controlled comparisons,
 * aggregation / failed-run handling, and metric accuracy.
 * <p>
 * Extends Phase 11 without modifying any existing Phase 1-10 tests.
 */
class Phase12ExperimentValidationTests {

    private final ExperimentComparisonRunner runner = new ExperimentComparisonRunner();

    // ============ Reproducibility ============

    @Test
    void identicalConfigurationAndSeedProduceIdenticalFullMetrics() {
        SimulationConfig baseline = config("PoW", 4, 4);
        SimulationConfig treatment = config("PoW", 4, 4);

        ExperimentComparisonResult result = runner.run(request(baseline, "copy", treatment, 11L, 22L));

        assertEquals(2, result.getBaseline().getAttemptedRuns());
        assertEquals(2, result.getTreatments().get(0).getTreatment().getAttemptedRuns());
        assertEquals(2, result.getBaseline().getSuccessfulRuns());
        assertEquals(2, result.getTreatments().get(0).getTreatment().getSuccessfulRuns());

        for (int index = 0; index < 2; index++) {
            MetricsSnapshot left = result.getBaseline().getRuns().get(index).getMetrics();
            MetricsSnapshot right = result.getTreatments().get(0).getTreatment().getRuns().get(index).getMetrics();
            assertEquals(left.getBlocksProduced(), right.getBlocksProduced(), "blocksProduced at index " + index);
            assertEquals(left.getGiniCoefficient(), right.getGiniCoefficient(), 1e-12, "giniCoefficient at index " + index);
            assertEquals(left.getCanonicalHeadAgreement(), right.getCanonicalHeadAgreement(), 1e-12,
                    "canonicalHeadAgreement at index " + index);
            assertEquals(left.getTransactionsCreated(), right.getTransactionsCreated(), "transactionsCreated at index " + index);
            assertEquals(left.getTransactionsIncluded(), right.getTransactionsIncluded(), "transactionsIncluded at index " + index);
            assertEquals(left.getTransactionSuccessRate(), right.getTransactionSuccessRate(), 1e-12,
                    "transactionSuccessRate at index " + index);
            assertEquals(left.getMessagesSent(), right.getMessagesSent(), "messagesSent at index " + index);
            assertEquals(left.getMessagesDelivered(), right.getMessagesDelivered(), "messagesDelivered at index " + index);
            assertEquals(left.getMessagesDropped(), right.getMessagesDropped(), "messagesDropped at index " + index);
            assertEquals(left.getBlockProductionRate(), right.getBlockProductionRate(), 1e-12,
                    "blockProductionRate at index " + index);
            assertEquals(left.getMessageThroughput(), right.getMessageThroughput(), 1e-12,
                    "messageThroughput at index " + index);
        }

        TreatmentComparison comparison = result.getTreatments().get(0);
        assertTrue(comparison.getChangedFactors().isEmpty());
        assertFalse(comparison.isControlled());
        for (MetricComparison metric : comparison.getComparisons()) {
            assertTrue(metric.isAvailable(), metric.getMetric() + " should be available");
            assertEquals(0.0, metric.getAbsoluteDelta(), 1e-9, metric.getMetric());
        }
    }

    @Test
    void differentSeedsCompleteSuccessfullyWithoutThrowing() {
        SimulationConfig baseline = config("PoW", 3, 3);
        SimulationConfig treatment = config("PoS", 3, 3);

        ExperimentComparisonResult result = runner.run(request(baseline, "pos", treatment, 100L, 200L, 300L));

        assertEquals(3, result.getBaseline().getAttemptedRuns());
        assertEquals(3, result.getTreatments().get(0).getTreatment().getAttemptedRuns());
        assertEquals(3, result.getBaseline().getSuccessfulRuns());
        assertEquals(3, result.getTreatments().get(0).getTreatment().getSuccessfulRuns());
        assertEquals(0, result.getBaseline().getFailedRuns());
        assertEquals(0, result.getTreatments().get(0).getTreatment().getFailedRuns());
    }

    // ============ Controlled comparisons ============

    @Test
    void transactionLoadSingleFactorIsControlled() {
        SimulationConfig baseline = config("PoW", 3, 2);
        SimulationConfig treatment = config("PoW", 3, 2);
        treatment.setTransactionsPerAgentPerTick(3);

        TreatmentComparison comparison =
                runner.run(request(baseline, "tx-load", treatment, 7L)).getTreatments().get(0);

        assertEquals(1, comparison.getChangedFactors().size());
        assertEquals(FactorDetector.FACTOR_TRANSACTION_LOAD, comparison.getChangedFactors().get(0).getFactor());
        assertTrue(comparison.isControlled());
        assertTrue(comparison.getStatusNote().contains("Single factor manipulated"));
    }

    @Test
    void transactionLoadFieldsGroupedAsOneConceptualFactor() {
        SimulationConfig baseline = config("PoW", 3, 2);
        SimulationConfig treatment = config("PoW", 3, 2);
        treatment.setTransactionsPerAgentPerTick(3);
        treatment.setMempoolCapacity(200);
        treatment.setMaxTransactionsPerBlock(50);
        treatment.setTransactionAmount(2.5);

        TreatmentComparison comparison =
                runner.run(request(baseline, "tx-load-grouped", treatment, 7L)).getTreatments().get(0);

        assertEquals(1, comparison.getChangedFactors().size());
        assertEquals(FactorDetector.FACTOR_TRANSACTION_LOAD, comparison.getChangedFactors().get(0).getFactor());
        assertTrue(comparison.isControlled());
    }

    @Test
    void networkFactorsRecognizedAsControlled() {
        assertControlled(FactorDetector.FACTOR_BLOCK_GOSSIP_LATENCY,
                treatment -> treatment.setBlockGossipLatency(3.0));
        assertControlled(FactorDetector.FACTOR_LATENCY_JITTER,
                treatment -> treatment.setNetworkLatencyJitter(8));
        assertControlled(FactorDetector.FACTOR_PACKET_LOSS,
                treatment -> treatment.setPacketLossRate(0.3));
    }

    @Test
    void controlledComparisonsPreserveSharedOrderedSeeds() {
        List<Long> seeds = List.of(1L, 2L, 3L);
        SimulationConfig baseline = config("PoW", 3, 2);
        SimulationConfig treatment = config("PoW", 3, 2);
        treatment.setPacketLossRate(0.2);

        ExperimentComparisonResult result = runner.run(request(baseline, "packet-loss", treatment, 1L, 2L, 3L));

        assertIterableEquals(seeds, result.getSeeds());
        assertIterableEquals(seeds, seedsOf(result.getBaseline()));
        assertIterableEquals(seeds, seedsOf(result.getTreatments().get(0).getTreatment()));
    }

    // ============ Aggregation and failed runs ============

    @Test
    void mixedSuccessAndFailureComparisonKeepsFailedRunsVisible() {
        ExperimentAggregate baseline = new ExperimentAggregate();
        baseline.addRun(completedRun(4, 10, 1.0));
        baseline.addRun(completedRun(6, 20, 0.5));

        ExperimentAggregate treatment = new ExperimentAggregate();
        treatment.addRun(failedRun("treatment exploded", 1L));
        treatment.addRun(failedRun("treatment exploded", 2L));

        List<MetricComparison> comparisons = ComparisonStatistics.compare(baseline, treatment);

        assertFalse(comparisons.isEmpty());
        for (MetricComparison comparison : comparisons) {
            assertTrue(comparison.getBaselineSampleCount() > 0, comparison.getMetric());
            assertEquals(0, comparison.getTreatmentSampleCount(), comparison.getMetric());
            assertFalse(comparison.isAvailable(), comparison.getMetric());
            assertNull(comparison.getTreatmentMean());
            assertNull(comparison.getAbsoluteDelta());
            assertNull(comparison.getRelativeDelta());
            assertTrue(comparison.getUnavailableReason().contains("Treatment:"), comparison.getMetric());
        }
    }

    @Test
    void allFailedComparisonReportsAllMetricsUnavailable() {
        ExperimentAggregate baseline = new ExperimentAggregate();
        baseline.addRun(failedRun("baseline exploded", 1L));
        ExperimentAggregate treatment = new ExperimentAggregate();
        treatment.addRun(failedRun("treatment exploded", 2L));

        List<MetricComparison> comparisons = ComparisonStatistics.compare(baseline, treatment);

        assertFalse(comparisons.isEmpty());
        for (MetricComparison comparison : comparisons) {
            assertFalse(comparison.isAvailable(), comparison.getMetric());
            assertNull(comparison.getBaselineMean());
            assertNull(comparison.getTreatmentMean());
            assertNull(comparison.getAbsoluteDelta());
            assertNull(comparison.getRelativeDelta());
            assertEquals(0, comparison.getBaselineSampleCount());
            assertEquals(0, comparison.getTreatmentSampleCount());
        }
    }

    @Test
    void failedRunsNeverContributeZeroValuesToStatistics() {
        ExperimentAggregate aggregate = new ExperimentAggregate();
        aggregate.addRun(completedRun(10, 50, 1.0));
        aggregate.addRun(failedRun("boom", 5L));

        assertEquals(2, aggregate.getAttemptedRuns());
        assertEquals(1, aggregate.getSuccessfulRuns());
        assertEquals(1, aggregate.getFailedRuns());

        MetricStatistics blocks = aggregate.getStatistics().get("blocksProduced");
        assertEquals(1, blocks.getSampleCount());
        assertEquals(10.0, blocks.getMean(), 1e-9);
        assertEquals(10.0, blocks.getMinimum(), 1e-9);
        assertEquals(10.0, blocks.getMaximum(), 1e-9);
        assertEquals(0.0, blocks.getPopulationStandardDeviation(), 1e-9);
    }

    @Test
    void invalidConfigurationRejectedBeforeAnyRunsStart() {
        SimulationConfig valid = config("PoW", 2, 1);
        SimulationConfig invalid = config("PoW", 2, 1);
        invalid.setSimulationTicks(0);

        ExperimentComparisonRequest bad = new ExperimentComparisonRequest();
        bad.setBaseline(named("baseline", valid));
        bad.setTreatments(List.of(named("invalid", invalid)));
        bad.setSeeds(List.of(1L));

        assertThrows(IllegalArgumentException.class, () -> runner.run(bad));
    }

    // ============ Metric accuracy ============

    @Test
    void giniCoefficientIsAlwaysInUnitRange() {
        SimulationConfig cfg = config("PoW", 6, 6);
        SimulationEngine engine = new SimulationEngine(cfg);
        for (int i = 0; i < 6; i++) {
            engine.tick();
        }
        MetricsSnapshot snapshot = engine.getMetricsSnapshot();
        double gini = snapshot.getGiniCoefficient();
        assertTrue(gini >= 0.0 && gini <= 1.0, "giniCoefficient must be in [0, 1], got " + gini);
    }

    @Test
    void mainchainRateIsAlwaysInUnitRange() {
        SimulationConfig cfg = config("PoW", 6, 6);
        SimulationEngine engine = new SimulationEngine(cfg);
        for (int i = 0; i < 6; i++) {
            engine.tick();
        }
        double mainchainRate = engine.getState().getBlockchainState().getMainchainRate();
        assertTrue(mainchainRate >= 0.0 && mainchainRate <= 1.0,
                "mainchainRate must be in [0, 1], got " + mainchainRate);
    }

    @Test
    void transactionSuccessRateMatchesIncludedDividedByCreated() {
        SimulationConfig cfg = config("PoW", 3, 4);
        cfg.setTransactionsPerAgentPerTick(2);
        SimulationEngine engine = new SimulationEngine(cfg);
        for (int i = 0; i < 4; i++) {
            engine.tick();
        }
        MetricsSnapshot snapshot = engine.getMetricsSnapshot();
        int created = snapshot.getTransactionsCreated();
        int included = snapshot.getTransactionsIncluded();
        double expected = created == 0 ? 0.0 : (double) included / created;
        assertEquals(expected, snapshot.getTransactionSuccessRate(), 1e-12,
                "transactionSuccessRate must equal included / created");
    }

    @Test
    void unsupportedMetricsAreMarkedUnavailableNotInvented() {
        java.util.Map<String, String> unsupported = ComparisonStatistics.unsupportedMeasurements();
        assertEquals(2, unsupported.size());
        assertTrue(unsupported.containsKey("reorganizations"));
        assertTrue(unsupported.containsKey("forkDepth"));
        unsupported.values().forEach(reason -> assertFalse(reason.isBlank()));
    }

    @Test
    void comparisonDeltasMatchBaselineAndTreatmentStatistics() {
        ExperimentAggregate baseline = new ExperimentAggregate();
        baseline.addRun(completedRun(2, 10, 1.0));
        baseline.addRun(completedRun(2, 12, 1.0));
        ExperimentAggregate treatment = new ExperimentAggregate();
        treatment.addRun(completedRun(5, 20, 1.0));
        treatment.addRun(completedRun(5, 22, 1.0));

        List<MetricComparison> comparisons = ComparisonStatistics.compare(baseline, treatment);

        MetricComparison blocks = metricByName(comparisons, "blocksProduced");
        assertTrue(blocks.isAvailable());
        assertEquals(2.0, blocks.getBaselineMean(), 1e-9);
        assertEquals(5.0, blocks.getTreatmentMean(), 1e-9);
        assertEquals(3.0, blocks.getAbsoluteDelta(), 1e-9);
        assertEquals(1.5, blocks.getRelativeDelta(), 1e-9);

        MetricComparison delivered = metricByName(comparisons, "messagesDelivered");
        assertTrue(delivered.isAvailable());
        assertEquals(11.0, delivered.getBaselineMean(), 1e-9);
        assertEquals(21.0, delivered.getTreatmentMean(), 1e-9);
        assertEquals(10.0, delivered.getAbsoluteDelta(), 1e-9);
    }

    // ============ Helpers ============

    private void assertControlled(String expectedFactor, java.util.function.Consumer<SimulationConfig> treatmentMutation) {
        assertControlled(expectedFactor, baseline -> { }, treatmentMutation);
    }

    private void assertControlled(String expectedFactor, java.util.function.Consumer<SimulationConfig> baselineMutation,
            java.util.function.Consumer<SimulationConfig> treatmentMutation) {
        SimulationConfig baseline = config("PoW", 3, 2);
        baselineMutation.accept(baseline);
        SimulationConfig treatment = config("PoW", 3, 2);
        treatmentMutation.accept(treatment);

        TreatmentComparison comparison =
                runner.run(request(baseline, "treatment", treatment, 3L)).getTreatments().get(0);

        assertEquals(1, comparison.getChangedFactors().size(), "expected a single conceptual factor");
        assertEquals(expectedFactor, comparison.getChangedFactors().get(0).getFactor());
        assertTrue(comparison.isControlled());
        assertTrue(comparison.getStatusNote().contains("Single factor manipulated"));
    }

    private List<Long> seedsOf(ExperimentAggregate aggregate) {
        List<Long> seeds = new java.util.ArrayList<>();
        aggregate.getRuns().forEach(run -> seeds.add(run.getRandomSeed()));
        return seeds;
    }

    private MetricComparison metricByName(List<MetricComparison> comparisons, String metric) {
        return comparisons.stream()
                .filter(entry -> metric.equals(entry.getMetric()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("metric not reported: " + metric));
    }

    private ExperimentRunResult completedRun(int blocksProduced, int messagesDelivered, double successRate) {
        MetricsSnapshot snapshot = new MetricsSnapshot();
        snapshot.setBlocksProduced(blocksProduced);
        snapshot.setMessagesDelivered(messagesDelivered);
        snapshot.setTransactionsCreated(4);
        snapshot.setTransactionsIncluded(2);
        snapshot.setTransactionSuccessRate(successRate);
        snapshot.setCanonicalHeadAgreement(1.0);
        snapshot.setConverged(true);
        ExperimentRunResult run = new ExperimentRunResult();
        run.setStatus("COMPLETED");
        run.setMetrics(snapshot);
        return run;
    }

    private ExperimentRunResult failedRun(String message, long seed) {
        ExperimentRunResult run = new ExperimentRunResult();
        run.setStatus("FAILED");
        run.setErrorMessage(message);
        run.setRandomSeed(seed);
        return run;
    }

    private ExperimentComparisonRequest request(SimulationConfig baseline, String treatmentName,
            SimulationConfig treatment, Long... seeds) {
        ExperimentComparisonRequest request = new ExperimentComparisonRequest();
        request.setBaseline(named("baseline", baseline));
        java.util.List<ExperimentComparisonRequest.NamedExperimentConfig> treatments = new java.util.ArrayList<>();
        treatments.add(named(treatmentName, treatment));
        request.setTreatments(treatments);
        request.setSeeds(java.util.Arrays.asList(seeds));
        return request;
    }

    private ExperimentComparisonRequest.NamedExperimentConfig named(String name, SimulationConfig config) {
        return new ExperimentComparisonRequest.NamedExperimentConfig(name, config);
    }

    private SimulationConfig config(String consensus, int nodes, int ticks) {
        SimulationConfig config = new SimulationConfig();
        config.setConsensusType(consensus);
        config.setNodeCount(nodes);
        config.setNetworkTopology("Erdos-Renyi");
        config.setBlockGossipLatency(1.0);
        config.setSlotDuration(1.0);
        config.setSimulationTicks(ticks);
        config.setRandomSeed(7L);
        return config;
    }
}