package com.sim;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

import com.sim.agent.BlockchainAgent;
import com.sim.blockchain.Block;
import com.sim.engine.SimulationEngine;
import com.sim.model.SimulationConfig;
import com.sim.network.NetworkMessage;

class Phase2NetworkTests {

    @Test
    void connectedPeerReceivesBlockOnlyAfterQueuedDelivery() {
        SimulationEngine engine = engine(2, 0.1);
        BlockchainAgent sender = engine.getState().getAgents().get(0);
        BlockchainAgent receiver = engine.getState().getAgents().get(1);
        connectOnly(sender, receiver);
        Block block = blockFor(sender, "connected");
        assertTrue(sender.receiveBlock(block));

        engine.getState().getNetworkModel().broadcastMessage(sender.getId(), NetworkMessage.MessageType.BLOCK, block);
        assertFalse(receiver.getKnownBlocks().containsKey(block.getBlockId()));

        advance(engine, 5);

        assertTrue(receiver.getKnownBlocks().containsKey(block.getBlockId()));
    }

    @Test
    void disconnectedAgentDoesNotReceiveBlock() {
        SimulationEngine engine = engine(2, 0.1);
        BlockchainAgent sender = engine.getState().getAgents().get(0);
        BlockchainAgent receiver = engine.getState().getAgents().get(1);
        sender.getPeers().clear();
        receiver.getPeers().clear();
        Block block = blockFor(sender, "disconnected");
        assertTrue(sender.receiveBlock(block));

        engine.getState().getNetworkModel().broadcastMessage(sender.getId(), NetworkMessage.MessageType.BLOCK, block);
        advance(engine, 5);

        assertFalse(receiver.getKnownBlocks().containsKey(block.getBlockId()));
    }

    @Test
    void configuredDelayKeepsMessageQueuedUntilDeliveryTick() {
        SimulationEngine engine = engine(2, 1.0);
        BlockchainAgent sender = engine.getState().getAgents().get(0);
        BlockchainAgent receiver = engine.getState().getAgents().get(1);
        connectOnly(sender, receiver);
        Block block = blockFor(sender, "delayed");
        assertTrue(sender.receiveBlock(block));

        engine.getState().getNetworkModel().broadcastMessage(sender.getId(), NetworkMessage.MessageType.BLOCK, block);
        engine.getState().incrementTick();
        engine.getState().getNetworkModel().deliverMessages();
        receiver.processMessages();

        assertFalse(receiver.getKnownBlocks().containsKey(block.getBlockId()));
        advance(engine, 12);
        assertTrue(receiver.getKnownBlocks().containsKey(block.getBlockId()));
    }

    @Test
    void receiverRejectsInvalidBlock() {
        SimulationEngine engine = engine(2, 0.1);
        BlockchainAgent sender = engine.getState().getAgents().get(0);
        BlockchainAgent receiver = engine.getState().getAgents().get(1);
        connectOnly(sender, receiver);
        Block invalid = new Block("invalid", Block.GENESIS_ID, sender.getId(), 2, 1);

        engine.getState().getNetworkModel().broadcastMessage(sender.getId(), NetworkMessage.MessageType.BLOCK, invalid);
        advance(engine, 5);

        assertFalse(receiver.getKnownBlocks().containsKey(invalid.getBlockId()));
        assertEquals(1, engine.getState().getBlockchainState().getTotalBlocks());
    }

    @Test
    void duplicateDeliveryDoesNotCreateRepeatedPropagation() {
        SimulationEngine engine = engine(2, 0.1);
        BlockchainAgent sender = engine.getState().getAgents().get(0);
        BlockchainAgent receiver = engine.getState().getAgents().get(1);
        connectOnly(sender, receiver);
        Block block = blockFor(sender, "duplicate");
        assertTrue(sender.receiveBlock(block));

        engine.getState().getNetworkModel().broadcastMessage(sender.getId(), NetworkMessage.MessageType.BLOCK, block);
        engine.getState().getNetworkModel().broadcastMessage(sender.getId(), NetworkMessage.MessageType.BLOCK, block);
        advance(engine, 8);

        assertEquals(2, receiver.getKnownBlocks().size());
        assertEquals(2, engine.getState().getNetworkModel().getMessagesSent());
    }

    @Test
    void missingParentIsRecoveredThroughRequestAndReply() {
        SimulationEngine engine = engine(2, 0.1);
        BlockchainAgent sender = engine.getState().getAgents().get(0);
        BlockchainAgent receiver = engine.getState().getAgents().get(1);
        connectOnly(sender, receiver);

        Block parent = blockFor(sender, "parent");
        Block child = new Block("child", parent.getBlockId(), sender.getId(), 2, 2);
        assertTrue(sender.receiveBlock(parent));
        assertTrue(sender.receiveBlock(child));
        engine.getState().getNetworkModel().broadcastMessage(sender.getId(), NetworkMessage.MessageType.BLOCK, child);

        advance(engine, 12);

        assertTrue(receiver.getKnownBlocks().containsKey(parent.getBlockId()));
        assertTrue(receiver.getKnownBlocks().containsKey(child.getBlockId()));
    }

    @Test
    void localViewsRemainIndependentUntilDelivery() {
        SimulationEngine engine = engine(2, 0.1);
        BlockchainAgent sender = engine.getState().getAgents().get(0);
        BlockchainAgent receiver = engine.getState().getAgents().get(1);
        connectOnly(sender, receiver);
        Block block = blockFor(sender, "local-only");

        assertTrue(sender.receiveBlock(block));
        assertFalse(receiver.getKnownBlocks().containsKey(block.getBlockId()));
        assertEquals(1, engine.getState().getBlockchainState().getTotalBlocks());
    }

    private SimulationEngine engine(int nodeCount, double latency) {
        SimulationConfig config = new SimulationConfig();
        config.setNodeCount(nodeCount);
        config.setConsensusType("PoW");
        config.setNetworkTopology("Erdos-Renyi");
        config.setBlockGossipLatency(latency);
        config.setRandomSeed(7L);
        return new SimulationEngine(config);
    }

    private Block blockFor(BlockchainAgent agent, String id) {
        return new Block(id, Block.GENESIS_ID, agent.getId(), 1, 1);
    }

    private void connectOnly(BlockchainAgent first, BlockchainAgent second) {
        first.getPeers().clear();
        second.getPeers().clear();
        first.addPeer(second.getId());
        second.addPeer(first.getId());
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
}