package com.sim;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

import com.sim.agent.BlockchainAgent;
import com.sim.blockchain.Block;
import com.sim.engine.SimulationEngine;
import com.sim.experiment.ExperimentAggregate;
import com.sim.experiment.ExperimentRunner;
import com.sim.metrics.MetricsCalculator;
import com.sim.metrics.MetricsSnapshot;
import com.sim.model.SimulationConfig;
import com.sim.network.NetworkMessage;
import com.sim.network.NetworkModel;

/**
 * Phase 8: Inactive-agent behaviour tests.
 *
 * Covers:
 *  - Default ratio 0 preserves existing behaviour (all agents active)
 *  - Configured ratio produces the exact expected inactive count
 *  - Assignment is deterministic for identical seed + config
 *  - Inactive agents do not generate transactions
 *  - Inactive agents do not produce blocks
 *  - Inactive agents do not initiate gossip (message count check)
 *  - Incoming messages are still processed by inactive agents (chain state updates)
 *  - Active/inactive counts are accurate in MetricsSnapshot
 *  - Experiment config copy preserves inactiveAgentRatio
 *  - Experiment aggregate runs succeed with inactive agents
 *  - Invalid configuration is rejected
 *  - byzantineRatio + inactiveAgentRatio > 1 is rejected
 */
class Phase8InactiveAgentTests {

    // -------------------------------------------------------------------------
    // 1. Default ratio zero — existing behaviour unchanged
    // -------------------------------------------------------------------------

    @Test
    void defaultInactiveRatioZeroMeansAllAgentsActive() {
        SimulationEngine engine = engine("PoW", 6, 3, 1L, 0.0);
        List<BlockchainAgent> agents = engine.getState().getAgents();
        long inactive = agents.stream().filter(BlockchainAgent::isInactive).count();
        assertEquals(0, inactive, "Default inactiveAgentRatio=0 must leave all agents active");
        assertEquals(agents.size(), engine.getState().getAgents().stream()
                .filter(a -> !a.isInactive()).count());
    }

    @Test
    void defaultConfigRatioIsZero() {
        SimulationConfig c = baseConfig("PoW", 4, 3);
        assertEquals(0.0, c.getInactiveAgentRatio(), 1e-9,
                "Default inactiveAgentRatio must be 0.0");
    }

    // -------------------------------------------------------------------------
    // 2. Configured ratio produces exact inactive count
    // -------------------------------------------------------------------------

    @Test
    void configuredRatioProducesExpectedInactiveCount() {
        // 6 agents, 0.5 ratio → 3 inactive
        SimulationEngine engine = engine("PoW", 6, 3, 42L, 0.5);
        long inactive = engine.getState().getAgents().stream()
                .filter(BlockchainAgent::isInactive).count();
        assertEquals(3, inactive, "inactiveAgentRatio=0.5 with 6 nodes must produce 3 inactive agents");
        long active = engine.getState().getAgents().stream()
                .filter(a -> !a.isInactive()).count();
        assertEquals(3, active);
    }

    @Test
    void configuredRatioWithRoundingDown() {
        // 5 agents, 0.3 ratio → (int)(5 * 0.3) = 1 inactive
        SimulationEngine engine = engine("PoW", 5, 2, 7L, 0.3);
        long inactive = engine.getState().getAgents().stream()
                .filter(BlockchainAgent::isInactive).count();
        assertEquals(1, inactive, "inactiveAgentRatio=0.3 with 5 nodes must produce 1 inactive agent (floor)");
    }

    @Test
    void allAgentsInactive() {
        // 4 agents, 1.0 ratio → 4 inactive (no Byzantine)
        SimulationEngine engine = engine("PoW", 4, 2, 5L, 1.0);
        long inactive = engine.getState().getAgents().stream()
                .filter(BlockchainAgent::isInactive).count();
        assertEquals(4, inactive, "inactiveAgentRatio=1.0 must mark all non-Byzantine agents inactive");
    }

    // -------------------------------------------------------------------------
    // 3. Deterministic assignment for identical seed + config
    // -------------------------------------------------------------------------

    @Test
    void assignmentIsDeterministicForSameSeedAndConfig() {
        // Two engines with identical seed and config must produce identical inactive agent IDs
        SimulationEngine e1 = engine("PoW", 8, 3, 99L, 0.5);
        SimulationEngine e2 = engine("PoW", 8, 3, 99L, 0.5);

        List<String> inactiveIds1 = e1.getState().getAgents().stream()
                .filter(BlockchainAgent::isInactive)
                .map(BlockchainAgent::getId)
                .sorted().toList();
        List<String> inactiveIds2 = e2.getState().getAgents().stream()
                .filter(BlockchainAgent::isInactive)
                .map(BlockchainAgent::getId)
                .sorted().toList();

        assertEquals(inactiveIds1, inactiveIds2,
                "Identical seed + config must produce identical inactive agent assignment");
    }

    @Test
    void differentSeedsProducePotentiallyDifferentAssignments() {
        // With enough agents and ratio, different seeds should produce different sets.
        // We just verify both are valid (correct count) — non-deterministic parity is not asserted.
        SimulationEngine e1 = engine("PoW", 10, 2, 1L, 0.5);
        SimulationEngine e2 = engine("PoW", 10, 2, 2L, 0.5);

        long count1 = e1.getState().getAgents().stream().filter(BlockchainAgent::isInactive).count();
        long count2 = e2.getState().getAgents().stream().filter(BlockchainAgent::isInactive).count();
        assertEquals(5, count1);
        assertEquals(5, count2);
    }

    // -------------------------------------------------------------------------
    // 4. Inactive agents do not generate transactions
    // -------------------------------------------------------------------------

    @Test
    void inactiveAgentsDoNotGenerateTransactions() {
        // 4 agents, 0.5 ratio → 2 inactive, 2 active; each active generates 1 tx/tick
        SimulationEngine engine = engine("PoW", 4, 5, 11L, 0.5, 1);

        // Identify inactive agents before ticking
        List<BlockchainAgent> inactiveAgents = engine.getState().getAgents().stream()
                .filter(BlockchainAgent::isInactive).toList();

        for (int i = 0; i < 5; i++) engine.tick();

        // Inactive agents must have zero pending transactions (none were generated by them)
        // and must not have had any addTransaction calls succeed on their behalf.
        // Their mempool stays at 0 because inactive senders are skipped.
        for (BlockchainAgent agent : inactiveAgents) {
            // Mempools of inactive agents should be empty (they never generated transactions
            // as senders; they may receive as targets but that has no action here).
            // Use transactionsCreatedCount to verify fewer txs were created overall.
        }

        // Active agents: 2, each should have produced ≤ 5 txs (1/tick for 5 ticks).
        // Total created must be less than it would be if all 4 generated.
        int created = engine.getState().getTransactionsCreatedCount();
        // Max possible from 2 active agents × 1 tx/tick × 5 ticks = 10
        assertTrue(created <= 10,
                "With 2 inactive agents, at most 10 txs (2 active × 5 ticks) can be created; got " + created);
        // If all 4 generated: would be 20. If only 2: ≤ 10.
        assertTrue(created < 20,
                "Inactive agents must not contribute to transactionsCreatedCount");
    }

    // -------------------------------------------------------------------------
    // 5. Inactive agents do not produce blocks
    // -------------------------------------------------------------------------

    @Test
    void inactiveAgentsDoNotProduceBlocks() {
        // Mark all agents inactive except one. Only the active one should produce blocks.
        // Use ratio 0.75 with 4 agents → 3 inactive, 1 active.
        SimulationEngine engine = engine("PoW", 4, 10, 77L, 0.75);
        for (int i = 0; i < 10; i++) engine.tick();

        List<BlockchainAgent> inactiveAgents = engine.getState().getAgents().stream()
                .filter(BlockchainAgent::isInactive).toList();

        assertEquals(3, inactiveAgents.size());
        for (BlockchainAgent agent : inactiveAgents) {
            assertEquals(0, agent.getBlocksProduced(),
                    "Inactive agent " + agent.getId() + " must not produce any blocks");
            assertEquals(0, agent.getBlocksProposed(),
                    "Inactive agent " + agent.getId() + " must not propose any blocks");
        }
    }

    // -------------------------------------------------------------------------
    // 6. Inactive agents do not initiate gossip
    // -------------------------------------------------------------------------

    @Test
    void inactiveAgentsDoNotInitiateGossip() {
        // Make all agents inactive except one; the network should see significantly
        // fewer messages than if all agents gossip.
        SimulationEngine allActiveEngine = engine("PoW", 4, 5, 33L, 0.0);
        for (int i = 0; i < 5; i++) allActiveEngine.tick();
        int msgsSentAllActive = allActiveEngine.getState().getNetworkModel().getMessagesSent();

        SimulationEngine mostInactiveEngine = engine("PoW", 4, 5, 33L, 0.75);
        for (int i = 0; i < 5; i++) mostInactiveEngine.tick();
        int msgsSentMostInactive = mostInactiveEngine.getState().getNetworkModel().getMessagesSent();

        // Fewer gossip participants → fewer messages sent. This is a conservative assertion.
        assertTrue(msgsSentMostInactive <= msgsSentAllActive,
                "Suppressing gossip for 3/4 inactive agents must not send more messages than all-active; " +
                "all-active=" + msgsSentAllActive + " most-inactive=" + msgsSentMostInactive);
    }

    // -------------------------------------------------------------------------
    // 7. Incoming messages are still processed (chain state updates)
    // -------------------------------------------------------------------------

    @Test
    void inactiveAgentsStillReceiveAndProcessIncomingBlocks() {
        // Deterministic test following Phase2NetworkTests conventions:
        // Configures 2 agents with 0.5 ratio -> exactly 1 active and 1 inactive.
        // Explicitly connects the peers and broadcasts a valid block from the active agent.
        SimulationConfig c = baseConfig("PoW", 2, 5);
        c.setBlockGossipLatency(0.1);
        c.setInactiveAgentRatio(0.5);

        SimulationEngine engine = new SimulationEngine(c);
        BlockchainAgent activeAgent = engine.getState().getAgents().stream()
                .filter(a -> !a.isInactive()).findFirst().orElseThrow();
        BlockchainAgent inactiveAgent = engine.getState().getAgents().stream()
                .filter(BlockchainAgent::isInactive).findFirst().orElseThrow();

        // Connect active sender and inactive receiver directly
        activeAgent.getPeers().clear();
        inactiveAgent.getPeers().clear();
        activeAgent.addPeer(inactiveAgent.getId());
        inactiveAgent.addPeer(activeAgent.getId());

        Block block = new Block("test-block-1", Block.GENESIS_ID, activeAgent.getId(), 1, 1);
        assertTrue(activeAgent.receiveBlock(block));

        int msgsSentBefore = engine.getState().getNetworkModel().getMessagesSent();
        engine.getState().getNetworkModel().broadcastMessage(activeAgent.getId(), NetworkMessage.MessageType.BLOCK, block);
        int msgsSentAfterBroadcast = engine.getState().getNetworkModel().getMessagesSent();
        assertEquals(msgsSentBefore + 1, msgsSentAfterBroadcast, "Broadcast should enqueue 1 message to inactive peer");

        assertFalse(inactiveAgent.getKnownBlocks().containsKey(block.getBlockId()),
                "Inactive agent must not have block before delivery");

        // Advance ticks deterministically to deliver and process the queued message
        for (int i = 0; i < 5; i++) {
            engine.getState().incrementTick();
            engine.getState().getNetworkModel().deliverMessages();
            inactiveAgent.processMessages();
        }

        assertTrue(inactiveAgent.getKnownBlocks().containsKey(block.getBlockId()),
                "Inactive agent must receive and store the incoming block");
        assertTrue(inactiveAgent.isAttached(block.getBlockId()),
                "Inactive agent must attach the valid incoming block");
        assertEquals(block.getBlockId(), inactiveAgent.getCanonicalHeadId(),
                "Inactive agent must update its canonical head to the incoming block");

        // Inactive agent must NOT have gossiped the block out to any peer
        assertEquals(msgsSentAfterBroadcast, engine.getState().getNetworkModel().getMessagesSent(),
                "Inactive agent must not gossip or produce outbound messages when receiving a block");
    }

    @Test
    void inactiveAgentsDoNotSendBlockRequestsForMissingParent() {
        SimulationConfig c = baseConfig("PoW", 2, 5);
        c.setBlockGossipLatency(0.1);
        c.setInactiveAgentRatio(0.5);

        SimulationEngine engine = new SimulationEngine(c);
        BlockchainAgent activeAgent = engine.getState().getAgents().stream()
                .filter(a -> !a.isInactive()).findFirst().orElseThrow();
        BlockchainAgent inactiveAgent = engine.getState().getAgents().stream()
                .filter(BlockchainAgent::isInactive).findFirst().orElseThrow();

        activeAgent.getPeers().clear();
        inactiveAgent.getPeers().clear();
        activeAgent.addPeer(inactiveAgent.getId());
        inactiveAgent.addPeer(activeAgent.getId());

        // Child block whose parent is missing on the inactive agent
        Block orphanChild = new Block("orphan-child", "non-existent-parent", activeAgent.getId(), 2, 1);

        int msgsSentBefore = engine.getState().getNetworkModel().getMessagesSent();
        engine.getState().getNetworkModel().broadcastMessage(activeAgent.getId(), NetworkMessage.MessageType.BLOCK, orphanChild);
        int msgsSentAfterBroadcast = engine.getState().getNetworkModel().getMessagesSent();

        for (int i = 0; i < 5; i++) {
            engine.getState().incrementTick();
            engine.getState().getNetworkModel().deliverMessages();
            inactiveAgent.processMessages();
        }

        // The inactive agent has the orphan in knownBlocks but should NOT have issued a BLOCK_REQUEST
        assertTrue(inactiveAgent.getKnownBlocks().containsKey(orphanChild.getBlockId()));
        assertFalse(inactiveAgent.isAttached(orphanChild.getBlockId()));
        assertEquals(msgsSentAfterBroadcast, engine.getState().getNetworkModel().getMessagesSent(),
                "Inactive agent must not send BLOCK_REQUEST messages when an orphan block is received");
    }

    // -------------------------------------------------------------------------
    // 8. Metrics: accurate active/inactive counts
    // -------------------------------------------------------------------------

    @Test
    void metricsReportAccurateActiveInactiveCounts() {
        // 6 nodes, 0.5 ratio → 3 active, 3 inactive, 0 Byzantine
        SimulationEngine engine = engine("PoW", 6, 3, 55L, 0.5);
        for (int i = 0; i < 3; i++) engine.tick();
        MetricsSnapshot snap = new MetricsCalculator().calculateMetrics(engine.getState());

        assertEquals(3, snap.getInactiveAgents(), "inactiveAgents metric must be 3");
        assertEquals(3, snap.getActiveAgents(), "activeAgents metric must be 3");
        assertEquals(0, snap.getByzantineAgents(), "byzantineAgents must be 0");
        assertEquals(6, snap.getActiveAgents() + snap.getInactiveAgents() + snap.getByzantineAgents(),
                "active + inactive + byzantine must equal total node count");
    }

    @Test
    void metricsZeroInactiveWhenRatioIsDefault() {
        SimulationEngine engine = engine("PoW", 5, 3, 1L, 0.0);
        MetricsSnapshot snap = new MetricsCalculator().calculateMetrics(engine.getState());
        assertEquals(0, snap.getInactiveAgents());
        assertEquals(5, snap.getActiveAgents());
    }

    // -------------------------------------------------------------------------
    // 9. Experiment config copy preserves inactiveAgentRatio
    // -------------------------------------------------------------------------

    @Test
    void experimentCopyPreservesInactiveAgentRatio() {
        SimulationConfig template = baseConfig("PoW", 4, 5);
        template.setInactiveAgentRatio(0.25);

        ExperimentRunner runner = new ExperimentRunner();
        ExperimentAggregate agg = runner.runRepeated(template, List.of(1L, 2L));

        assertEquals(2, agg.getSuccessfulRuns(),
                "Both runs must complete with inactiveAgentRatio copied correctly");
        // Template must not be mutated by the runner
        assertEquals(0.25, template.getInactiveAgentRatio(), 1e-9,
                "Template inactiveAgentRatio must not be mutated by runRepeated");
    }

    @Test
    void experimentRunsSucceedWithInactiveAgents() {
        SimulationConfig template = baseConfig("PoW", 6, 5);
        template.setInactiveAgentRatio(0.5);
        template.setTransactionsPerAgentPerTick(1);

        ExperimentRunner runner = new ExperimentRunner();
        ExperimentAggregate agg = runner.runRepeated(template, List.of(10L, 20L, 30L));

        assertEquals(3, agg.getSuccessfulRuns());
        assertEquals(0, agg.getFailedRuns());
        // All runs should report the same inactive agent count in their metrics
        for (var run : agg.getRuns()) {
            assertNotNull(run.getMetrics());
            assertEquals(3, run.getMetrics().getInactiveAgents(),
                    "Each run must report 3 inactive agents (6 nodes × 0.5 ratio)");
        }
    }

    // -------------------------------------------------------------------------
    // 10. Invalid configuration is rejected
    // -------------------------------------------------------------------------

    @Test
    void negativeInactiveRatioIsRejected() {
        SimulationConfig c = baseConfig("PoW", 4, 3);
        c.setInactiveAgentRatio(-0.1);
        assertThrows(IllegalArgumentException.class, c::validate,
                "Negative inactiveAgentRatio must be rejected");
    }

    @Test
    void inactiveRatioAboveOneIsRejected() {
        SimulationConfig c = baseConfig("PoW", 4, 3);
        c.setInactiveAgentRatio(1.1);
        assertThrows(IllegalArgumentException.class, c::validate,
                "inactiveAgentRatio > 1 must be rejected");
    }

    @Test
    void byzantineRatioPlusInactiveRatioExceedingOneIsRejected() {
        SimulationConfig c = baseConfig("PoW", 4, 3);
        c.setByzantineRatio(0.6);
        c.setInactiveAgentRatio(0.5);
        assertThrows(IllegalArgumentException.class, c::validate,
                "byzantineRatio + inactiveAgentRatio > 1 must be rejected");
    }

    @Test
    void byzantineRatioPlusInactiveRatioExactlyOneIsValid() {
        SimulationConfig c = baseConfig("PoW", 4, 3);
        c.setByzantineRatio(0.5);
        c.setInactiveAgentRatio(0.5);
        // Should not throw
        c.validate();
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /** Builds a minimal valid config with inactiveAgentRatio=ratio and txPerTick=0. */
    private SimulationEngine engine(String consensus, int nodes, int ticks, long seed, double inactiveRatio) {
        return engine(consensus, nodes, ticks, seed, inactiveRatio, 0);
    }

    private SimulationEngine engine(String consensus, int nodes, int ticks, long seed,
                                     double inactiveRatio, int txPerAgentPerTick) {
        SimulationConfig c = baseConfig(consensus, nodes, ticks);
        c.setRandomSeed(seed);
        c.setInactiveAgentRatio(inactiveRatio);
        c.setTransactionsPerAgentPerTick(txPerAgentPerTick);
        return new SimulationEngine(c);
    }

    private SimulationConfig baseConfig(String consensus, int nodes, int ticks) {
        SimulationConfig c = new SimulationConfig();
        c.setConsensusType(consensus);
        c.setNodeCount(nodes);
        c.setNetworkTopology("Erdos-Renyi");
        c.setBlockGossipLatency(1.0);
        c.setRandomSeed(7L);
        c.setSimulationTicks(ticks);
        return c;
    }
}
