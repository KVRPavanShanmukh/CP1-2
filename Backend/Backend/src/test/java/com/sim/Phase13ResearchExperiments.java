package com.sim;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.FileWriter;
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
    private static final String RESULTS_DIR = "D:\\CP1\\CHAIN55\\PROJECT B\\docs\\research-results";
    private static final ExperimentComparisonRunner runner = new ExperimentComparisonRunner();

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
        Path p = Paths.get(RESULTS_DIR, filename);
        java.nio.file.Files.createDirectories(p.getParent());
        try (FileWriter w = new FileWriter(p.toFile())) {
            var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            mapper.writerWithDefaultPrettyPrinter().writeValue(w, obj);
        }
    }

    @Test void exp1() throws Exception {
        var base = baseConfig(); base.setBlockGossipLatency(0.5);
        var treat = baseConfig(); treat.setBlockGossipLatency(3.0);
        var r = runner.run(request("E1-baseline", base, "E1-treatment", treat));
        assertEquals(5, r.getBaseline().getAttemptedRuns());
        assertTrue(r.getTreatments().get(0).isControlled());
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
        var treat = baseConfig(); treat.setByzantineRatio(0.33); treat.setByzantineBehaviorEnabled(true); treat.setByzantineAttackMode("ALL");
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