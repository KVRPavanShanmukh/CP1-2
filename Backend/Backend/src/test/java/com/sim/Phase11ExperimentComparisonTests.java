package com.sim;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Consumer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertIterableEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNotSame;
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
import com.sim.metrics.MetricsSnapshot;
import com.sim.model.SimulationConfig;

/**
 * Focused coverage for the baseline-versus-treatment comparison workflow.
 * The Phase 1-10 suites remain untouched.
 */
class Phase11ExperimentComparisonTests {

    private final ExperimentComparisonRunner runner = new ExperimentComparisonRunner();

    @Test
    void identicalConfigurationsAndSeedsProduceIdenticalRunMetrics() {
        SimulationConfig baseline = config("PoW", 3, 3);
        SimulationConfig treatment = config("PoW", 3, 3);

        ExperimentComparisonResult result = runner.run(request(baseline, "copy", treatment, 3L, 9L));

        assertEquals(2, result.getBaseline().getAttemptedRuns());
        assertEquals(2, result.getTreatments().get(0).getTreatment().getAttemptedRuns());
        for (int index = 0; index < 2; index++) {
            MetricsSnapshot left = result.getBaseline().getRuns().get(index).getMetrics();
            MetricsSnapshot right = result.getTreatments().get(0).getTreatment().getRuns().get(index).getMetrics();
            assertEquals(left.getBlocksProduced(), right.getBlocksProduced());
            assertEquals(left.getMessagesDelivered(), right.getMessagesDelivered());
            assertEquals(left.getMessagesDropped(), right.getMessagesDropped());
            assertEquals(left.getTransactionsCreated(), right.getTransactionsCreated());
            assertEquals(left.getCanonicalHeadAgreement(), right.getCanonicalHeadAgreement(), 1e-12);
            assertEquals(left.getAveragePropagationDelayTicks(), right.getAveragePropagationDelayTicks(), 1e-12);
        }

        TreatmentComparison comparison = result.getTreatments().get(0);
        assertTrue(comparison.getChangedFactors().isEmpty());
        assertFalse(comparison.isControlled());
        assertNotNull(comparison.getStatusNote());
        for (MetricComparison metric : comparison.getComparisons()) {
            assertTrue(metric.isAvailable(), metric.getMetric() + " should be available");
            assertEquals(0.0, metric.getAbsoluteDelta(), 1e-9, metric.getMetric());
            assertEquals(0.0, metric.getBaselineMean() - metric.getTreatmentMean(), 1e-12, metric.getMetric());
        }
    }

    @Test
    void baselineAndTreatmentsShareOrderedSeedsAndKeepCopiedConfigurations() {
        SimulationConfig baseline = config("PoW", 3, 2);
        SimulationConfig treatment = config("PoW", 3, 2);
        treatment.setNetworkLatencyJitter(6);
        List<Long> seeds = List.of(4L, 8L);

        ExperimentComparisonResult result = runner.run(request(baseline, "jitter", treatment, 4L, 8L));

        assertIterableEquals(seeds, result.getSeeds());
        assertEquals(seeds, seedsOf(result.getBaseline()));
        assertEquals(seeds, seedsOf(result.getTreatments().get(0).getTreatment()));

        for (ExperimentRunResult run : result.getBaseline().getRuns()) {
            assertNotSame(baseline, run.getConfiguration());
            assertEquals(2, run.getConfiguration().getNetworkLatencyJitter());
            assertEquals(run.getRandomSeed(), run.getConfiguration().getRandomSeed());
            assertEquals("PoW", run.getConfiguration().getConsensusType());
        }
        for (ExperimentRunResult run : result.getTreatments().get(0).getTreatment().getRuns()) {
            assertNotSame(treatment, run.getConfiguration());
            assertEquals(6, run.getConfiguration().getNetworkLatencyJitter());
            assertEquals(run.getRandomSeed(), run.getConfiguration().getRandomSeed());
        }

        // Templates keep their original seed and factor values.
        assertEquals(7L, baseline.getRandomSeed());
        assertEquals(2, baseline.getNetworkLatencyJitter());
        assertEquals(6, treatment.getNetworkLatencyJitter());
    }

    @Test
    void singleFactorManipulationsAreDetectedAsControlled() {
        assertControlled(FactorDetector.FACTOR_BLOCK_GOSSIP_LATENCY,
                treatment -> treatment.setBlockGossipLatency(2.5));
        assertControlled(FactorDetector.FACTOR_LATENCY_JITTER,
                treatment -> treatment.setNetworkLatencyJitter(6));
        assertControlled(FactorDetector.FACTOR_PACKET_LOSS,
                treatment -> treatment.setPacketLossRate(0.25));
        assertControlled(FactorDetector.FACTOR_PARTITION, treatment -> {
            treatment.setPartitionRatio(0.5);
            treatment.setPartitionStartTick(1);
            treatment.setPartitionEndTick(2);
        });
        assertControlled(FactorDetector.FACTOR_BYZANTINE, treatment -> treatment.setByzantineRatio(0.34));
        assertControlled(FactorDetector.FACTOR_BYZANTINE,
                baseline -> baseline.setByzantineBehaviorEnabled(true),
                treatment -> {
                    treatment.setByzantineBehaviorEnabled(true);
                    treatment.setByzantineAttackMode("ALL");
                });
        assertControlled(FactorDetector.FACTOR_INACTIVE_RATIO,
                treatment -> treatment.setInactiveAgentRatio(0.34));
        assertControlled(FactorDetector.FACTOR_CONSENSUS_STRATEGY,
                treatment -> treatment.setConsensusType("PoS"));
    }

    @Test
    void multiFactorComparisonIsMarkedUncontrolled() {
        SimulationConfig baseline = config("PoW", 3, 2);
        SimulationConfig treatment = config("PoW", 3, 2);
        treatment.setNetworkLatencyJitter(6);
        treatment.setPacketLossRate(0.2);

        TreatmentComparison comparison =
                runner.run(request(baseline, "multi", treatment, 3L)).getTreatments().get(0);

        assertEquals(2, comparison.getChangedFactors().size());
        assertFalse(comparison.isControlled());
        assertTrue(comparison.getStatusNote().toLowerCase().contains("uncontrolled"));
        assertTrue(comparison.getStatusNote().contains("2 factors changed"));
    }

    @Test
    void aggregateStatisticsUsePopulationStandardDeviationAndSnapshotFields() {
        ExperimentAggregate aggregate = new ExperimentAggregate();
        aggregate.addRun(completedRun(2, 10, 0.5));
        aggregate.addRun(completedRun(4, 20, 1.0));
        aggregate.addRun(completedRun(6, 30, 0.25));

        assertEquals(3, aggregate.getAttemptedRuns());

        MetricStatistics blocks = aggregate.getStatistics().get("blocksProduced");
        assertEquals(3, blocks.getSampleCount());
        assertEquals(4.0, blocks.getMean(), 1e-9);
        assertEquals(Math.sqrt(8.0 / 3.0), blocks.getPopulationStandardDeviation(), 1e-9);
        assertEquals(2.0, blocks.getMinimum(), 1e-9);
        assertEquals(6.0, blocks.getMaximum(), 1e-9);

        MetricStatistics delivered = aggregate.getStatistics().get("messagesDelivered");
        assertEquals(20.0, delivered.getMean(), 1e-9);
        assertEquals(30.0, delivered.getMaximum(), 1e-9);

        MetricStatistics successRate = aggregate.getStatistics().get("transactionSuccessRate");
        assertEquals((0.5 + 1.0 + 0.25) / 3.0, successRate.getMean(), 1e-9);
        assertEquals(0.25, successRate.getMinimum(), 1e-9);

        assertEquals(1.0, aggregate.getStatistics().get("convergedRunRate").getMean(), 1e-9);
        assertEquals(4.0, aggregate.getMeanBlocksProduced(), 1e-9);
        assertEquals(3, aggregate.getSuccessfulRuns());
    }

    @Test
    void failedRunsAreRetainedExcludedFromStatisticsAndNeverZeroMeasurements() {
        ExperimentAggregate aggregate = new ExperimentAggregate();
        aggregate.addRun(completedRun(4, 10, 1.0));
        aggregate.addRun(failedRun("boom", 5L));

        assertEquals(2, aggregate.getAttemptedRuns());
        assertEquals(1, aggregate.getSuccessfulRuns());
        assertEquals(1, aggregate.getFailedRuns());
        assertEquals(2, aggregate.getRuns().size());
        assertEquals("FAILED", aggregate.getRuns().get(1).getStatus());
        assertEquals("boom", aggregate.getRuns().get(1).getErrorMessage());

        MetricStatistics blocks = aggregate.getStatistics().get("blocksProduced");
        assertEquals(1, blocks.getSampleCount());
        assertEquals(4.0, blocks.getMean(), 1e-9);
        assertEquals(4.0, blocks.getMinimum(), 1e-9);

        ExperimentAggregate onlyFailures = new ExperimentAggregate();
        onlyFailures.addRun(failedRun("boom", 5L));
        MetricStatistics unavailable = onlyFailures.getStatistics().get("blocksProduced");
        assertFalse(unavailable.isAvailable());
        assertNull(unavailable.getMean());
        assertNull(unavailable.getMinimum());
        assertNull(unavailable.getMaximum());
        assertTrue(unavailable.getUnavailableReason().contains("0 of 1"));
    }

    @Test
    void zeroBaselineProducesNullRelativeDeltaWithReason() {
        SimulationConfig baseline = config("PoW", 3, 3);
        baseline.setTransactionsPerAgentPerTick(0);
        SimulationConfig treatment = config("PoW", 3, 3);
        treatment.setTransactionsPerAgentPerTick(1);

        TreatmentComparison comparison =
                runner.run(request(baseline, "tx-load", treatment, 5L)).getTreatments().get(0);
        MetricComparison successRate = metric(comparison, "transactionSuccessRate");

        assertTrue(successRate.isAvailable());
        assertEquals(0.0, successRate.getBaselineMean(), 1e-12);
        assertNull(successRate.getRelativeDelta());
        assertNotNull(successRate.getUnavailableReason());
        assertTrue(successRate.getUnavailableReason().toLowerCase().contains("zero"));
        assertTrue(successRate.getAbsoluteDelta() > 0.0);

        MetricComparison created = metric(comparison, "transactionsCreated");
        assertTrue(created.isAvailable());
        assertEquals(0.0, created.getBaselineMean(), 1e-12);
        assertNull(created.getRelativeDelta());
    }

    @Test
    void missingSuccessfulObservationsProduceNullComparisonsWithReasons() {
        ExperimentAggregate baseline = new ExperimentAggregate();
        baseline.addRun(failedRun("baseline exploded", 1L));
        ExperimentAggregate treatment = new ExperimentAggregate();
        treatment.addRun(completedRun(3, 5, 1.0));

        List<MetricComparison> comparisons = ComparisonStatistics.compare(baseline, treatment);

        assertFalse(comparisons.isEmpty());
        for (MetricComparison comparison : comparisons) {
            assertFalse(comparison.isAvailable(), comparison.getMetric());
            assertNull(comparison.getBaselineMean());
            assertNull(comparison.getTreatmentMean());
            assertNull(comparison.getAbsoluteDelta());
            assertNull(comparison.getRelativeDelta());
            assertTrue(comparison.getUnavailableReason().startsWith("Baseline:"), comparison.getMetric());
        }
        assertEquals(0, comparisons.get(0).getBaselineSampleCount());
        assertEquals(1, comparisons.get(0).getTreatmentSampleCount());
    }

    @Test
    void unsupportedMeasurementsAreReportedWithoutInventedValues() {
        Map<String, String> unsupported = ComparisonStatistics.unsupportedMeasurements();
        assertEquals(Set.of("reorganizations", "forkDepth"), unsupported.keySet());
        unsupported.values().forEach(reason -> assertFalse(reason.isBlank()));
    }

    @Test
    void invalidComparisonRequestsAreRejected() {
        SimulationConfig valid = config("PoW", 2, 1);

        assertThrows(IllegalArgumentException.class, () -> runner.run(null));

        ExperimentComparisonRequest missingBaseline = new ExperimentComparisonRequest();
        missingBaseline.setTreatments(List.of(named("t", valid)));
        missingBaseline.setSeeds(List.of(1L));
        assertMessageContains("Baseline", missingBaseline);

        ExperimentComparisonRequest unnamedBaseline = new ExperimentComparisonRequest();
        unnamedBaseline.setBaseline(named(" ", valid));
        unnamedBaseline.setTreatments(List.of(named("t", valid)));
        unnamedBaseline.setSeeds(List.of(1L));
        assertMessageContains("Baseline configuration name", unnamedBaseline);

        ExperimentComparisonRequest noTreatments = new ExperimentComparisonRequest();
        noTreatments.setBaseline(named("baseline", valid));
        noTreatments.setTreatments(List.of());
        noTreatments.setSeeds(List.of(1L));
        assertMessageContains("At least one treatment", noTreatments);

        ExperimentComparisonRequest noSeeds = new ExperimentComparisonRequest();
        noSeeds.setBaseline(named("baseline", valid));
        noSeeds.setTreatments(List.of(named("t", valid)));
        noSeeds.setSeeds(List.of());
        assertMessageContains("shared experiment seed", noSeeds);

        ExperimentComparisonRequest duplicateNames = new ExperimentComparisonRequest();
        duplicateNames.setBaseline(named("baseline", valid));
        duplicateNames.setTreatments(List.of(named("dup", valid), named(" DUP ", valid)));
        duplicateNames.setSeeds(List.of(1L));
        assertMessageContains("Duplicate treatment name", duplicateNames);

        ExperimentComparisonRequest nullSeed = new ExperimentComparisonRequest();
        nullSeed.setBaseline(named("baseline", valid));
        nullSeed.setTreatments(List.of(named("t", valid)));
        nullSeed.setSeeds(java.util.Arrays.asList(1L, null));
        assertMessageContains("cannot be null", nullSeed);

        ExperimentComparisonRunner limitedRunner = new ExperimentComparisonRunner(2);
        ExperimentComparisonRequest tooManySeeds = new ExperimentComparisonRequest();
        tooManySeeds.setBaseline(named("baseline", valid));
        tooManySeeds.setTreatments(List.of(named("t", valid)));
        tooManySeeds.setSeeds(List.of(1L, 2L, 3L));
        IllegalArgumentException oversized = assertThrows(IllegalArgumentException.class,
                () -> limitedRunner.run(tooManySeeds));
        assertTrue(oversized.getMessage().contains("Maximum of 2 experiment seeds"));

        SimulationConfig invalidTreatment = config("PoW", 2, 1);
        invalidTreatment.setSimulationTicks(0);
        ExperimentComparisonRequest invalidConfiguration = new ExperimentComparisonRequest();
        invalidConfiguration.setBaseline(named("baseline", valid));
        invalidConfiguration.setTreatments(List.of(named("invalid", invalidTreatment)));
        invalidConfiguration.setSeeds(List.of(1L));
        assertMessageContains("simulationTicks", invalidConfiguration);
    }

    private void assertControlled(String expectedFactor, Consumer<SimulationConfig> treatmentMutation) {
        assertControlled(expectedFactor, baseline -> { }, treatmentMutation);
    }

    private void assertControlled(String expectedFactor, Consumer<SimulationConfig> baselineMutation,
            Consumer<SimulationConfig> treatmentMutation) {
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

    private void assertMessageContains(String expected, ExperimentComparisonRequest request) {
        IllegalArgumentException error =
                assertThrows(IllegalArgumentException.class, () -> runner.run(request));
        assertTrue(error.getMessage().contains(expected),
                "expected message to contain '" + expected + "' but was: " + error.getMessage());
    }

    private List<Long> seedsOf(ExperimentAggregate aggregate) {
        List<Long> seeds = new ArrayList<>();
        aggregate.getRuns().forEach(run -> seeds.add(run.getRandomSeed()));
        return seeds;
    }

    private MetricComparison metric(TreatmentComparison comparison, String metric) {
        return comparison.getComparisons().stream()
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
        List<ExperimentComparisonRequest.NamedExperimentConfig> treatments = new ArrayList<>();
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
