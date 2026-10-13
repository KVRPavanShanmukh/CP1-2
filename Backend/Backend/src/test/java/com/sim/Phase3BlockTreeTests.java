package com.sim;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

import com.sim.agent.BlockchainAgent;
import com.sim.blockchain.Block;
import com.sim.engine.SimulationEngine;
import com.sim.model.SimulationConfig;

class Phase3BlockTreeTests {

    @Test
    void retainsTwoValidChildrenOfTheSameParent() {
        BlockchainAgent agent = agent();
        Block first = child("branch-a", agent, Block.GENESIS_ID, 1);
        Block second = child("branch-b", agent, Block.GENESIS_ID, 1);

        assertTrue(agent.receiveBlock(first));
        assertTrue(agent.receiveBlock(second));

        assertEquals(3, agent.getKnownBlocks().size());
        assertEquals(List.of("branch-a", "branch-b"), agent.getChildrenByParent().get(Block.GENESIS_ID));
        assertTrue(agent.isAttached(first.getBlockId()));
        assertTrue(agent.isAttached(second.getBlockId()));
    }

    @Test
    void agentsCanHaveDifferentTreesAndHeads() {
        SimulationEngine engine = engine(2);
        BlockchainAgent firstAgent = engine.getState().getAgents().get(0);
        BlockchainAgent secondAgent = engine.getState().getAgents().get(1);
        Block first = child("first-branch", firstAgent, Block.GENESIS_ID, 1);
        Block second = child("second-branch", secondAgent, Block.GENESIS_ID, 1);

        assertTrue(firstAgent.receiveBlock(first));
        assertTrue(secondAgent.receiveBlock(second));

        assertFalse(firstAgent.getKnownBlocks().containsKey(second.getBlockId()));
        assertFalse(secondAgent.getKnownBlocks().containsKey(first.getBlockId()));
        assertEquals(first.getBlockId(), firstAgent.getCanonicalHeadId());
        assertEquals(second.getBlockId(), secondAgent.getCanonicalHeadId());
    }

    @Test
    void outOfOrderChildAttachesWhenParentArrives() {
        BlockchainAgent agent = agent();
        Block parent = child("parent", agent, Block.GENESIS_ID, 1);
        Block child = child("child", agent, parent.getBlockId(), 2);

        assertFalse(agent.receiveBlock(child));
        assertTrue(agent.getOrphanBlocks().containsKey(child.getBlockId()));
        assertTrue(agent.receiveBlock(parent));

        assertTrue(agent.isAttached(parent.getBlockId()));
        assertTrue(agent.isAttached(child.getBlockId()));
        assertTrue(agent.isCanonical(child.getBlockId()));
        assertTrue(agent.getOrphanBlocks().isEmpty());
    }

    @Test
    void validCompetingBranchRemainsAfterCanonicalHeadChanges() {
        BlockchainAgent agent = agent();
        Block branchA = child("branch-a", agent, Block.GENESIS_ID, 1);
        Block branchB = child("branch-b", agent, Block.GENESIS_ID, 1);
        Block branchAChild = child("branch-a-child", agent, branchA.getBlockId(), 2);

        assertTrue(agent.receiveBlock(branchA));
        assertTrue(agent.receiveBlock(branchB));
        assertEquals(branchB.getBlockId(), agent.getCanonicalHeadId());
        assertTrue(agent.receiveBlock(branchAChild));

        assertEquals(branchAChild.getBlockId(), agent.getCanonicalHeadId());
        assertTrue(agent.getKnownBlocks().containsKey(branchB.getBlockId()));
        assertTrue(agent.isStale(branchB.getBlockId()));
        assertFalse(agent.isCanonical(branchB.getBlockId()));
    }

    @Test
    void rejectsInvalidRelationshipsCyclesAndDuplicateTreeEntries() {
        BlockchainAgent agent = agent();
        Block invalidHeight = child("invalid-height", agent, Block.GENESIS_ID, 2);
        Block cycle = child("cycle", agent, "cycle", 1);
        Block valid = child("valid", agent, Block.GENESIS_ID, 1);

        assertFalse(agent.receiveBlock(invalidHeight));
        assertFalse(agent.receiveBlock(cycle));
        assertTrue(agent.receiveBlock(valid));
        assertFalse(agent.receiveBlock(valid));

        assertFalse(agent.getKnownBlocks().containsKey(invalidHeight.getBlockId()));
        assertFalse(agent.getKnownBlocks().containsKey(cycle.getBlockId()));
        assertEquals(1, agent.getChildrenByParent().get(Block.GENESIS_ID).stream()
                .filter(valid.getBlockId()::equals).count());
    }

    @Test
    void repeatedOrphanDeliveryDoesNotDuplicateTreeEntries() {
        BlockchainAgent agent = agent();
        Block parent = child("parent", agent, Block.GENESIS_ID, 1);
        Block orphan = child("orphan", agent, parent.getBlockId(), 2);

        assertFalse(agent.receiveBlock(orphan));
        assertFalse(agent.receiveBlock(orphan));
        assertEquals(1, agent.getOrphanBlocks().size());
        assertEquals(1, agent.getChildrenByParent().get(parent.getBlockId()).size());

        assertTrue(agent.receiveBlock(parent));
        assertTrue(agent.getOrphanBlocks().isEmpty());
        assertEquals(1, agent.getChildrenByParent().get(parent.getBlockId()).size());
        assertTrue(agent.isCanonical(orphan.getBlockId()));
    }

    private BlockchainAgent agent() {
        return engine(1).getState().getAgents().get(0);
    }

    private SimulationEngine engine(int nodeCount) {
        SimulationConfig config = new SimulationConfig();
        config.setNodeCount(nodeCount);
        config.setConsensusType("PoW");
        config.setNetworkTopology("Erdos-Renyi");
        config.setBlockGossipLatency(0.1);
        config.setRandomSeed(7L);
        return new SimulationEngine(config);
    }

    private Block child(String id, BlockchainAgent agent, String parentId, int height) {
        return new Block(id, parentId, agent.getId(), height, height);
    }
}