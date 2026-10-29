package com.sim;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.sim.engine.SimulationEngine;
import com.sim.experiment.*;
import com.sim.metrics.MetricsSnapshot;
import com.sim.model.SimulationConfig;

import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

/**
 * Executes the Task 3D research experiments using the existing ExperimentRunner
 * and ExperimentComparisonRunner. Writes raw results to docs/research-results/.
 * <p>
 * Standalone driver — compile with Maven test-compile, then run main().
 */
public class ResearchExperimentDriver {

    private static final List<Long> SEEDS = List.of(1L, 2L, 3L, 4L, 5L);
    private static final String RESULTS_DIR = "D:\\CP1\\CHAIN55\\PROJECT B\\docs\\research-results";
    private static final ObjectMapper MAPPER = new ObjectMapper()
            .enable(SerializationFeature.INDENT_OUTPUT);

    private final ExperimentComparisonRunner runner = new ExperimentComparisonRunner();

    public static void main(String[] args) throws Exception {
        ResearchExperimentDriver driver = new ResearchExperimentDriver();
        Files.createDirectories(Paths.get(RESULTS_DIR));
        driver.runAll();
    }

    private void runAll() throws Exception {
        runExperiment1();
        runExperiment2();
        runExperiment3();
        runExperiment4();
        runExperiment5();
        runExperiment6();
        System.out.println("\nAll 6 experiments completed.");
    }

    // ============ Experiment 1: Network Latency ============

    private void runExperiment1() throws Exception {
        SimulationConfig baseline = baseConfig();
        baseline.setBlockGossipLatency(0.5);
        SimulationConfig treatment = baseConfig();
        treatment.setBlockGossipLatency(3.0);
        ExperimentComparisonResult result = runner.run(request(
                "baseline-latency-0.5", baseline,
                "treatment-latency-3.0", treatment, SEEDS));
        writeJson("exp1-latency.json", result);
        printSummary("Exp 1 — Latency (0.5 → 3.0)", result);
    }

    // ============ Experiment 2: Packet Loss ============

    private void runExperiment2() throws Exception {
        SimulationConfig baseline = baseConfig();
        baseline.setPacketLossRate(0.0);
        SimulationConfig treatment = baseConfig();
        treatment.setPacketLossRate(0.3);
        ExperimentComparisonResult result = runner.run(request(
                "baseline-packetloss-0.0", baseline,
                "treatment-packetloss-0.3", treatment, SEEDS));
        writeJson("exp2-packetloss.json", result);
        printSummary("Exp 2 — Packet Loss (0.0 → 0.3)", result);
    }

    // ============ Experiment 3: Network Partition ============

    private void runExperiment3() throws Exception {
        SimulationConfig baseline = baseConfig();
        baseline.setPartitionRatio(0.0);
        baseline.setPartitionStartTick(-1);
        baseline.setPartitionEndTick(-1);
        baseline.setPartitionGroupA(new ArrayList<>());
        baseline.setPartitionGroupB(new ArrayList<>());
        SimulationConfig treatment = baseConfig();
        treatment.setPartitionRatio(0.4);
        treatment.setPartitionStartTick(2);
        treatment.setPartitionEndTick(6);
        treatment.setPartitionGroupA(new ArrayList<>());
        treatment.setPartitionGroupB(new ArrayList<>());
        ExperimentComparisonResult result = runner.run(request(
                "baseline-partition-none", baseline,
                "treatment-partition-0.4-ticks2-6", treatment, SEEDS));
        writeJson("exp3-partition.json", result);
        printSummary("Exp 3 — Partition (none → 0.4 ticks 2-6)", result);
    }

    // ============ Experiment 4: Byzantine Ratio ============

    private void runExperiment4() throws Exception {
        SimulationConfig baseline = baseConfig();
        baseline.setByzantineRatio(0.0);
        baseline.setByzantineBehaviorEnabled(false);
        baseline.setByzantineAttackMode("EQUIVOCATION");
        SimulationConfig treatment = baseConfig();
        treatment.setByzantineRatio(0.33);
        treatment.setByzantineBehaviorEnabled(true);
        treatment.setByzantineAttackMode("ALL");
        ExperimentComparisonResult result = runner.run(request(
                "baseline-byzantine-0.0", baseline,
                "treatment-byzantine-0.33-ALL", treatment, SEEDS));
        writeJson("exp4-byzantine.json", result);
        printSummary("Exp 4 — Byzantine (0.0 → 0.33 ALL)", result);
    }

    // ============ Experiment 5: Transaction Load ============

    private void runExperiment5() throws Exception {
        SimulationConfig baseline = baseConfig();
        baseline.setTransactionsPerAgentPerTick(0);
        SimulationConfig treatment = baseConfig();
        treatment.setTransactionsPerAgentPerTick(3);
        ExperimentComparisonResult result = runner.run(request(
                "baseline-txload-0", baseline,
                "treatment-txload-3", treatment, SEEDS));
        writeJson("exp5-txload.json", result);
        printSummary("Exp 5 — Transaction Load (0 → 3)", result);
    }

    // ============ Experiment 6: Consensus Strategies ============

    private void runExperiment6() throws Exception {
        for (String consensus : List.of("PoS", "DPoS", "PoA", "PoL")) {
            SimulationConfig baseline = baseConfig();
            baseline.setConsensusType("PoW");
            SimulationConfig treatment = baseConfig();
            treatment.setConsensusType(consensus);
            ExperimentComparisonResult result = runner.run(request(
                    "baseline-consensus-PoW", baseline,
                    "treatment-consensus-" + consensus, treatment, SEEDS));
            writeJson("exp6-consensus-" + consensus + ".json", result);
            printSummary("Exp 6 — Consensus (PoW → " + consensus + ")", result);
        }
    }

    // ============ Helpers ============

    private SimulationConfig baseConfig() {
        SimulationConfig config = new SimulationConfig();
        config.setNodeCount(6);
        config.setConsensusType("PoW");
        config.setNetworkTopology("Erdos-Renyi");
        config.setBlockGossipLatency(0.5);
        config.setSlotDuration(1.0);
        config.setSimulationTicks(8);
        config.setRandomSeed(7L);
        config.setByzantineRatio(0.0);
        config.setByzantineBehaviorEnabled(false);
        config.setByzantineAttackMode("EQUIVOCATION");
        config.setAuthorityIds(new ArrayList<>());
        config.setInactiveAgentRatio(0.0);
        config.setPacketLossRate(0.0);
        config.setNetworkLatencyJitter(2);
        config.setPartitionRatio(0.0);
        config.setPartitionStartTick(-1);
        config.setPartitionEndTick(-1);
        config.setPartitionGroupA(new ArrayList<>());
        config.setPartitionGroupB(new ArrayList<>());
        config.setTransactionsPerAgentPerTick(0);
        config.setMempoolCapacity(100);
        config.setMaxTransactionsPerBlock(100);
        config.setTransactionAmount(1.0);
        return config;
    }

    private ExperimentComparisonRequest request(
            String baselineName, SimulationConfig baseline,
            String treatmentName, SimulationConfig treatment,
            List<Long> seeds) {

        ExperimentComparisonRequest request = new ExperimentComparisonRequest();
        request.setBaseline(new ExperimentComparisonRequest.NamedExperimentConfig(baselineName, baseline));
        List<ExperimentComparisonRequest.NamedExperimentConfig> treatments = new ArrayList<>();
        treatments.add(new ExperimentComparisonRequest.NamedExperimentConfig(treatmentName, treatment));
        request.setTreatments(treatments);
        request.setSeeds(seeds);
        return request;
    }

    private void writeJson(String filename, Object obj) throws IOException {
        Path path = Paths.get(RESULTS_DIR, filename);
        try (FileWriter writer = new FileWriter(path.toFile())) {
            MAPPER.writeValue(writer, obj);
        }
        System.out.println("Wrote " + path);
    }

    private void printSummary(String label, ExperimentComparisonResult result) {
        System.out.println("\n=== " + label + " ===");
        System.out.println("Seeds: " + result.getSeeds());
        System.out.println("Baseline: " + result.getBaselineName()
                + " attempted=" + result.getBaseline().getAttemptedRuns()
                + " successful=" + result.getBaseline().getSuccessfulRuns()
                + " failed=" + result.getBaseline().getFailedRuns());

        for (TreatmentComparison tc : result.getTreatments()) {
            System.out.println("Treatment: " + tc.getTreatmentName()
                    + " controlled=" + tc.isControlled()
                    + " factors=" + tc.getChangedFactors().size()
                    + " note=\"" + tc.getStatusNote() + "\"");
            System.out.println("  Treatment attempted=" + tc.getTreatment().getAttemptedRuns()
                    + " successful=" + tc.getTreatment().getSuccessfulRuns()
                    + " failed=" + tc.getTreatment().getFailedRuns());

            for (MetricComparison mc : tc.getComparisons()) {
                if (mc.isAvailable()) {
                    System.out.printf("  %-35s base=%.4f treat=%.4f delta=%.4f relDelta=%s%n",
                            mc.getMetric(),
                            mc.getBaselineMean() == null ? 0.0 : mc.getBaselineMean(),
                            mc.getTreatmentMean() == null ? 0.0 : mc.getTreatmentMean(),
                            mc.getAbsoluteDelta() == null ? 0.0 : mc.getAbsoluteDelta(),
                            mc.getRelativeDelta() == null ? "null" : String.format("%.4f", mc.getRelativeDelta()));
                } else {
                    System.out.println("  " + mc.getMetric() + " UNAVAILABLE: " + mc.getUnavailableReason());
                }
            }
        }

        if (!result.getUnsupportedMeasurements().isEmpty()) {
            System.out.println("Unsupported: " + result.getUnsupportedMeasurements());
        }
    }
}