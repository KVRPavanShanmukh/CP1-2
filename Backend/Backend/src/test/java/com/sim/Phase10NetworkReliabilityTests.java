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
import com.sim.experiment.ExperimentRunResult;
import com.sim.experiment.ExperimentRunner;
import com.sim.metrics.MetricsSnapshot;
import com.sim.model.SimulationConfig;
import com.sim.network.NetworkMessage;

class Phase10NetworkReliabilityTests {

    private SimulationConfig baseConfig(String consensus, int nodes, int ticks) {
        SimulationConfig config = new SimulationConfig();
        config.setNodeCount(nodes);
        config.setConsensusType(consensus);
        config.setNetworkTopology("Erdos-Renyi");
        config.setBlockGossipLatency(0.1);
        config.setSlotDuration(1.0);
        config.setSimulationTicks(ticks);
        config.setRandomSeed(42L);
        return config;
    }

    private void connectOnly(BlockchainAgent a, BlockchainAgent b) {
        a.getPeers().clear();
        b.getPeers().clear();
        a.addPeer(b.getId());
        b.addPeer(a.getId());
    }

    private void advance(SimulationEngine engine, int ticks) {
        for (int i = 0; i < ticks; i++) {
            engine.getState().incrementTick();
            engine.getState().getNetworkModel().deliverMessages();
            for (BlockchainAgent agent : engine.getState().getAgents()) {
                agent.processMessages();
            }
        }
    }

    // -------------------------------------------------------------------------
    // 1. Defaults and Backward Compatibility
    // -------------------------------------------------------------------------

    @Test
    void defaultConfigurationPreservesZeroPacketLossAndDisabledPartition() {
        SimulationConfig config = baseConfig("PoW", 2, 5);
        config.validate();

        assertEquals(0.0, config.getPacketLossRate());
        assertEquals(2, config.getNetworkLatencyJitter());
        assertEquals(0.0, config.getPartitionRatio());
        assertEquals(-1, config.getPartitionStartTick());
        assertEquals(-1, config.getPartitionEndTick());
        assertTrue(config.getPartitionGroupA().isEmpty());
        assertTrue(config.getPartitionGroupB().isEmpty());

        SimulationEngine engine = new SimulationEngine(config);
        assertFalse(engine.getState().getNetworkModel().isPartitionActive());
        assertEquals(0, engine.getState().getNetworkModel().getMessagesDropped());
    }

    // -------------------------------------------------------------------------
    // 2. Validation
    // -------------------------------------------------------------------------

    @Test
    void validationRejectsInvalidPacketLossRate() {
        SimulationConfig c1 = baseConfig("PoW", 2, 5);
        c1.setPacketLossRate(-0.1);
        assertThrows(IllegalArgumentException.class, c1::validate);

        SimulationConfig c2 = baseConfig("PoW", 2, 5);
        c2.setPacketLossRate(1.1);
        assertThrows(IllegalArgumentException.class, c2::validate);
    }

    @Test
    void validationRejectsNegativeLatencyJitter() {
        SimulationConfig config = baseConfig("PoW", 2, 5);
        config.setNetworkLatencyJitter(-1);
        assertThrows(IllegalArgumentException.class, config::validate);
    }

    @Test
    void validationRejectsInvalidPartitionRatio() {
        SimulationConfig c1 = baseConfig("PoW", 2, 5);
        c1.setPartitionRatio(-0.5);
        assertThrows(IllegalArgumentException.class, c1::validate);

        SimulationConfig c2 = baseConfig("PoW", 2, 5);
        c2.setPartitionRatio(1.5);
        assertThrows(IllegalArgumentException.class, c2::validate);
    }

    @Test
    void validationRejectsInvertedPartitionSchedule() {
        SimulationConfig config = baseConfig("PoW", 2, 5);
        config.setPartitionStartTick(10);
        config.setPartitionEndTick(5);
        assertThrows(IllegalArgumentException.class, config::validate);
    }

    // -------------------------------------------------------------------------
    // 3. Message Latency & Jitter Control
    // -------------------------------------------------------------------------

    @Test
    void zeroLatencyJitterDeliversExactlyAtConfiguredLatencyTicks() {
        SimulationConfig config = baseConfig("PoW", 2, 10);
        // 0.5s * 10 = 5 ticks latency
        config.setBlockGossipLatency(0.5);
        config.setNetworkLatencyJitter(0); // Zero jitter: deterministic delay of exactly 5 ticks

        SimulationEngine engine = new SimulationEngine(config);
        BlockchainAgent sender = engine.getState().getAgents().get(0);
        BlockchainAgent receiver = engine.getState().getAgents().get(1);
        connectOnly(sender, receiver);

        Block block = new Block("exact-delay-block", Block.GENESIS_ID, sender.getId(), 1, 1);
        assertTrue(sender.receiveBlock(block));

        // Send at tick 0 -> delivery tick must be exactly 0 + 5 = 5
        engine.getState().getNetworkModel().broadcastMessage(sender.getId(), NetworkMessage.MessageType.BLOCK, block);
        assertEquals(1, engine.getState().getNetworkModel().getMessagesSent());
        assertEquals(1, engine.getState().getNetworkModel().getQueuedMessages());

        // Advance 4 ticks (tick 1, 2, 3, 4) -> message should NOT be delivered yet
        for (int i = 0; i < 4; i++) {
            engine.getState().incrementTick();
            engine.getState().getNetworkModel().deliverMessages();
            receiver.processMessages();
        }
        assertFalse(receiver.getKnownBlocks().containsKey(block.getBlockId()));
        assertEquals(0, engine.getState().getNetworkModel().getMessagesDelivered());

        // Advance to tick 5 -> message MUST be delivered now
        engine.getState().incrementTick();
        assertEquals(5, engine.getState().getCurrentTick());
        engine.getState().getNetworkModel().deliverMessages();
        receiver.processMessages();

        assertTrue(receiver.getKnownBlocks().containsKey(block.getBlockId()));
        assertEquals(1, engine.getState().getNetworkModel().getMessagesDelivered());
    }

    // -------------------------------------------------------------------------
    // 4. Packet Loss
    // -------------------------------------------------------------------------

    @Test
    void totalPacketLossDropsAllMessagesWithoutDelivery() {
        SimulationConfig config = baseConfig("PoW", 2, 10);
        config.setPacketLossRate(1.0); // 100% loss

        SimulationEngine engine = new SimulationEngine(config);
        BlockchainAgent sender = engine.getState().getAgents().get(0);
        BlockchainAgent receiver = engine.getState().getAgents().get(1);
        connectOnly(sender, receiver);

        Block block = new Block("dropped-block", Block.GENESIS_ID, sender.getId(), 1, 1);
        assertTrue(sender.receiveBlock(block));

        engine.getState().getNetworkModel().broadcastMessage(sender.getId(), NetworkMessage.MessageType.BLOCK, block);
        assertEquals(1, engine.getState().getNetworkModel().getMessagesSent());
        assertEquals(1, engine.getState().getNetworkModel().getMessagesDropped());
        assertEquals(0, engine.getState().getNetworkModel().getQueuedMessages());

        advance(engine, 10);

        assertFalse(receiver.getKnownBlocks().containsKey(block.getBlockId()));
        assertEquals(0, engine.getState().getNetworkModel().getMessagesDelivered());
    }

    @Test
    void partialPacketLossIsDeterministicUnderSameSeed() {
        SimulationConfig c1 = baseConfig("PoW", 2, 10);
        c1.setPacketLossRate(0.5);
        c1.setRandomSeed(12345L);

        SimulationConfig c2 = baseConfig("PoW", 2, 10);
        c2.setPacketLossRate(0.5);
        c2.setRandomSeed(12345L);

        SimulationEngine engine1 = new SimulationEngine(c1);
        SimulationEngine engine2 = new SimulationEngine(c2);

        connectOnly(engine1.getState().getAgents().get(0), engine1.getState().getAgents().get(1));
        connectOnly(engine2.getState().getAgents().get(0), engine2.getState().getAgents().get(1));

        for (int i = 0; i < 20; i++) {
            Block b1 = new Block("b-" + i, Block.GENESIS_ID, "Agent-0", 1, 1);
            Block b2 = new Block("b-" + i, Block.GENESIS_ID, "Agent-0", 1, 1);
            engine1.getState().getNetworkModel().sendMessage("Agent-0", "Agent-1", NetworkMessage.MessageType.BLOCK, b1);
            engine2.getState().getNetworkModel().sendMessage("Agent-0", "Agent-1", NetworkMessage.MessageType.BLOCK, b2);
        }

        assertEquals(engine1.getState().getNetworkModel().getMessagesDropped(),
                     engine2.getState().getNetworkModel().getMessagesDropped());
        assertEquals(engine1.getState().getNetworkModel().getMessagesSent(),
                     engine2.getState().getNetworkModel().getMessagesSent());
    }

    @Test
    void droppedMessagesAreNeverDeliveredLater() {
        SimulationConfig config = baseConfig("PoW", 2, 20);
        config.setPacketLossRate(1.0);

        SimulationEngine engine = new SimulationEngine(config);
        BlockchainAgent sender = engine.getState().getAgents().get(0);
        BlockchainAgent receiver = engine.getState().getAgents().get(1);
        connectOnly(sender, receiver);

        Block block = new Block("lost-forever", Block.GENESIS_ID, sender.getId(), 1, 1);
        engine.getState().getNetworkModel().broadcastMessage(sender.getId(), NetworkMessage.MessageType.BLOCK, block);

        // Advance 20 ticks
        advance(engine, 20);

        assertEquals(0, engine.getState().getNetworkModel().getMessagesDelivered());
        assertEquals(0, engine.getState().getNetworkModel().getQueuedMessages());
        assertEquals(1, engine.getState().getNetworkModel().getMessagesDropped());
        assertFalse(receiver.getKnownBlocks().containsKey(block.getBlockId()));
    }

    // -------------------------------------------------------------------------
    // 5. Network Partitions
    // -------------------------------------------------------------------------

    @Test
    void networkPartitionBlocksCrossPartitionMessagesWhileAllowingIntraPartition() {
        SimulationConfig config = baseConfig("PoW", 4, 10);
        config.setPartitionRatio(0.5); // 2 in group 0 (Agent-0, Agent-1), 2 in group 1 (Agent-2, Agent-3)
        config.setPartitionStartTick(0);
        config.setPartitionEndTick(10);

        SimulationEngine engine = new SimulationEngine(config);
        BlockchainAgent a0 = engine.getState().getAgents().get(0);
        BlockchainAgent a1 = engine.getState().getAgents().get(1);
        BlockchainAgent a2 = engine.getState().getAgents().get(2);

        // Connect a0 to a1 (intra-partition) and a0 to a2 (cross-partition)
        a0.getPeers().clear();
        a1.getPeers().clear();
        a2.getPeers().clear();
        a0.addPeer(a1.getId());
        a1.addPeer(a0.getId());
        a0.addPeer(a2.getId());
        a2.addPeer(a0.getId());

        assertTrue(engine.getState().getNetworkModel().isPartitionActive());
        assertFalse(engine.getState().getNetworkModel().isCrossPartition(a0.getId(), a1.getId()));
        assertTrue(engine.getState().getNetworkModel().isCrossPartition(a0.getId(), a2.getId()));

        Block intraBlock = new Block("intra-block", Block.GENESIS_ID, a0.getId(), 1, 1);
        assertTrue(a0.receiveBlock(intraBlock));

        // Broadcast to both peers
        engine.getState().getNetworkModel().broadcastMessage(a0.getId(), NetworkMessage.MessageType.BLOCK, intraBlock);

        // Sent to a1 (queued) and a2 (dropped at partition boundary)
        assertEquals(2, engine.getState().getNetworkModel().getMessagesSent());
        assertEquals(1, engine.getState().getNetworkModel().getMessagesDropped());

        advance(engine, 5);

        // Intra-partition peer received block
        assertTrue(a1.getKnownBlocks().containsKey(intraBlock.getBlockId()));
        // Cross-partition peer did NOT receive block
        assertFalse(a2.getKnownBlocks().containsKey(intraBlock.getBlockId()));
    }

    @Test
    void explicitPartitionGroupsAreRespected() {
        SimulationConfig config = baseConfig("PoW", 4, 10);
        config.setPartitionGroupA(List.of("Agent-0", "Agent-2"));
        config.setPartitionGroupB(List.of("Agent-1", "Agent-3"));
        config.setPartitionStartTick(1);
        config.setPartitionEndTick(5);

        SimulationEngine engine = new SimulationEngine(config);
        engine.getState().incrementTick(); // Tick 1: partition starts
        assertTrue(engine.getState().getNetworkModel().isPartitionActive());

        assertTrue(engine.getState().getNetworkModel().isCrossPartition("Agent-0", "Agent-1"));
        assertFalse(engine.getState().getNetworkModel().isCrossPartition("Agent-0", "Agent-2"));
        assertFalse(engine.getState().getNetworkModel().isCrossPartition("Agent-1", "Agent-3"));
    }

    @Test
    void partitionHealingRestoresCrossPartitionCommunication() {
        SimulationConfig config = baseConfig("PoW", 2, 10);
        config.setPartitionRatio(0.5); // Agent-0 in Group 0, Agent-1 in Group 1
        config.setPartitionStartTick(1);
        config.setPartitionEndTick(3); // Heals after tick 3
        config.setNetworkLatencyJitter(0);

        SimulationEngine engine = new SimulationEngine(config);
        BlockchainAgent a0 = engine.getState().getAgents().get(0);
        BlockchainAgent a1 = engine.getState().getAgents().get(1);
        connectOnly(a0, a1);

        // Advance to tick 2 (partition active)
        engine.getState().incrementTick();
        engine.getState().incrementTick();
        assertTrue(engine.getState().getNetworkModel().isPartitionActive());

        Block partitionedBlock = new Block("partitioned-block", Block.GENESIS_ID, a0.getId(), 1, 2);
        assertTrue(a0.receiveBlock(partitionedBlock));
        engine.getState().getNetworkModel().broadcastMessage(a0.getId(), NetworkMessage.MessageType.BLOCK, partitionedBlock);

        // Message across partition was dropped
        assertEquals(1, engine.getState().getNetworkModel().getMessagesDropped());

        // Advance past partition healing (tick 4)
        engine.getState().incrementTick(); // tick 3
        engine.getState().incrementTick(); // tick 4
        assertFalse(engine.getState().getNetworkModel().isPartitionActive());

        // Send new message on healed network
        Block healedBlock = new Block("healed-block", Block.GENESIS_ID, a0.getId(), 1, 4);
        assertTrue(a0.receiveBlock(healedBlock));
        engine.getState().getNetworkModel().broadcastMessage(a0.getId(), NetworkMessage.MessageType.BLOCK, healedBlock);

        advance(engine, 5);

        // Post-healing block is received by peer
        assertTrue(a1.getKnownBlocks().containsKey(healedBlock.getBlockId()));
        // Pre-healing blocked message was never received
        assertFalse(a1.getKnownBlocks().containsKey(partitionedBlock.getBlockId()));
    }

    @Test
    void orphanBlockRecoverySucceedsAfterPartitionHealing() {
        SimulationConfig config = baseConfig("PoW", 2, 15);
        config.setPartitionRatio(0.5);
        config.setPartitionStartTick(1);
        config.setPartitionEndTick(2); // Healed by tick 3

        SimulationEngine engine = new SimulationEngine(config);
        BlockchainAgent a0 = engine.getState().getAgents().get(0);
        BlockchainAgent a1 = engine.getState().getAgents().get(1);
        connectOnly(a0, a1);

        // Tick 1: a0 produces parent block P during partition -> message dropped
        engine.getState().incrementTick();
        Block parent = new Block("parent-block", Block.GENESIS_ID, a0.getId(), 1, 1);
        assertTrue(a0.receiveBlock(parent));
        engine.getState().getNetworkModel().broadcastMessage(a0.getId(), NetworkMessage.MessageType.BLOCK, parent);
        assertEquals(1, engine.getState().getNetworkModel().getMessagesDropped());

        // Advance to tick 3: partition is now healed
        engine.getState().incrementTick();
        engine.getState().incrementTick();
        assertFalse(engine.getState().getNetworkModel().isPartitionActive());

        // a0 produces child block C pointing to P and gossips it to a1
        Block child = new Block("child-block", parent.getBlockId(), a0.getId(), 2, 3);
        assertTrue(a0.receiveBlock(child));
        engine.getState().getNetworkModel().broadcastMessage(a0.getId(), NetworkMessage.MessageType.BLOCK, child);

        // Advance so child is received, orphan requested, parent replied and attached
        advance(engine, 10);

        assertTrue(a1.getKnownBlocks().containsKey(parent.getBlockId()), "Parent must be recovered via request-response");
        assertTrue(a1.getKnownBlocks().containsKey(child.getBlockId()), "Child must be resolved and attached");
        assertTrue(a1.isAttached(child.getBlockId()));
    }

    // -------------------------------------------------------------------------
    // 6. Metrics & Deduplication
    // -------------------------------------------------------------------------

    @Test
    void metricsSnapshotTracksNetworkSentDeliveredDroppedQueuedAccurately() {
        SimulationConfig config = baseConfig("PoW", 2, 10);
        config.setPacketLossRate(0.5);
        config.setRandomSeed(7L);

        SimulationEngine engine = new SimulationEngine(config);
        BlockchainAgent a0 = engine.getState().getAgents().get(0);
        BlockchainAgent a1 = engine.getState().getAgents().get(1);
        connectOnly(a0, a1);

        for (int i = 0; i < 10; i++) {
            Block b = new Block("test-b-" + i, Block.GENESIS_ID, a0.getId(), 1, 1);
            engine.getState().getNetworkModel().sendMessage(a0.getId(), a1.getId(), NetworkMessage.MessageType.BLOCK, b);
        }

        MetricsSnapshot snapshot = new com.sim.metrics.MetricsCalculator().calculateMetrics(engine.getState());
        assertEquals(10, snapshot.getMessagesSent());
        assertEquals(snapshot.getMessagesSent(),
                snapshot.getMessagesDelivered() + snapshot.getMessagesDropped() + snapshot.getQueuedMessages());
        assertEquals(0.5, snapshot.getPacketLossRate());
    }

    @Test
    void blockPropagationDelayIsTrackedOnPeerBlockDelivery() {
        SimulationConfig config = baseConfig("PoW", 2, 10);
        config.setBlockGossipLatency(0.2); // 2 ticks
        config.setNetworkLatencyJitter(0);

        SimulationEngine engine = new SimulationEngine(config);
        BlockchainAgent sender = engine.getState().getAgents().get(0);
        BlockchainAgent receiver = engine.getState().getAgents().get(1);
        connectOnly(sender, receiver);

        Block block = new Block("prop-delay-block", Block.GENESIS_ID, sender.getId(), 1, 0);
        assertTrue(sender.receiveBlock(block));
        engine.getState().getNetworkModel().broadcastMessage(sender.getId(), NetworkMessage.MessageType.BLOCK, block);

        advance(engine, 5);

        assertTrue(receiver.getKnownBlocks().containsKey(block.getBlockId()));
        assertTrue(engine.getState().getNetworkModel().getAverageBlockPropagationDelay() >= 2.0);
    }

    @Test
    void noDuplicateDeliveryOccursEvenWithRepeatedBroadcast() {
        SimulationConfig config = baseConfig("PoW", 2, 10);
        config.setNetworkLatencyJitter(0);

        SimulationEngine engine = new SimulationEngine(config);
        BlockchainAgent sender = engine.getState().getAgents().get(0);
        BlockchainAgent receiver = engine.getState().getAgents().get(1);
        connectOnly(sender, receiver);

        Block block = new Block("single-block", Block.GENESIS_ID, sender.getId(), 1, 1);
        assertTrue(sender.receiveBlock(block));

        // Broadcast twice
        engine.getState().getNetworkModel().broadcastMessage(sender.getId(), NetworkMessage.MessageType.BLOCK, block);
        engine.getState().getNetworkModel().broadcastMessage(sender.getId(), NetworkMessage.MessageType.BLOCK, block);

        advance(engine, 10);

        assertEquals(2, engine.getState().getNetworkModel().getMessagesDelivered());
        MetricsSnapshot snapshot = new com.sim.metrics.MetricsCalculator().calculateMetrics(engine.getState());
        // Second delivery detected as duplicate (at agent level)
        assertTrue(snapshot.getDuplicateMessages() >= 1);
        // Only 1 copy recorded in receiver's known blocks
        assertEquals(2, receiver.getKnownBlocks().size()); // Genesis + single-block
    }

    // -------------------------------------------------------------------------
    // 7. Experiments & Aggregation
    // -------------------------------------------------------------------------

    @Test
    void experimentRunnerCopyPreservesAllNetworkSettings() {
        SimulationConfig template = baseConfig("PoS", 4, 10);
        template.setPacketLossRate(0.15);
        template.setNetworkLatencyJitter(4);
        template.setPartitionRatio(0.25);
        template.setPartitionStartTick(3);
        template.setPartitionEndTick(7);
        template.setPartitionGroupA(List.of("Agent-0"));
        template.setPartitionGroupB(List.of("Agent-1"));

        ExperimentRunner runner = new ExperimentRunner();
        ExperimentAggregate aggregate = runner.runRepeated(template, List.of(101L, 102L));

        assertNotNull(aggregate);
        assertEquals(2, aggregate.getSuccessfulRuns());
        assertEquals(0, aggregate.getFailedRuns());
        assertTrue(aggregate.getMeanMessagesDelivered() >= 0.0);
    }

    @Test
    void experimentAggregateAveragesNetworkMetricsWithoutSkewFromFailedRuns() {
        ExperimentAggregate aggregate = new ExperimentAggregate();

        ExperimentRunResult run1 = new ExperimentRunResult();
        run1.setStatus("COMPLETED");
        MetricsSnapshot m1 = new MetricsSnapshot();
        m1.setMessagesDelivered(80);
        m1.setMessagesDropped(20);
        m1.setAveragePropagationDelayTicks(2.5);
        run1.setMetrics(m1);
        aggregate.addRun(run1);

        ExperimentRunResult run2 = new ExperimentRunResult();
        run2.setStatus("COMPLETED");
        MetricsSnapshot m2 = new MetricsSnapshot();
        m2.setMessagesDelivered(100);
        m2.setMessagesDropped(10);
        m2.setAveragePropagationDelayTicks(3.5);
        run2.setMetrics(m2);
        aggregate.addRun(run2);

        // Add a failed run
        ExperimentRunResult failed = new ExperimentRunResult();
        failed.setStatus("FAILED");
        failed.setErrorMessage("Timeout");
        aggregate.addRun(failed);

        assertEquals(2, aggregate.getSuccessfulRuns());
        assertEquals(1, aggregate.getFailedRuns());
        assertEquals(90.0, aggregate.getMeanMessagesDelivered(), 1e-6);
        assertEquals(15.0, aggregate.getMeanMessagesDropped(), 1e-6);
        assertEquals(3.0, aggregate.getMeanPropagationDelay(), 1e-6);
    }

    @Test
    void accountingInvariantHoldsAcrossInvalidLinksAndIntermediateStates() {
        SimulationConfig config = baseConfig("PoW", 3, 10);
        SimulationEngine engine = new SimulationEngine(config);
        BlockchainAgent a0 = engine.getState().getAgents().get(0);
        BlockchainAgent a1 = engine.getState().getAgents().get(1);
        BlockchainAgent a2 = engine.getState().getAgents().get(2);

        // a0 and a1 are peers; a2 is disconnected
        a0.getPeers().clear();
        a1.getPeers().clear();
        a2.getPeers().clear();
        a0.addPeer(a1.getId());
        a1.addPeer(a0.getId());

        Block b1 = new Block("valid-block", Block.GENESIS_ID, a0.getId(), 1, 0);
        Block b2 = new Block("dropped-block", Block.GENESIS_ID, a0.getId(), 1, 0);

        // 1. Send to disconnected peer -> immediately dropped, sent++
        engine.getState().getNetworkModel().sendMessage(a0.getId(), a2.getId(), NetworkMessage.MessageType.BLOCK, b2);
        assertEquals(1, engine.getState().getNetworkModel().getMessagesSent());
        assertEquals(1, engine.getState().getNetworkModel().getMessagesDropped());
        assertEquals(0, engine.getState().getNetworkModel().getQueuedMessages());
        assertEquals(0, engine.getState().getNetworkModel().getMessagesDelivered());

        // 2. Send to invalid non-existent node -> immediately dropped, sent++
        engine.getState().getNetworkModel().sendMessage(a0.getId(), "NonExistent", NetworkMessage.MessageType.BLOCK, b2);
        assertEquals(2, engine.getState().getNetworkModel().getMessagesSent());
        assertEquals(2, engine.getState().getNetworkModel().getMessagesDropped());

        // 3. Send valid message to connected peer -> queued, sent++
        engine.getState().getNetworkModel().sendMessage(a0.getId(), a1.getId(), NetworkMessage.MessageType.BLOCK, b1);
        assertEquals(3, engine.getState().getNetworkModel().getMessagesSent());
        assertEquals(1, engine.getState().getNetworkModel().getQueuedMessages());
        assertEquals(2, engine.getState().getNetworkModel().getMessagesDropped());
        assertEquals(0, engine.getState().getNetworkModel().getMessagesDelivered());

        // Invariant check at intermediate state
        assertEquals(engine.getState().getNetworkModel().getMessagesSent(),
                engine.getState().getNetworkModel().getMessagesDelivered()
                + engine.getState().getNetworkModel().getMessagesDropped()
                + engine.getState().getNetworkModel().getQueuedMessages());

        // Deliver
        advance(engine, 5);
        assertEquals(3, engine.getState().getNetworkModel().getMessagesSent());
        assertEquals(1, engine.getState().getNetworkModel().getMessagesDelivered());
        assertEquals(2, engine.getState().getNetworkModel().getMessagesDropped());
        assertEquals(0, engine.getState().getNetworkModel().getQueuedMessages());

        // Final invariant check
        assertEquals(engine.getState().getNetworkModel().getMessagesSent(),
                engine.getState().getNetworkModel().getMessagesDelivered()
                + engine.getState().getNetworkModel().getMessagesDropped()
                + engine.getState().getNetworkModel().getQueuedMessages());
    }

    @Test
    void duplicateBlockReceptionsDoNotDistortPropagationDelayMetric() {
        SimulationConfig config = baseConfig("PoW", 2, 20);
        config.setBlockGossipLatency(0.2); // 2 ticks
        config.setNetworkLatencyJitter(0);

        SimulationEngine engine = new SimulationEngine(config);
        BlockchainAgent sender = engine.getState().getAgents().get(0);
        BlockchainAgent receiver = engine.getState().getAgents().get(1);
        connectOnly(sender, receiver);

        // Send block at tick 0 -> delivered at tick 2 (delay = 2 ticks)
        Block block = new Block("test-delay-block", Block.GENESIS_ID, sender.getId(), 1, 0);
        assertTrue(sender.receiveBlock(block));
        engine.getState().getNetworkModel().sendMessage(sender.getId(), receiver.getId(), NetworkMessage.MessageType.BLOCK, block);

        advance(engine, 3);
        assertTrue(receiver.getKnownBlocks().containsKey(block.getBlockId()));
        assertEquals(2.0, engine.getState().getNetworkModel().getAverageBlockPropagationDelay(), 1e-6);

        // Advance to tick 10 and send duplicate block
        for (int i = 0; i < 7; i++) engine.getState().incrementTick();
        assertEquals(10, engine.getState().getCurrentTick());
        engine.getState().getNetworkModel().sendMessage(sender.getId(), receiver.getId(), NetworkMessage.MessageType.BLOCK, block);

        // Advance so duplicate message is delivered at tick 12
        advance(engine, 5);
        assertEquals(2, engine.getState().getNetworkModel().getMessagesDelivered());
        assertTrue(engine.getState().getNetworkModel().getDuplicateMessages() >= 1);

        // Propagation delay must remain 2.0 and NOT be distorted by duplicate delivery at tick 12
        assertEquals(2.0, engine.getState().getNetworkModel().getAverageBlockPropagationDelay(), 1e-6);
    }

    @Test
    void inFlightMessagesCrossingBoundaryWhenPartitionActivatesAreDropped() {
        SimulationConfig config = baseConfig("PoW", 2, 10);
        config.setPartitionRatio(0.5); // Agent-0 and Agent-1 in separate partitions
        config.setPartitionStartTick(3); // Partition begins at tick 3
        config.setPartitionEndTick(10);
        config.setBlockGossipLatency(0.4); // 4 ticks delay
        config.setNetworkLatencyJitter(0);

        SimulationEngine engine = new SimulationEngine(config);
        BlockchainAgent sender = engine.getState().getAgents().get(0);
        BlockchainAgent receiver = engine.getState().getAgents().get(1);
        connectOnly(sender, receiver);

        // Send at tick 0 -> delivery tick will be 0 + 4 = 4
        // At tick 4, partition is active (3 <= 4 <= 10)
        Block inFlightBlock = new Block("in-flight-block", Block.GENESIS_ID, sender.getId(), 1, 0);
        assertTrue(sender.receiveBlock(inFlightBlock));
        engine.getState().getNetworkModel().sendMessage(sender.getId(), receiver.getId(), NetworkMessage.MessageType.BLOCK, inFlightBlock);

        // Enqueued successfully because partition is not active at tick 0
        assertEquals(1, engine.getState().getNetworkModel().getMessagesSent());
        assertEquals(1, engine.getState().getNetworkModel().getQueuedMessages());
        assertEquals(0, engine.getState().getNetworkModel().getMessagesDropped());

        // Advance past delivery tick
        advance(engine, 6);

        // At delivery time, partition is active -> message dropped in transit!
        assertEquals(0, engine.getState().getNetworkModel().getMessagesDelivered());
        assertEquals(1, engine.getState().getNetworkModel().getMessagesDropped());
        assertFalse(receiver.getKnownBlocks().containsKey(inFlightBlock.getBlockId()));
    }
}
