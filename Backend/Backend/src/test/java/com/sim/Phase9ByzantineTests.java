package com.sim;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

import com.sim.agent.BlockchainAgent;
import com.sim.agent.ByzantineNodeAgent;
import com.sim.blockchain.Attestation;
import com.sim.blockchain.Block;
import com.sim.consensus.ConsensusStrategy;
import com.sim.engine.SimulationEngine;
import com.sim.experiment.ExperimentAggregate;
import com.sim.experiment.ExperimentRunner;
import com.sim.metrics.MetricsCalculator;
import com.sim.metrics.MetricsSnapshot;
import com.sim.model.SimulationConfig;
import com.sim.network.NetworkMessage;

/**
 * Phase 9: Configurable, deterministic Byzantine agent behaviour tests.
 *
 * Covers:
 *  - Default configuration preserves honest baseline (ratio 0.0, enabled false, mode EQUIVOCATION)
 *  - Configured ratio produces exact Byzantine count
 *  - Deterministic agent assignment across identical seeds and configs
 *  - Deterministic attack decisions for identical seeds
 *  - Explicit attack mode: BLOCK_WITHHOLDING suppresses network broadcast
 *  - Withheld block release propagates correctly to peers
 *  - Explicit attack mode: INVALID_BLOCK routes through network and is rejected by honest peers
 *  - Explicit attack mode: EQUIVOCATION targets non-canonical attached blocks in PoS
 *  - Explicit attack mode: NONE behaves honestly despite enablement flag
 *  - byzantineBehaviorEnabled=false ignores configured attack modes
 *  - Validation: reject invalid and blank attack modes
 *  - Validation: reject byzantineRatio < 0 or > 1
 *  - Validation: reject byzantineRatio + inactiveAgentRatio > 1
 *  - Validation: accept byzantineRatio + inactiveAgentRatio == 1.0
 *  - ExperimentRunner preserves byzantineAttackMode in copy()
 *  - Accurate metrics reporting (maliciousActionsAttempted, blocksWithheld, conflictingAttestations)
 *  - Compatibility across all 5 consensus strategies (PoW, PoS, DPoS, PoA, PoL)
 */
class Phase9ByzantineTests {

    // -------------------------------------------------------------------------
    // 1. Default configuration & baseline preservation
    // -------------------------------------------------------------------------

    @Test
    void defaultConfigurationPreservesExistingHonestBehaviour() {
        SimulationConfig c = baseConfig("PoW", 6, 3);
        assertEquals(0.0, c.getByzantineRatio(), 1e-9);
        assertFalse(c.isByzantineBehaviorEnabled());
        assertEquals("EQUIVOCATION", c.getByzantineAttackMode());

        SimulationEngine engine = new SimulationEngine(c);
        long byzantineCount = engine.getState().getAgents().stream()
                .filter(a -> a instanceof ByzantineNodeAgent).count();
        assertEquals(0, byzantineCount, "Default byzantineRatio=0 must instantiate 0 ByzantineNodeAgents");

        MetricsSnapshot metrics = new MetricsCalculator().calculateMetrics(engine.getState());
        assertEquals(0, metrics.getByzantineAgents());
        assertEquals(6, metrics.getActiveAgents());
        assertEquals(0, metrics.getMaliciousActionsAttempted());
        assertEquals(0, metrics.getBlocksWithheld());
        assertEquals(0, metrics.getConflictingAttestations());
    }

    // -------------------------------------------------------------------------
    // 2. Configured ratio produces exact Byzantine count
    // -------------------------------------------------------------------------

    @Test
    void byzantineAgentRatioProducesExpectedCount() {
        // 10 agents, 0.4 ratio -> exactly 4 Byzantine agents
        SimulationConfig c = baseConfig("PoW", 10, 3);
        c.setByzantineRatio(0.4);
        SimulationEngine engine = new SimulationEngine(c);

        long byzantineCount = engine.getState().getAgents().stream()
                .filter(a -> a instanceof ByzantineNodeAgent).count();
        assertEquals(4, byzantineCount);

        long honestCount = engine.getState().getAgents().stream()
                .filter(a -> !(a instanceof ByzantineNodeAgent)).count();
        assertEquals(6, honestCount);
    }

    // -------------------------------------------------------------------------
    // 3. Deterministic assignment and attack decisions
    // -------------------------------------------------------------------------

    @Test
    void deterministicAssignmentForSameSeedAndConfig() {
        SimulationConfig c1 = baseConfig("PoW", 8, 3);
        c1.setRandomSeed(12345L);
        c1.setByzantineRatio(0.375); // 3 out of 8

        SimulationConfig c2 = baseConfig("PoW", 8, 3);
        c2.setRandomSeed(12345L);
        c2.setByzantineRatio(0.375);

        SimulationEngine e1 = new SimulationEngine(c1);
        SimulationEngine e2 = new SimulationEngine(c2);

        List<String> byz1 = e1.getState().getAgents().stream()
                .filter(a -> a instanceof ByzantineNodeAgent)
                .map(BlockchainAgent::getId).toList();
        List<String> byz2 = e2.getState().getAgents().stream()
                .filter(a -> a instanceof ByzantineNodeAgent)
                .map(BlockchainAgent::getId).toList();

        assertEquals(byz1, byz2, "Identical seeds must produce identical Byzantine agent IDs");
        assertEquals(List.of("Agent-0", "Agent-1", "Agent-2"), byz1);
    }

    @Test
    void deterministicAttackDecisionsForSameSeed() {
        SimulationConfig c1 = baseConfig("PoS", 2, 5);
        c1.setRandomSeed(42L);
        c1.setByzantineRatio(1.0);
        c1.setByzantineBehaviorEnabled(true);
        c1.setByzantineAttackMode("EQUIVOCATION");

        SimulationConfig c2 = baseConfig("PoS", 2, 5);
        c2.setRandomSeed(42L);
        c2.setByzantineRatio(1.0);
        c2.setByzantineBehaviorEnabled(true);
        c2.setByzantineAttackMode("EQUIVOCATION");

        SimulationEngine e1 = new SimulationEngine(c1);
        SimulationEngine e2 = new SimulationEngine(c2);

        ByzantineNodeAgent a1 = (ByzantineNodeAgent) e1.getState().getAgents().get(0);
        ByzantineNodeAgent a2 = (ByzantineNodeAgent) e2.getState().getAgents().get(0);

        Block b1 = new Block("alt-block", Block.GENESIS_ID, a1.getId(), 1, 1);
        Block b2 = new Block("alt-block", Block.GENESIS_ID, a2.getId(), 1, 1);
        a1.receiveBlock(b1);
        a2.receiveBlock(b2);

        Attestation att1 = a1.createAttestation(1, 1);
        Attestation att2 = a2.createAttestation(1, 1);

        assertNotNull(att1);
        assertNotNull(att2);
        assertEquals(att1.getBlockId(), att2.getBlockId(),
                "Deterministic seed must reproduce identical attack target decisions");
        assertEquals(att1.getAttestationId(), att2.getAttestationId());
    }

    // -------------------------------------------------------------------------
    // 4. Attack mode: BLOCK_WITHHOLDING
    // -------------------------------------------------------------------------

    @Test
    void blockWithholdingModeSuppressesNetworkBroadcast() {
        SimulationConfig c = baseConfig("PoW", 2, 5);
        c.setByzantineRatio(0.5); // Agent-0: Byzantine, Agent-1: honest
        c.setByzantineBehaviorEnabled(true);
        c.setByzantineAttackMode("BLOCK_WITHHOLDING");
        c.setBlockGossipLatency(0.1);

        SimulationEngine engine = new SimulationEngine(c);
        ByzantineNodeAgent byzantine = (ByzantineNodeAgent) engine.getState().getAgents().get(0);
        BlockchainAgent honest = engine.getState().getAgents().get(1);

        // Connect peers
        byzantine.getPeers().clear();
        honest.getPeers().clear();
        byzantine.addPeer(honest.getId());
        honest.addPeer(byzantine.getId());

        int msgsBefore = engine.getState().getNetworkModel().getMessagesSent();

        // Have Byzantine node produce a block via PoW consensus strategy
        ConsensusStrategy pow = ConsensusStrategy.create("PoW");
        // Force block production on byzantine agent
        Block parent = byzantine.getHighestBlock();
        Block block = new Block("withheld-1", parent.getBlockId(), byzantine.getId(), 1, 1);
        assertTrue(byzantine.receiveBlock(block));
        assertTrue(byzantine.shouldWithholdBlock(block));

        byzantine.onBlockWithheld(block);

        assertEquals(1, byzantine.getBlocksWithheld());
        assertEquals(1, byzantine.getMaliciousActionsAttempted());
        assertEquals(msgsBefore, engine.getState().getNetworkModel().getMessagesSent(),
                "Withheld block must not generate broadcast messages to network");

        // Honest node does not know about the withheld block
        assertFalse(honest.getKnownBlocks().containsKey("withheld-1"));
    }

    @Test
    void withheldBlocksCanBeReleasedAndPropagated() {
        SimulationConfig c = baseConfig("PoW", 2, 5);
        c.setByzantineRatio(0.5);
        c.setByzantineBehaviorEnabled(true);
        c.setByzantineAttackMode("BLOCK_WITHHOLDING");
        c.setBlockGossipLatency(0.1);

        SimulationEngine engine = new SimulationEngine(c);
        ByzantineNodeAgent byzantine = (ByzantineNodeAgent) engine.getState().getAgents().get(0);
        BlockchainAgent honest = engine.getState().getAgents().get(1);

        byzantine.getPeers().clear();
        honest.getPeers().clear();
        byzantine.addPeer(honest.getId());
        honest.addPeer(byzantine.getId());

        Block block = new Block("withheld-release-test", Block.GENESIS_ID, byzantine.getId(), 1, 1);
        assertTrue(byzantine.receiveBlock(block));
        byzantine.onBlockWithheld(block);
        assertEquals(1, byzantine.getWithheldBlocksList().size());

        // Release the withheld block
        byzantine.releaseWithheldBlocks();
        assertEquals(0, byzantine.getWithheldBlocksList().size(), "Withheld blocks list should be empty after release");

        // Advance 5 ticks to deliver and process
        for (int i = 0; i < 5; i++) {
            engine.getState().incrementTick();
            engine.getState().getNetworkModel().deliverMessages();
            honest.processMessages();
        }

        assertTrue(honest.getKnownBlocks().containsKey("withheld-release-test"),
                "Honest agent must receive the released block");
        assertTrue(honest.isAttached("withheld-release-test"));
    }

    // -------------------------------------------------------------------------
    // 5. Attack mode: INVALID_BLOCK
    // -------------------------------------------------------------------------

    @Test
    void invalidBlockModeBroadcastsAndIsRejectedByPeers() {
        SimulationConfig c = baseConfig("PoW", 2, 5);
        c.setByzantineRatio(0.5);
        c.setByzantineBehaviorEnabled(true);
        c.setByzantineAttackMode("INVALID_BLOCK");
        c.setBlockGossipLatency(0.1);

        SimulationEngine engine = new SimulationEngine(c);
        ByzantineNodeAgent byzantine = (ByzantineNodeAgent) engine.getState().getAgents().get(0);
        BlockchainAgent honest = engine.getState().getAgents().get(1);

        byzantine.getPeers().clear();
        honest.getPeers().clear();
        byzantine.addPeer(honest.getId());
        honest.addPeer(byzantine.getId());

        assertTrue(byzantine.shouldProposeInvalidBlock());
        boolean accepted = byzantine.proposeInvalidBlock(engine.getState());
        assertFalse(accepted, "Proposing invalid block should return false locally");
        assertEquals(1, byzantine.getMaliciousActionsAttempted());

        // Deliver messages to honest node
        for (int i = 0; i < 5; i++) {
            engine.getState().incrementTick();
            engine.getState().getNetworkModel().deliverMessages();
            honest.processMessages();
        }

        // Honest node rejects invalid block through standard validation path
        assertEquals(1, honest.getBlocksRejected(),
                "Honest agent must reject the structurally invalid block");
    }

    // -------------------------------------------------------------------------
    // 6. Attack mode: EQUIVOCATION
    // -------------------------------------------------------------------------

    @Test
    void equivocationModeProducesConflictingAttestation() {
        SimulationConfig c = baseConfig("PoS", 2, 5);
        c.setByzantineRatio(0.5);
        c.setByzantineBehaviorEnabled(true);
        c.setByzantineAttackMode("EQUIVOCATION");

        SimulationEngine engine = new SimulationEngine(c);
        ByzantineNodeAgent byzantine = (ByzantineNodeAgent) engine.getState().getAgents().get(0);

        Block b1 = new Block("branch-1", Block.GENESIS_ID, byzantine.getId(), 1, 1);
        Block b2 = new Block("branch-2", Block.GENESIS_ID, byzantine.getId(), 1, 1);
        assertTrue(byzantine.receiveBlock(b1));
        assertTrue(byzantine.receiveBlock(b2));

        Attestation att = byzantine.createAttestation(1, 1);
        assertNotNull(att);
        assertEquals(1, byzantine.getConflictingAttestations());
        assertEquals(1, byzantine.getMaliciousActionsAttempted());
        assertTrue(att.getAttestationId().contains("byzantine-attestation"));
    }

    @Test
    void conflictingAttestationReachesPeerAndInfluencesForkChoice() {
        SimulationConfig c = baseConfig("PoS", 2, 5);
        c.setByzantineRatio(0.5);
        c.setByzantineBehaviorEnabled(true);
        c.setByzantineAttackMode("EQUIVOCATION");
        c.setBlockGossipLatency(0.1);

        SimulationEngine engine = new SimulationEngine(c);
        ByzantineNodeAgent byzantine = (ByzantineNodeAgent) engine.getState().getAgents().get(0);
        BlockchainAgent honest = engine.getState().getAgents().get(1);

        // Assign stake so Byzantine node has higher weight
        byzantine.setStake(100.0);
        honest.setStake(10.0);

        // Connect peers directly
        byzantine.getPeers().clear();
        honest.getPeers().clear();
        byzantine.addPeer(honest.getId());
        honest.addPeer(byzantine.getId());

        // Create two attached sibling branches at height 1
        Block branchA = new Block("branch-A", Block.GENESIS_ID, honest.getId(), 1, 1);
        Block branchB = new Block("branch-B", Block.GENESIS_ID, byzantine.getId(), 1, 1);
        assertTrue(byzantine.receiveBlock(branchA));
        assertTrue(byzantine.receiveBlock(branchB));
        assertTrue(honest.receiveBlock(branchA));
        assertTrue(honest.receiveBlock(branchB));

        // Honest agent attests to branch-A at tick 1
        Attestation honestAtt = new Attestation("honest-att-1", honest.getId(), "branch-A", 1, 1);
        assertTrue(honest.receiveAttestation(honestAtt));
        assertEquals("branch-A", honest.getCanonicalHeadId());

        // Byzantine agent in EQUIVOCATION mode generates an attestation targeting branch-B
        String byzAttId = byzantine.getId() + "-byzantine-attestation-1-2-branch-B";
        Attestation byzAtt = new Attestation(byzAttId, byzantine.getId(), "branch-B", 1, 2);
        assertTrue(byzantine.receiveAttestation(byzAtt));

        // Broadcast to honest peer via network model
        engine.getState().getNetworkModel().broadcastMessage(
                byzantine.getId(), NetworkMessage.MessageType.ATTESTATION, byzAtt);

        // Advance ticks so message is delivered and processed by honest agent
        for (int i = 0; i < 5; i++) {
            engine.getState().incrementTick();
            engine.getState().getNetworkModel().deliverMessages();
            honest.processMessages();
        }

        // 1. Conflicting attestation reached honest peer and is stored in knownAttestations
        assertTrue(honest.getKnownAttestations().containsKey(byzAttId),
                "Conflicting attestation must reach honest peer's storage");

        // 2. Conflicting attestation is recorded in latestAttestationsByValidator
        assertEquals("branch-B", honest.getLatestAttestations().get(byzantine.getId()).getBlockId(),
                "Honest peer must track the validator's latest attestation");

        // 3. Fork choice (LMD-GHOST) evaluates the Byzantine validator's stake weight towards branch-B
        // Since Byzantine stake (100.0) > Honest stake (10.0), branch-B becomes the heavier canonical head
        assertEquals("branch-B", honest.getCanonicalHeadId(),
                "Conflicting Byzantine attestation must influence honest peer's LMD-GHOST fork choice");
    }

    // -------------------------------------------------------------------------
    // 7. Attack mode: NONE & disabled behavior
    // -------------------------------------------------------------------------

    @Test
    void noneModeBehavesCompletelyHonestly() {
        SimulationConfig c = baseConfig("PoS", 2, 5);
        c.setByzantineRatio(0.5);
        c.setByzantineBehaviorEnabled(true);
        c.setByzantineAttackMode("NONE");

        SimulationEngine engine = new SimulationEngine(c);
        ByzantineNodeAgent byzantine = (ByzantineNodeAgent) engine.getState().getAgents().get(0);

        assertFalse(byzantine.shouldWithholdBlock(new Block("b", Block.GENESIS_ID, byzantine.getId(), 1, 1)));
        assertFalse(byzantine.shouldProposeInvalidBlock());

        // createAttestation targets canonical head honestly
        Attestation att = byzantine.createAttestation(1, 1);
        assertNotNull(att);
        assertEquals(Block.GENESIS_ID, att.getBlockId());
        assertEquals(0, byzantine.getMaliciousActionsAttempted());
    }

    @Test
    void byzantineBehaviorDisabledIgnoresAttackMode() {
        SimulationConfig c = baseConfig("PoW", 2, 5);
        c.setByzantineRatio(0.5);
        c.setByzantineBehaviorEnabled(false); // Disabled
        c.setByzantineAttackMode("BLOCK_WITHHOLDING");

        SimulationEngine engine = new SimulationEngine(c);
        ByzantineNodeAgent byzantine = (ByzantineNodeAgent) engine.getState().getAgents().get(0);

        assertFalse(byzantine.isByzantineBehaviorEnabled());
        assertFalse(byzantine.shouldWithholdBlock(new Block("b", Block.GENESIS_ID, byzantine.getId(), 1, 1)));
        assertFalse(byzantine.shouldProposeInvalidBlock());
        assertEquals(0, byzantine.getMaliciousActionsAttempted());
    }

    // -------------------------------------------------------------------------
    // 8. Configuration validation
    // -------------------------------------------------------------------------

    @Test
    void invalidAttackModeIsRejected() {
        SimulationConfig c = baseConfig("PoW", 4, 3);
        c.setByzantineAttackMode("EXPLOIT_NETWORK");
        assertThrows(IllegalArgumentException.class, c::validate,
                "Unknown attack mode must be rejected");
    }

    @Test
    void blankAttackModeIsRejected() {
        SimulationConfig c = baseConfig("PoW", 4, 3);
        c.setByzantineAttackMode("  ");
        assertThrows(IllegalArgumentException.class, c::validate);
    }

    @Test
    void nullAttackModeIsRejected() {
        SimulationConfig c = baseConfig("PoW", 4, 3);
        c.setByzantineAttackMode(null);
        assertThrows(IllegalArgumentException.class, c::validate);
    }

    @Test
    void byzantineRatioBelowZeroOrAboveOneIsRejected() {
        SimulationConfig c = baseConfig("PoW", 4, 3);
        c.setByzantineRatio(-0.1);
        assertThrows(IllegalArgumentException.class, c::validate);

        c.setByzantineRatio(1.05);
        assertThrows(IllegalArgumentException.class, c::validate);
    }

    @Test
    void byzantinePlusInactiveExceedingCapacityIsRejected() {
        SimulationConfig c = baseConfig("PoW", 4, 3);
        c.setByzantineRatio(0.6);
        c.setInactiveAgentRatio(0.45);
        assertThrows(IllegalArgumentException.class, c::validate,
                "byzantineRatio + inactiveAgentRatio > 1.0 must be rejected");
    }

    @Test
    void byzantinePlusInactiveSummingToOneIsValid() {
        SimulationConfig c = baseConfig("PoW", 4, 3);
        c.setByzantineRatio(0.4);
        c.setInactiveAgentRatio(0.6);
        c.validate(); // Should not throw
    }

    // -------------------------------------------------------------------------
    // 9. Experiment configuration copying & metrics aggregation
    // -------------------------------------------------------------------------

    @Test
    void experimentRunnerPreservesByzantineAttackMode() {
        SimulationConfig template = baseConfig("PoW", 4, 5);
        template.setByzantineRatio(0.25);
        template.setByzantineBehaviorEnabled(true);
        template.setByzantineAttackMode("BLOCK_WITHHOLDING");

        ExperimentRunner runner = new ExperimentRunner();
        ExperimentAggregate agg = runner.runRepeated(template, List.of(100L, 200L));

        assertEquals(2, agg.getSuccessfulRuns());
        assertEquals("BLOCK_WITHHOLDING", template.getByzantineAttackMode());
        for (var run : agg.getRuns()) {
            assertNotNull(run.getMetrics());
            assertEquals(1, run.getMetrics().getByzantineAgents(),
                    "Each run must have 1 Byzantine agent (4 nodes × 0.25)");
        }
    }

    @Test
    void metricsSnapshotAccuratelyCalculatesByzantineMetrics() {
        SimulationConfig c = baseConfig("PoW", 4, 5);
        c.setByzantineRatio(0.5); // 2 Byzantine, 2 active
        c.setByzantineBehaviorEnabled(true);
        c.setByzantineAttackMode("BLOCK_WITHHOLDING");

        SimulationEngine engine = new SimulationEngine(c);
        ByzantineNodeAgent byz1 = (ByzantineNodeAgent) engine.getState().getAgents().get(0);
        ByzantineNodeAgent byz2 = (ByzantineNodeAgent) engine.getState().getAgents().get(1);

        Block b1 = new Block("b-withheld-1", Block.GENESIS_ID, byz1.getId(), 1, 1);
        Block b2 = new Block("b-withheld-2", Block.GENESIS_ID, byz2.getId(), 1, 1);
        byz1.receiveBlock(b1);
        byz2.receiveBlock(b2);
        byz1.onBlockWithheld(b1);
        byz2.onBlockWithheld(b2);

        MetricsSnapshot metrics = new MetricsCalculator().calculateMetrics(engine.getState());
        assertEquals(2, metrics.getByzantineAgents());
        assertEquals(2, metrics.getActiveAgents());
        assertEquals(2, metrics.getBlocksWithheld());
        assertEquals(2, metrics.getMaliciousActionsAttempted());
        assertEquals(0, metrics.getConflictingAttestations());
    }

    // -------------------------------------------------------------------------
    // 10. Compatibility with all 5 consensus strategies
    // -------------------------------------------------------------------------

    @Test
    void allFiveConsensusStrategiesCompatibleWithByzantineAgents() {
        String[] strategies = {"PoW", "PoS", "DPoS", "PoA", "PoL"};
        for (String strategy : strategies) {
            SimulationConfig c = baseConfig(strategy, 4, 3);
            c.setByzantineRatio(0.25);
            c.setByzantineBehaviorEnabled(true);
            c.setByzantineAttackMode("BLOCK_WITHHOLDING");
            if ("PoA".equals(strategy)) {
                c.setAuthorityIds(List.of("Agent-0", "Agent-1"));
            }

            SimulationEngine engine = new SimulationEngine(c);
            for (int t = 0; t < 3; t++) {
                engine.tick();
            }

            MetricsSnapshot snapshot = engine.getMetricsSnapshot();
            assertNotNull(snapshot, strategy + " must produce a valid metrics snapshot with Byzantine agents");
            assertEquals(1, snapshot.getByzantineAgents(), strategy + " must have 1 Byzantine agent");
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private SimulationConfig baseConfig(String consensus, int nodes, int ticks) {
        SimulationConfig c = new SimulationConfig();
        c.setConsensusType(consensus);
        c.setNodeCount(nodes);
        c.setNetworkTopology("Erdos-Renyi");
        c.setBlockGossipLatency(1.0);
        c.setRandomSeed(42L);
        c.setSimulationTicks(ticks);
        c.setByzantineRatio(0.0);
        c.setByzantineBehaviorEnabled(false);
        c.setByzantineAttackMode("EQUIVOCATION");
        return c;
    }
}
