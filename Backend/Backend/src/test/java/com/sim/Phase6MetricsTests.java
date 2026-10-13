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
    void invalidExperimentConfigurationIsRejected() {
        SimulationConfig invalid = config("PoW", 2, 0);
        assertThrows(IllegalArgumentException.class, () -> new ExperimentRunner().run(invalid));
        assertThrows(IllegalArgumentException.class, () -> new ExperimentRunner().runRepeated(config("PoW", 2, 1), List.of()));
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
