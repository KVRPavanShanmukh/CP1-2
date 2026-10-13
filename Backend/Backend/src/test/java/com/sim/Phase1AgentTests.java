package com.sim;

import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

import com.sim.agent.BlockchainAgent;
import com.sim.blockchain.Block;
import com.sim.engine.SimulationEngine;
import com.sim.model.SimulationConfig;

class Phase1AgentTests {

    @Test
    void initializesIndependentAgentsWithGenesis() {
        SimulationEngine engine = engine("PoW", 5);

        assertEquals(5, engine.getState().getAgents().size());
        Set<String> ids = new HashSet<>();
        BlockchainAgent firstAgent = engine.getState().getAgents().get(0);
        for (BlockchainAgent agent : engine.getState().getAgents()) {
            assertTrue(ids.add(agent.getId()));
            if (agent != firstAgent) {
                assertNotSame(firstAgent.getKnownBlocks(), agent.getKnownBlocks());
            }
            assertEquals(1, agent.getKnownBlocks().size());
            assertEquals(Block.GENESIS_ID, agent.getCanonicalHeadId());
            assertEquals(Block.GENESIS_ID, agent.getHighestBlock().getBlockId());
        }
        assertEquals(1, engine.getState().getBlockchainState().getTotalBlocks());
        assertEquals(Block.GENESIS_ID, engine.getState().getBlockchainState().getGlobalCanonicalHead().getBlockId());
    }

    @Test
    void rejectsMalformedDuplicateOrInvalidParentBlocksWithoutStateChanges() {
        SimulationEngine engine = engine("PoW", 1);
        BlockchainAgent agent = engine.getState().getAgents().get(0);
        int initialKnown = agent.getKnownBlocks().size();
        int initialAccepted = agent.getBlocksAccepted();
        int initialProduced = agent.getBlocksProduced();

        assertFalse(agent.receiveBlock(null));
        assertFalse(agent.receiveBlock(new Block("", Block.GENESIS_ID, agent.getId(), 1, 1)));
        assertFalse(agent.receiveBlock(new Block("negative", Block.GENESIS_ID, agent.getId(), -1, 1)));
        assertFalse(agent.receiveBlock(new Block("unknown-parent", "missing", agent.getId(), 1, 1)));
        assertFalse(agent.receiveBlock(new Block("wrong-height", Block.GENESIS_ID, agent.getId(), 2, 1)));
        assertFalse(agent.receiveBlock(new Block(Block.GENESIS_ID, null, agent.getId(), 0, 0)));

        assertEquals(initialKnown + 1, agent.getKnownBlocks().size());
        assertTrue(agent.getOrphanBlocks().containsKey("unknown-parent"));
        assertEquals(initialAccepted, agent.getBlocksAccepted());
        assertEquals(initialProduced, agent.getBlocksProduced());
        assertEquals(1, engine.getState().getBlockchainState().getTotalBlocks());
    }

    @Test
    void acceptsValidBlockOnceAndKeepsGlobalStateSeparate() {
        SimulationEngine engine = engine("PoW", 1);
        BlockchainAgent agent = engine.getState().getAgents().get(0);
        Block block = new Block("child", Block.GENESIS_ID, agent.getId(), 1, 1);

        assertTrue(agent.receiveBlock(block));
        assertEquals(2, agent.getKnownBlocks().size());
        assertEquals("child", agent.getCanonicalHeadId());
        assertEquals(2, agent.getBlocksAccepted());
        assertEquals(1, engine.getState().getBlockchainState().getTotalBlocks());
        assertFalse(agent.receiveBlock(block));
        assertEquals(2, agent.getKnownBlocks().size());
        assertEquals(2, agent.getBlocksAccepted());
    }

    @Test
    void freshSimulationStartsWithFreshGenesisState() {
        SimulationEngine first = engine("PoS", 3);
        SimulationEngine second = engine("PoS", 3);

        assertEquals(1, first.getState().getBlockchainState().getTotalBlocks());
        assertEquals(1, second.getState().getBlockchainState().getTotalBlocks());
        assertNotSame(first.getState().getAgents().get(0).getKnownBlocks(),
                second.getState().getAgents().get(0).getKnownBlocks());
        assertEquals(Block.GENESIS_ID, second.getState().getAgents().get(0).getCanonicalHeadId());
    }

    @Test
    void powAndPosTicksExecuteWithoutExceptions() {
        SimulationEngine pow = engine("PoW", 4);
        assertDoesNotThrow(() -> {
            for (int i = 0; i < 5; i++) {
                pow.tick();
            }
        });
        assertTrue(pow.getState().getAgents().stream().mapToInt(BlockchainAgent::getBlocksProduced).sum() > 0);
        assertEquals(1 + pow.getState().getAgents().stream().mapToInt(BlockchainAgent::getBlocksProduced).sum(),
                pow.getState().getBlockchainState().getTotalBlocks());

        SimulationEngine pos = engine("PoS", 4);
        assertDoesNotThrow(() -> {
            for (int i = 0; i < 20; i++) {
                pos.tick();
            }
        });
        assertTrue(pos.getState().getAgents().stream().mapToInt(BlockchainAgent::getBlocksProduced).sum() > 0);
        assertEquals(1 + pos.getState().getAgents().stream().mapToInt(BlockchainAgent::getBlocksProduced).sum(),
                pos.getState().getBlockchainState().getTotalBlocks());
    }

    private SimulationEngine engine(String consensus, int nodeCount) {
        SimulationConfig config = new SimulationConfig();
        config.setNodeCount(nodeCount);
        config.setConsensusType(consensus);
        config.setNetworkTopology("Erdos-Renyi");
        config.setBlockGossipLatency(0.1);
        config.setRandomSeed(7L);
        return new SimulationEngine(config);
    }
}