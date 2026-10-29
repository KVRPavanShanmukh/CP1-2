package com.sim.experiment;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.ToDoubleFunction;

import com.sim.metrics.MetricsSnapshot;

/**
 * Aggregated results of one configuration executed with an ordered list of seeds.
 *
 * <p>Only runs with status {@code COMPLETED} and a non-null snapshot contribute to
 * statistics. Failed runs stay in {@link #getRuns()}, are counted by
 * {@link #getFailedRuns()} and are never treated as zero-valued observations.</p>
 */
public class ExperimentAggregate {
    private record MetricSpec(String metric, String unit, String measurement, String definition,
            ToDoubleFunction<MetricsSnapshot> extractor) {
    }

    private static final List<MetricSpec> METRICS = List.of(
            new MetricSpec("blocksProduced", "blocks", MetricStatistics.DIRECT,
                    "Blocks produced by all agents, summed from the final snapshot.",
                    snapshot -> snapshot.getBlocksProduced()),
            new MetricSpec("canonicalHeadAgreement", "fraction", MetricStatistics.DIRECT,
                    "Share of agents sharing the most common local head at the final tick (agent-local head observations).",
                    snapshot -> snapshot.getCanonicalHeadAgreement()),
            new MetricSpec("convergedRunRate", "fraction", MetricStatistics.DIRECT,
                    "Mean of the converged flag: 1.0 when every agent shares one head, otherwise 0.0.",
                    snapshot -> snapshot.isConverged() ? 1.0 : 0.0),
            new MetricSpec("staleBlocks", "blocks", MetricStatistics.AGENT_LOCAL_OBSERVATION,
                    "Agent-local stale observations summed per run; one block may count once per agent.",
                    snapshot -> snapshot.getStaleBlocks()),
            new MetricSpec("competingBlocks", "blocks", MetricStatistics.AGENT_LOCAL_OBSERVATION,
                    "Agent-local competing observations summed per run; derived from the same local data as stale blocks.",
                    snapshot -> snapshot.getCompetingBlocks()),
            new MetricSpec("orphanBlocks", "blocks", MetricStatistics.AGENT_LOCAL_OBSERVATION,
                    "Agent-local retained orphan observations summed per run.",
                    snapshot -> snapshot.getOrphanBlocks()),
            new MetricSpec("activeForks", "forks", MetricStatistics.DIRECT,
                    "Active forks reported by the final blockchain state.",
                    snapshot -> snapshot.getActiveForks()),
            new MetricSpec("transactionsCreated", "transactions", MetricStatistics.DIRECT,
                    "Transactions accepted into mempools during the run.",
                    snapshot -> snapshot.getTransactionsCreated()),
            new MetricSpec("transactionsIncluded", "transactions", MetricStatistics.DIRECT,
                    "Unique transactions included in the canonical chain.",
                    snapshot -> snapshot.getTransactionsIncluded()),
            new MetricSpec("transactionSuccessRate", "fraction", MetricStatistics.DIRECT,
                    "Included unique transactions divided by created transactions; 0.0 when none were created.",
                    snapshot -> snapshot.getTransactionSuccessRate()),
            new MetricSpec("transactionsPerSimulationTick", "txs/tick", MetricStatistics.MODELED_TICK_PROXY,
                    "Included transactions divided by simulation ticks; simulation time, not wall-clock TPS.",
                    snapshot -> snapshot.getTransactionsPerSimulationTick()),
            new MetricSpec("blockProductionRate", "blocks/tick", MetricStatistics.MODELED_TICK_PROXY,
                    "Produced blocks divided by completed simulation ticks.",
                    snapshot -> snapshot.getBlockProductionRate()),
            new MetricSpec("messageThroughput", "messages/tick", MetricStatistics.MODELED_TICK_PROXY,
                    "Delivered messages divided by completed simulation ticks.",
                    snapshot -> snapshot.getMessageThroughput()),
            new MetricSpec("messagesSent", "messages", MetricStatistics.DIRECT,
                    "Cumulative network queue events created by the run.",
                    snapshot -> snapshot.getMessagesSent()),
            new MetricSpec("messagesDelivered", "messages", MetricStatistics.DIRECT,
                    "Cumulative messages delivered by the scheduler.",
                    snapshot -> snapshot.getMessagesDelivered()),
            new MetricSpec("messagesDropped", "messages", MetricStatistics.DIRECT,
                    "Cumulative messages dropped by configured packet loss.",
                    snapshot -> snapshot.getMessagesDropped()),
            new MetricSpec("averagePropagationDelayTicks", "ticks", MetricStatistics.MODELED_TICK_PROXY,
                    "Mean scheduled delivery delay in simulation ticks; not physical network latency.",
                    snapshot -> snapshot.getAveragePropagationDelayTicks()),
            new MetricSpec("blockPropagationDelay", "ticks", MetricStatistics.MODELED_TICK_PROXY,
                    "Mean block propagation delay in simulation ticks from production to peer delivery.",
                    snapshot -> snapshot.getBlockPropagationDelay()),
            new MetricSpec("maliciousActionsAttempted", "actions", MetricStatistics.DIRECT,
                    "Malicious actions attempted by simulated Byzantine agents; not a security claim.",
                    snapshot -> snapshot.getMaliciousActionsAttempted()),
            new MetricSpec("blocksWithheld", "blocks", MetricStatistics.DIRECT,
                    "Blocks produced by simulated Byzantine agents but withheld from broadcast.",
                    snapshot -> snapshot.getBlocksWithheld()),
            new MetricSpec("conflictingAttestations", "attestations", MetricStatistics.DIRECT,
                    "Conflicting attestations generated by simulated Byzantine agents.",
                    snapshot -> snapshot.getConflictingAttestations()),
            new MetricSpec("byzantineAgents", "agents", MetricStatistics.DIRECT,
                    "Agents instantiated as Byzantine for the run.",
                    snapshot -> snapshot.getByzantineAgents()),
            new MetricSpec("inactiveAgents", "agents", MetricStatistics.DIRECT,
                    "Agents marked inactive for the run.",
                    snapshot -> snapshot.getInactiveAgents()),
            new MetricSpec("activeAgents", "agents", MetricStatistics.DIRECT,
                    "Agents that are neither Byzantine nor inactive.",
                    snapshot -> snapshot.getActiveAgents()));

    private final List<ExperimentRunResult> runs = new ArrayList<>();
    private final Map<String, MetricStatistics> statistics = new LinkedHashMap<>();
    private int successfulRuns;
    private int failedRuns;
    private double meanBlocksProduced;
    private double standardDeviationBlocksProduced;
    private int minimumBlocksProduced;
    private int maximumBlocksProduced;
    /** Mean transaction success rate (included unique txs / created txs) across successful runs. */
    private double meanTransactionSuccessRate;
    /** Mean messages delivered across successful runs. */
    private double meanMessagesDelivered;
    /** Mean messages dropped across successful runs. */
    private double meanMessagesDropped;
    /** Mean message delivery delay ticks across successful runs. */
    private double meanPropagationDelay;
    /** Mean block propagation delay ticks across successful runs. */
    private double meanBlockPropagationDelay;

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
        recalculateLegacySummary(successful);
        recalculateStatistics(successful);
    }

    private void recalculateLegacySummary(List<ExperimentRunResult> successful) {
        if (successful.isEmpty()) {
            meanBlocksProduced = 0.0;
            standardDeviationBlocksProduced = 0.0;
            minimumBlocksProduced = 0;
            maximumBlocksProduced = 0;
            meanTransactionSuccessRate = 0.0;
            meanMessagesDelivered = 0.0;
            meanMessagesDropped = 0.0;
            meanPropagationDelay = 0.0;
            meanBlockPropagationDelay = 0.0;
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
        meanMessagesDelivered = successful.stream()
                .mapToDouble(run -> run.getMetrics().getMessagesDelivered())
                .average().orElse(0.0);
        meanMessagesDropped = successful.stream()
                .mapToDouble(run -> run.getMetrics().getMessagesDropped())
                .average().orElse(0.0);
        meanPropagationDelay = successful.stream()
                .mapToDouble(run -> run.getMetrics().getAveragePropagationDelayTicks())
                .average().orElse(0.0);
        meanBlockPropagationDelay = successful.stream()
                .mapToDouble(run -> run.getMetrics().getBlockPropagationDelay())
                .average().orElse(0.0);
    }

    private void recalculateStatistics(List<ExperimentRunResult> successful) {
        statistics.clear();
        for (MetricSpec spec : METRICS) {
            List<Double> values = new ArrayList<>(successful.size());
            for (ExperimentRunResult run : successful) {
                values.add(spec.extractor().applyAsDouble(run.getMetrics()));
            }
            if (values.isEmpty()) {
                statistics.put(spec.metric(), MetricStatistics.unavailable(
                        spec.metric(), spec.unit(), spec.measurement(), spec.definition(), runs.size()));
            } else {
                statistics.put(spec.metric(), MetricStatistics.of(
                        spec.metric(), spec.unit(), spec.measurement(), spec.definition(), values));
            }
        }
    }

    public List<ExperimentRunResult> getRuns() { return List.copyOf(runs); }
    public int getSampleCount() { return successfulRuns; }
    public int getSuccessfulRuns() { return successfulRuns; }
    public int getFailedRuns() { return failedRuns; }
    /** Number of runs attempted with this configuration, including failed runs. */
    public int getAttemptedRuns() { return runs.size(); }
    public double getMeanBlocksProduced() { return meanBlocksProduced; }
    public double getStandardDeviationBlocksProduced() { return standardDeviationBlocksProduced; }
    public int getMinimumBlocksProduced() { return minimumBlocksProduced; }
    public int getMaximumBlocksProduced() { return maximumBlocksProduced; }
    /** Mean transaction success rate across all successful runs (0.0 if no transactions were generated). */
    public double getMeanTransactionSuccessRate() { return meanTransactionSuccessRate; }
    public double getMeanMessagesDelivered() { return meanMessagesDelivered; }
    public double getMeanMessagesDropped() { return meanMessagesDropped; }
    public double getMeanPropagationDelay() { return meanPropagationDelay; }
    public double getMeanBlockPropagationDelay() { return meanBlockPropagationDelay; }

    /**
     * Per-metric statistics over the successful runs, in a stable declaration order.
     * Metrics without a successful observation report null values and a reason.
     */
    public Map<String, MetricStatistics> getStatistics() {
        return Collections.unmodifiableMap(new LinkedHashMap<>(statistics));
    }
}
