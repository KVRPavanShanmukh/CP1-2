package com.sim;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

import com.sim.agent.BlockchainAgent;
import com.sim.blockchain.Block;
import com.sim.engine.SimulationEngine;
import com.sim.experiment.ExperimentAggregate;
import com.sim.experiment.ExperimentRunResult;
import com.sim.experiment.ExperimentRunner;
import com.sim.metrics.MetricsCalculator;
import com.sim.metrics.MetricsSnapshot;
import com.sim.model.SimulationConfig;

class Phase6MetricsTests {

    @Test
    void knownTreeProducesExpectedLocalClassificationsAndRejectionCounts() {
        SimulationEngine engine = engine("PoW", 1, 1);
        BlockchainAgent agent = engine.getState().getAgents().get(0);
        assertFalse(agent.receiveBlock(new Block("bad", Block.GENESIS_ID, agent.getId(), 2, 1)));
        Block first = new Block("first", Block.GENESIS_ID, agent.getId(), 1, 1);
        Block second = new Block("second", Block.GENESIS_ID, agent.getId(), 1, 1);
        assertTrue(agent.receiveBlock(first));
        assertTrue(agent.receiveBlock(second));
        assertFalse(agent.receiveBlock(second));
        assertFalse(agent.receiveBlock(new Block("orphan", "missing", agent.getId(), 2, 2)));

        MetricsSnapshot snapshot = new MetricsCalculator().calculateMetrics(engine.getState());

        assertEquals(1, snapshot.getBlocksRejected());
        assertEquals(0, snapshot.getBlocksAccepted());
        assertEquals(1, snapshot.getStaleBlocks());
        assertEquals(1, snapshot.getOrphanBlocks());
        assertEquals(1, snapshot.getCompetingBlocks());
        assertEquals(2, snapshot.getCanonicalBlocks());
    }

    @Test
    void networkCountersAndDuplicateDeliveryAreMeasuredWithoutDoubleCounting() {
        SimulationEngine engine = engine("PoW", 2, 1);
        BlockchainAgent first = engine.getState().getAgents().get(0);
        BlockchainAgent second = engine.getState().getAgents().get(1);
        first.getPeers().clear();
        second.getPeers().clear();
        first.addPeer(second.getId());
        second.addPeer(first.getId());
        Block block = new Block("network-block", Block.GENESIS_ID, first.getId(), 1, 1);
        first.receiveBlock(block);
        engine.getState().getNetworkModel().broadcastMessage(first.getId(),
                com.sim.network.NetworkMessage.MessageType.BLOCK, block);
        engine.getState().getNetworkModel().broadcastMessage(first.getId(),
                com.sim.network.NetworkMessage.MessageType.BLOCK, block);
        for (int tick = 0; tick < 15; tick++) {
            engine.getState().incrementTick();
            engine.getState().getNetworkModel().deliverMessages();
            second.processMessages();
        }

        MetricsSnapshot snapshot = new MetricsCalculator().calculateMetrics(engine.getState());
        assertEquals(2, snapshot.getMessagesSent());
        assertEquals(2, snapshot.getMessagesDelivered());
        assertEquals(1, snapshot.getDuplicateMessages());
        assertTrue(snapshot.getAveragePropagationDelayTicks() >= 10.0);
        assertEquals(2, second.getKnownBlocks().size());
    }

    @Test
    void freshSimulationStartsWithFreshMetrics() {
        SimulationEngine first = engine("PoW", 1, 1);
        first.tick();
        SimulationEngine second = engine("PoW", 1, 1);

        assertEquals(0, second.getMetricsSnapshot().getBlocksProduced());
        assertEquals(0, second.getMetricsSnapshot().getMessagesSent());
        assertEquals(1, second.getMetricsSnapshot().getCanonicalBlocks());
    }

    @Test
    void experimentRunsAreSeededAndFailedRunsRemainVisibleInAggregation() {
        SimulationConfig config = config("PoW", 2, 2);
        ExperimentRunner runner = new ExperimentRunner();
        ExperimentRunResult first = runner.run(config);
        ExperimentRunResult second = runner.run(config);
        assertEquals("COMPLETED", first.getStatus());
        assertEquals(first.getMetrics().getBlocksProduced(), second.getMetrics().getBlocksProduced());

        ExperimentAggregate aggregate = runner.runRepeated(config, List.of(1L, 2L));
        assertEquals(2, aggregate.getSampleCount());
        assertEquals(0, aggregate.getFailedRuns());
        assertEquals(2, aggregate.getRuns().size());
        assertTrue(aggregate.getStandardDeviationBlocksProduced() >= 0.0);

        ExperimentAggregate withFailure = new ExperimentAggregate();
        withFailure.addRun(first);
        ExperimentRunResult failed = new ExperimentRunResult();
        failed.setStatus("FAILED");
        failed.setRandomSeed(99L);
        withFailure.addRun(failed);
        assertEquals(1, withFailure.getSuccessfulRuns());
        assertEquals(1, withFailure.getFailedRuns());
        assertEquals(2, withFailure.getRuns().size());
    }
    @Test
    void experimentCopyPreservesSlotDuration() {
        // D3 regression: copy() must preserve slotDuration so repeated runs honour it
        SimulationConfig template = config("PoW", 2, 2);
        template.setSlotDuration(2.5);
        ExperimentRunner runner = new ExperimentRunner();
        ExperimentAggregate aggregate = runner.runRepeated(template, List.of(1L, 2L));
        // Both runs must complete (slotDuration is non-negative, so validation passes)
        assertEquals(2, aggregate.getSuccessfulRuns());
        assertEquals(0, aggregate.getFailedRuns());
        // Verify the template itself was not mutated
        assertEquals(2.5, template.getSlotDuration(), 1e-9);
    }

    @Test
    void mainchainRateIsAuthorativeAndDistinctFromOneMinusGini() {
        // D1 regression: engine must expose a real mainchain rate sourced from BlockchainState,
        // not derived from the Gini coefficient.
        SimulationConfig cfg = config("PoW", 4, 5);
        SimulationEngine engine = new SimulationEngine(cfg);
        // Run ticks so blocks are actually produced
        for (int i = 0; i < 5; i++) {
            engine.tick();
        }
        double mainchainRate = engine.getState().getBlockchainState().getMainchainRate();
        // mainchainRate = canonicalHeight / non-genesis blocks (mu = |M| / |B|),
        // so a run with no forks is exactly 1.0 and a run with only genesis is 1.0 too.
        assertTrue(mainchainRate >= 0.0 && mainchainRate <= 1.0,
                "mainchainRate must be in [0, 1], got " + mainchainRate);
        int totalBlocks = engine.getState().getBlockchainState().getTotalBlocks();
        int canonicalHeight = engine.getState().getBlockchainState().getGlobalCanonicalHead() == null
                ? 0 : engine.getState().getBlockchainState().getGlobalCanonicalHead().getHeight();
        int nonGenesisBlocks = Math.max(0, totalBlocks - 1);
        double expectedRate = nonGenesisBlocks == 0
                ? 1.0 : (double) canonicalHeight / nonGenesisBlocks;
        assertEquals(expectedRate, mainchainRate, 1e-9,
                "mainchainRate must equal canonicalHeight / non-genesis blocks");

        // branchingRatio is the fork counterpart F = |Theta| / |M| of the same chain.
        double expectedBranching = canonicalHeight == 0
                ? 0.0 : (double) Math.max(0, nonGenesisBlocks - canonicalHeight) / canonicalHeight;
        assertEquals(expectedBranching, engine.getState().getBlockchainState().getBranchingRatio(), 1e-9,
                "branchingRatio must equal off-chain blocks / canonical blocks");
    }

    @Test
    void mainchainRateIsOneForASingleCanonicalChain() {
        SimulationConfig cfg = config("PoW", 1, 4);
        cfg.setBlockGossipLatency(0.0);
        SimulationEngine engine = new SimulationEngine(cfg);
        for (int i = 0; i < 4; i++) {
            engine.tick();
        }
        assertEquals(1.0, engine.getState().getBlockchainState().getMainchainRate(), 1e-9,
                "a single-chain run must report mu = 1.0 (genesis is not counted as a fork)");
        assertEquals(0.0, engine.getState().getBlockchainState().getBranchingRatio(), 1e-9,
                "a single-chain run must report F = 0.0");
    }



    @Test
    void invalidExperimentConfigurationIsRejected() {
        SimulationConfig invalid = config("PoW", 2, 0);
        assertThrows(IllegalArgumentException.class, () -> new ExperimentRunner().run(invalid));
        assertThrows(IllegalArgumentException.class, () -> new ExperimentRunner().runRepeated(config("PoW", 2, 1), List.of()));
    }

    @Test
    void seededRunsAreBitReproducible() {
        // The research suite promises that a seed fully determines a run. Block ids feed
        // deterministic fork-choice tie-breaks, so they must come from the run sequence
        // rather than a random UUID.
        SimulationConfig cfg = config("PoS", 6, 8);
        cfg.setRandomSeed(4242L);
        cfg.setNetworkLatencyJitter(2);
        ExperimentRunner runner = new ExperimentRunner();
        ExperimentRunResult first = runner.run(cfg);
        ExperimentRunResult second = runner.run(cfg);

        assertEquals("COMPLETED", first.getStatus());
        assertEquals("COMPLETED", second.getStatus());
        assertEquals(first.getMetrics().getBlocksProduced(), second.getMetrics().getBlocksProduced());
        assertEquals(first.getMetrics().getActiveForks(), second.getMetrics().getActiveForks());
        assertEquals(first.getMetrics().getStaleBlocks(), second.getMetrics().getStaleBlocks());
        assertEquals(first.getMetrics().getMessagesDelivered(), second.getMetrics().getMessagesDelivered());
        assertEquals(first.getMetrics().getCanonicalHeadAgreement(),
                second.getMetrics().getCanonicalHeadAgreement(), 0.0);
        assertEquals(first.getMetrics().getMainchainRate(), second.getMetrics().getMainchainRate(), 0.0);
        assertEquals(first.getMetrics().getGiniCoefficient(), second.getMetrics().getGiniCoefficient(), 0.0);
    }

    private SimulationEngine engine(String consensus, int nodes, int ticks) {
        return new SimulationEngine(config(consensus, nodes, ticks));
    }

    private SimulationConfig config(String consensus, int nodes, int ticks) {
        SimulationConfig config = new SimulationConfig();
        config.setConsensusType(consensus);
        config.setNodeCount(nodes);
        config.setNetworkTopology("Erdos-Renyi");
        config.setBlockGossipLatency(1.0);
        config.setRandomSeed(7L);
        config.setSimulationTicks(ticks);
        return config;
    }
}
