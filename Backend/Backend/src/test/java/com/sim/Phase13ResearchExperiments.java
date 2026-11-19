package com.sim;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.FileWriter;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.ArrayList;
import org.junit.jupiter.api.Test;
import com.sim.experiment.ExperimentComparisonResult;
import com.sim.experiment.ExperimentComparisonRunner;
import com.sim.model.SimulationConfig;
import com.sim.experiment.ExperimentComparisonRequest;
import com.sim.experiment.ExperimentComparisonRequest.NamedExperimentConfig;

class Phase13ResearchExperiments {
    private static final List<Long> SEEDS = List.of(1L, 2L, 3L, 4L, 5L);
    /** Overridable with -Dchain55.researchResultsDir=<path>; defaults to docs/research-results. */
    private static final Path RESULTS_DIR = resolveResultsDir();
    private static final ExperimentComparisonRunner runner = new ExperimentComparisonRunner();

    /**
     * Locates the repository's docs/research-results directory independently of the
     * machine it runs on. Maven may be invoked from the repository root or from
     * Backend/Backend, so walk up until an existing docs/research-results is found.
     */
    static Path resolveResultsDir() {
        String override = System.getProperty("chain55.researchResultsDir");
        if (override != null && !override.isBlank()) {
            return Paths.get(override).toAbsolutePath().normalize();
        }
        Path current = Paths.get(System.getProperty("user.dir", ".")).toAbsolutePath().normalize();
        List<Path> existingCandidates = new ArrayList<>();
        for (int depth = 0; depth < 5 && current != null; depth++) {
            Path candidate = current.resolve("docs").resolve("research-results");
            if (Files.isDirectory(candidate)) {
                existingCandidates.add(candidate.toAbsolutePath().normalize());
            }
            current = current.getParent();
        }
        // Prefer a directory that already holds experiment datasets; the backend module
        // may contain an empty docs/research-results placeholder that must not win.
        for (Path candidate : existingCandidates) {
            try (var entries = Files.list(candidate)) {
                boolean hasDatasets = entries.anyMatch(path -> {
                    String name = path.getFileName().toString();
                    return name.startsWith("exp") && name.endsWith(".json");
                });
                if (hasDatasets) {
                    return candidate;
                }
            } catch (IOException ignored) {
                // Fall through to the remaining candidates.
            }
        }
        if (!existingCandidates.isEmpty()) {
            return existingCandidates.get(0);
        }
        Path fallback = Paths.get("..", "..", "docs", "research-results").toAbsolutePath().normalize();
        try {
            Files.createDirectories(fallback);
            return fallback;
        } catch (IOException e) {
            throw new UncheckedIOException("Could not create " + fallback, e);
        }
    }

    /**
     * Standalone mapper for the archived datasets. A plain ObjectMapper does not know
     * {@link java.time.Instant} (the REST layer uses Spring's configured mapper), so the
     * only java.time value in the payload is serialized explicitly as an ISO-8601 string.
     */
    static com.fasterxml.jackson.databind.ObjectMapper datasetMapper() {
        var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        var module = new com.fasterxml.jackson.databind.module.SimpleModule();
        module.addSerializer(java.time.Instant.class,
                new com.fasterxml.jackson.databind.JsonSerializer<java.time.Instant>() {
                    @Override
                    public void serialize(java.time.Instant value,
                            com.fasterxml.jackson.core.JsonGenerator generator,
                            com.fasterxml.jackson.databind.SerializerProvider serializers)
                            throws java.io.IOException {
                        generator.writeString(value.toString());
                    }
                });
        mapper.registerModule(module);
        return mapper;
    }

    static SimulationConfig baseConfig() {
        SimulationConfig c = new SimulationConfig();
        c.setNodeCount(6); c.setConsensusType("PoW"); c.setNetworkTopology("Erdos-Renyi");
        c.setBlockGossipLatency(0.5); c.setSlotDuration(1.0); c.setSimulationTicks(8);
        c.setRandomSeed(7L); c.setByzantineRatio(0.0); c.setByzantineBehaviorEnabled(false);
        c.setByzantineAttackMode("EQUIVOCATION"); c.setAuthorityIds(new java.util.ArrayList<>());
        c.setInactiveAgentRatio(0.0); c.setPacketLossRate(0.0); c.setNetworkLatencyJitter(2);
        c.setPartitionRatio(0.0); c.setPartitionStartTick(-1); c.setPartitionEndTick(-1);
        c.setPartitionGroupA(new java.util.ArrayList<>()); c.setPartitionGroupB(new java.util.ArrayList<>());
        c.setTransactionsPerAgentPerTick(0); c.setMempoolCapacity(100); c.setMaxTransactionsPerBlock(100);
        c.setTransactionAmount(1.0);
        return c;
    }

    static ExperimentComparisonRequest request(
            String baselineName, SimulationConfig baseline,
            String treatmentName, SimulationConfig treatment) {
        ExperimentComparisonRequest req = new ExperimentComparisonRequest();
        req.setBaseline(new NamedExperimentConfig(baselineName, baseline));
        List<NamedExperimentConfig> treatments = new ArrayList<NamedExperimentConfig>();
        treatments.add(new NamedExperimentConfig(treatmentName, treatment));
        req.setTreatments(treatments);
        req.setSeeds(SEEDS);
        return req;
    }

    static void saveJson(String filename, Object obj) throws Exception {
        Path p = RESULTS_DIR.resolve(filename);
        java.nio.file.Files.createDirectories(p.getParent());
        try (FileWriter w = new FileWriter(p.toFile())) {
            datasetMapper().writerWithDefaultPrettyPrinter().writeValue(w, obj);
        }
        assertTrue(Files.isRegularFile(p) && Files.size(p) > 0,
                "experiment dataset must be written to " + p);
    }

    @Test void exp1() throws Exception {
        var base = baseConfig(); base.setBlockGossipLatency(0.5);
        var treat = baseConfig(); treat.setBlockGossipLatency(3.0);
        var r = runner.run(request("E1-baseline", base, "E1-treatment", treat));
        assertEquals(5, r.getBaseline().getAttemptedRuns());
        assertTrue(r.getTreatments().get(0).isControlled());
        // The paper's core chain metrics must be part of every comparison, not omitted.
        var metrics = r.getTreatments().get(0).getComparisons().stream()
                .map(com.sim.experiment.MetricComparison::getMetric).toList();
        assertTrue(metrics.contains("giniCoefficient"), "giniCoefficient must be compared");
        assertTrue(metrics.contains("mainchainRate"), "mainchainRate must be compared");
        assertTrue(metrics.contains("branchingRatio"), "branchingRatio must be compared");
        saveJson("exp1-network-latency.json", r);
    }

    @Test void exp2() throws Exception {
        var base = baseConfig(); base.setPacketLossRate(0.0);
        var treat = baseConfig(); treat.setPacketLossRate(0.3);
        var r = runner.run(request("E2-baseline", base, "E2-treatment", treat));
        assertEquals(5, r.getBaseline().getAttemptedRuns());
        assertTrue(r.getTreatments().get(0).isControlled());
        saveJson("exp2-packet-loss.json", r);
    }

    @Test void exp3() throws Exception {
        var base = baseConfig();
        base.setPartitionRatio(0.0); base.setPartitionStartTick(-1); base.setPartitionEndTick(-1);
        base.setPartitionGroupA(new java.util.ArrayList<>()); base.setPartitionGroupB(new java.util.ArrayList<>());
        var treat = baseConfig(); treat.setPartitionRatio(0.4); treat.setPartitionStartTick(2); treat.setPartitionEndTick(6);
        treat.setPartitionGroupA(new java.util.ArrayList<>()); treat.setPartitionGroupB(new java.util.ArrayList<>());
        var r = runner.run(request("E3-baseline", base, "E3-treatment", treat));
        assertEquals(5, r.getBaseline().getAttemptedRuns());
        assertTrue(r.getTreatments().get(0).isControlled());
        saveJson("exp3-network-partition.json", r);
    }

    @Test void exp4() throws Exception {
        var base = baseConfig(); base.setByzantineRatio(0.0); base.setByzantineBehaviorEnabled(false); base.setByzantineAttackMode("EQUIVOCATION");
        // Floor semantics: 0.34 × 6 = 2.04 -> 2 Byzantine agents (the documented 2 of 6).
        var treat = baseConfig(); treat.setByzantineRatio(0.34); treat.setByzantineBehaviorEnabled(true); treat.setByzantineAttackMode("ALL");
        var r = runner.run(request("E4-baseline", base, "E4-treatment", treat));
        assertEquals(5, r.getBaseline().getAttemptedRuns());
        assertTrue(r.getTreatments().get(0).isControlled());
        saveJson("exp4-byzantine.json", r);
    }

    @Test void exp5() throws Exception {
        var base = baseConfig(); base.setTransactionsPerAgentPerTick(0);
        var treat = baseConfig(); treat.setTransactionsPerAgentPerTick(3);
        var r = runner.run(request("E5-baseline", base, "E5-treatment", treat));
        assertEquals(5, r.getBaseline().getAttemptedRuns());
        assertTrue(r.getTreatments().get(0).isControlled());
        saveJson("exp5-tx-load.json", r);
    }

    @Test void exp6() throws Exception {
        for (String ct : List.of("PoS", "DPoS", "PoA", "PoL")) {
            var base = baseConfig(); base.setConsensusType("PoW");
            var treat = baseConfig(); treat.setConsensusType(ct);
            var r = runner.run(request("E6-baseline-PoW", base, "E6-treatment-" + ct, treat));
            assertEquals(5, r.getBaseline().getAttemptedRuns());
            assertTrue(r.getTreatments().get(0).isControlled());
            saveJson("exp6-consensus-" + ct + ".json", r);
        }
    }
}