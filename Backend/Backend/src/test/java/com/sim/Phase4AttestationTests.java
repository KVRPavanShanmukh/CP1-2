package com.sim;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

import com.sim.agent.BlockchainAgent;
import com.sim.blockchain.Attestation;
import com.sim.blockchain.Block;
import com.sim.engine.SimulationEngine;
import com.sim.model.SimulationConfig;
import com.sim.network.NetworkMessage;

class Phase4AttestationTests {

    @Test
    void acceptsValidAttestationsAndRejectsInvalidTargetsAndValidators() {
        SimulationEngine engine = engine(2, 0.1);
        BlockchainAgent subject = engine.getState().getAgents().get(0);
        BlockchainAgent validator = engine.getState().getAgents().get(1);
        Block block = child("valid-target", subject, Block.GENESIS_ID, 1);
        assertTrue(subject.receiveBlock(block));

        assertTrue(subject.receiveAttestation(new Attestation("valid", validator.getId(), block.getBlockId(), 1, 1)));
        assertFalse(subject.receiveAttestation(null));
        assertFalse(subject.receiveAttestation(new Attestation("unknown-validator", "missing", block.getBlockId(), 1, 1)));
        assertFalse(subject.receiveAttestation(new Attestation("unknown-block", validator.getId(), "missing", 1, 1)));
        assertFalse(subject.receiveAttestation(new Attestation("negative-slot", validator.getId(), block.getBlockId(), -1, 1)));
        assertEquals(1, subject.getKnownAttestations().size());
    }

    @Test
    void latestMessageWinsAndOlderVotesCannotOverwriteIt() {
        SimulationEngine engine = engine(2, 0.1);
        BlockchainAgent subject = engine.getState().getAgents().get(0);
        BlockchainAgent validator = engine.getState().getAgents().get(1);
        Block first = child("first-vote", subject, Block.GENESIS_ID, 1);
        Block second = child("second-vote", subject, Block.GENESIS_ID, 1);
        subject.receiveBlock(first);
        subject.receiveBlock(second);

        assertTrue(subject.receiveAttestation(new Attestation("vote-1", validator.getId(), first.getBlockId(), 1, 1)));
        assertTrue(subject.receiveAttestation(new Attestation("vote-2", validator.getId(), second.getBlockId(), 2, 2)));
        assertTrue(subject.receiveAttestation(new Attestation("vote-old", validator.getId(), first.getBlockId(), 1, 99)));

        assertEquals(second.getBlockId(), subject.getLatestAttestations().get(validator.getId()).getBlockId());
        assertEquals(second.getBlockId(), subject.getCanonicalHeadId());
    }

    @Test
    void attestationsPropagateThroughConnectedQueuedPeers() {
        SimulationEngine engine = engine(2, 0.1);
        BlockchainAgent sender = engine.getState().getAgents().get(0);
        BlockchainAgent receiver = engine.getState().getAgents().get(1);
        connectOnly(sender, receiver);
        Block block = child("propagated-target", sender, Block.GENESIS_ID, 1);
        sender.receiveBlock(block);
        engine.getState().getNetworkModel().broadcastMessage(sender.getId(), NetworkMessage.MessageType.BLOCK, block);
        advance(engine, 5);

        Attestation attestation = new Attestation("propagated-attestation", sender.getId(), block.getBlockId(), 1, 1);
        engine.getState().getNetworkModel().broadcastMessage(sender.getId(), NetworkMessage.MessageType.ATTESTATION, attestation);
        assertFalse(receiver.getKnownAttestations().containsKey(attestation.getAttestationId()));
        advance(engine, 5);

        assertTrue(receiver.getKnownAttestations().containsKey(attestation.getAttestationId()));
    }

    @Test
    void localPoSHeadsCanDifferWithDifferentKnownBranches() {
        SimulationEngine engine = engine(2, 0.1);
        BlockchainAgent firstAgent = engine.getState().getAgents().get(0);
        BlockchainAgent secondAgent = engine.getState().getAgents().get(1);
        Block first = child("local-first", firstAgent, Block.GENESIS_ID, 1);
        Block second = child("local-second", secondAgent, Block.GENESIS_ID, 1);

        firstAgent.receiveBlock(first);
        secondAgent.receiveBlock(second);

        assertEquals(first.getBlockId(), firstAgent.getCanonicalHeadId());
        assertEquals(second.getBlockId(), secondAgent.getCanonicalHeadId());
    }

    @Test
    void stakeWeightChangesTheSelectedHead() {
        SimulationEngine engine = engine(3, 0.1);
        BlockchainAgent subject = engine.getState().getAgents().get(0);
        BlockchainAgent validatorOne = engine.getState().getAgents().get(1);
        BlockchainAgent validatorTwo = engine.getState().getAgents().get(2);
        Block branchA = child("weight-a", subject, Block.GENESIS_ID, 1);
        Block branchB = child("weight-b", subject, Block.GENESIS_ID, 1);
        subject.receiveBlock(branchA);
        subject.receiveBlock(branchB);

        subject.receiveAttestation(new Attestation("a-one", validatorOne.getId(), branchA.getBlockId(), 2, 2));
        subject.receiveAttestation(new Attestation("a-two", validatorTwo.getId(), branchA.getBlockId(), 2, 2));
        assertEquals(branchA.getBlockId(), subject.getCanonicalHeadId());

        subject.receiveAttestation(new Attestation("b-one", validatorOne.getId(), branchB.getBlockId(), 3, 3));
        subject.receiveAttestation(new Attestation("b-two", validatorTwo.getId(), branchB.getBlockId(), 3, 3));
        assertEquals(branchB.getBlockId(), subject.getCanonicalHeadId());
    }

    @Test
    void orphanTargetsCannotBecomeCanonicalOrReceiveVotes() {
        SimulationEngine engine = engine(2, 0.1);
        BlockchainAgent subject = engine.getState().getAgents().get(0);
        BlockchainAgent validator = engine.getState().getAgents().get(1);
        Block orphan = child("orphan-target", subject, "missing-parent", 2);

        assertFalse(subject.receiveBlock(orphan));
        assertFalse(subject.receiveAttestation(new Attestation("orphan-vote", validator.getId(), orphan.getBlockId(), 1, 1)));
        assertEquals(Block.GENESIS_ID, subject.getCanonicalHeadId());
        assertFalse(subject.isCanonical(orphan.getBlockId()));
    }

    @Test
    void equalWeightTiesResolveByBlockIdAndDuplicateMessagesAreIgnored() {
        SimulationEngine engine = engine(2, 0.1);
        BlockchainAgent sender = engine.getState().getAgents().get(0);
        BlockchainAgent receiver = engine.getState().getAgents().get(1);
        connectOnly(sender, receiver);
        Block low = child("tie-a", receiver, Block.GENESIS_ID, 1);
        Block high = child("tie-b", receiver, Block.GENESIS_ID, 1);
        receiver.receiveBlock(low);
        receiver.receiveBlock(high);
        assertEquals(high.getBlockId(), receiver.getCanonicalHeadId());

        Attestation attestation = new Attestation("duplicate-attestation", sender.getId(), high.getBlockId(), 1, 1);
        NetworkMessage message = new NetworkMessage("same-message", NetworkMessage.MessageType.ATTESTATION,
                sender.getId(), receiver.getId(), attestation, 0, 0);
        receiver.receiveMessage(message);
        receiver.receiveMessage(message);
        receiver.processMessages();
        assertEquals(1, receiver.getKnownAttestations().size());
    }

    private SimulationEngine engine(int nodeCount, double latency) {
        SimulationConfig config = new SimulationConfig();
        config.setNodeCount(nodeCount);
        config.setConsensusType("PoS");
        config.setNetworkTopology("Erdos-Renyi");
        config.setBlockGossipLatency(latency);
        config.setRandomSeed(7L);
        return new SimulationEngine(config);
    }

    private Block child(String id, BlockchainAgent agent, String parentId, int height) {
        return new Block(id, parentId, agent.getId(), height, height);
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