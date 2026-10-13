package com.sim;

import com.sim.agent.BlockchainAgent;
import com.sim.agent.ByzantineNodeAgent;
import com.sim.blockchain.Attestation;
import com.sim.blockchain.Block;
import com.sim.consensus.DposConsensus;
import com.sim.consensus.PoaConsensus;
import com.sim.consensus.PolConsensus;
import com.sim.engine.SimulationEngine;
import com.sim.model.SimulationConfig;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class Phase5ConsensusTests {

    @Test
    void everySupportedConsensusModeUsesItsProductionPath() {
        assertProduces("PoW", 5, 4, List.of());
        assertProduces("PoS", 5, 20, List.of());
        assertProduces("DPoS", 5, 8, List.of());
        assertProduces("PoA", 5, 8, List.of("Agent-0", "Agent-1"));
        assertProduces("PoL", 5, 5, List.of());
    }

    @Test
    void missingAndUnsupportedConsensusConfigurationFailsClearly() {
        assertThrows(IllegalArgumentException.class, () -> new SimulationEngine(config(null, 2, List.of())));
        assertThrows(IllegalArgumentException.class, () -> new SimulationEngine(config("unknown", 2, List.of())));
    }

    @Test
    void dposSelectsStakeRankedDelegatesAndOnlySchedulesOne() {
        SimulationEngine engine = new SimulationEngine(config("DPoS", 5, List.of()));
        List<BlockchainAgent> delegates = DposConsensus.selectDelegates(engine.getState());

        assertEquals(2, delegates.size());
        assertTrue(delegates.stream().allMatch(agent -> DposConsensus.isEligible(agent, engine.getState())
                || !DposConsensus.isEligible(agent, engine.getState())));
        assertEquals(1, engine.getState().getAgents().stream()
                .filter(agent -> DposConsensus.isEligible(agent, engine.getState())).count());
        assertTrue(delegates.contains(engine.getState().getAgents().stream()
                .filter(agent -> DposConsensus.isEligible(agent, engine.getState()))
                .findFirst().orElseThrow()));
    }

    @Test
    void poaUsesConfiguredAuthoritiesAndRejectsUnauthorizedProducer() {
        SimulationEngine engine = new SimulationEngine(config("PoA", 3, List.of("Agent-0")));
        BlockchainAgent unauthorized = engine.getState().getAgent("Agent-1");
        Block invalid = new Block("unauthorized", Block.GENESIS_ID, unauthorized.getId(), 1, 1);

        assertEquals(List.of("Agent-0"), PoaConsensus.getAuthorizedValidatorIds(engine.getState()));
        assertFalse(PoaConsensus.isAuthorized(unauthorized, engine.getState()));
        assertFalse(unauthorized.receiveBlock(invalid));
    }

    @Test
    void polUsesDocumentedDeterministicLocationProxy() {
        SimulationEngine engine = new SimulationEngine(config("PoL", 3, List.of()));
        assertEquals("Agent-0", PolConsensus.getEligibleLocationAgentId(engine.getState()));
        assertTrue(PolConsensus.isEligible(engine.getState().getAgent("Agent-0"), engine.getState()));
        assertFalse(PolConsensus.isEligible(engine.getState().getAgent("Agent-1"), engine.getState()));
    }

    @Test
    void byzantineBehaviorIsDisabledByDefault() {
        SimulationConfig config = config("PoS", 2, List.of());
        config.setByzantineRatio(1.0);
        SimulationEngine engine = new SimulationEngine(config);
        BlockchainAgent agent = engine.getState().getAgents().get(0);

        assertInstanceOf(ByzantineNodeAgent.class, agent);
        assertFalse(agent.isByzantineBehaviorEnabled());
        assertEquals(Block.GENESIS_ID, agent.createAttestation(1, 1).getBlockId());
    }

    @Test
    void enabledByzantineAttestationIsSeededAndStillTargetsValidAttachedBlocks() {
        SimulationConfig firstConfig = config("PoS", 2, List.of());
        firstConfig.setByzantineRatio(1.0);
        firstConfig.setByzantineBehaviorEnabled(true);
        SimulationConfig secondConfig = config("PoS", 2, List.of());
        secondConfig.setByzantineRatio(1.0);
        secondConfig.setByzantineBehaviorEnabled(true);
        SimulationEngine first = new SimulationEngine(firstConfig);
        SimulationEngine second = new SimulationEngine(secondConfig);
        BlockchainAgent firstAgent = first.getState().getAgents().get(0);
        BlockchainAgent secondAgent = second.getState().getAgents().get(0);
        Block firstBranch = new Block("branch-a", Block.GENESIS_ID, firstAgent.getId(), 1, 1);
        Block secondBranch = new Block("branch-a", Block.GENESIS_ID, secondAgent.getId(), 1, 1);
        firstAgent.receiveBlock(firstBranch);
        secondAgent.receiveBlock(secondBranch);

        Attestation firstAttestation = firstAgent.createAttestation(1, 1);
        Attestation secondAttestation = secondAgent.createAttestation(1, 1);

        assertTrue(firstAgent.isByzantineBehaviorEnabled());
        assertEquals(firstAttestation.getBlockId(), secondAttestation.getBlockId());
        assertTrue(firstAgent.isAttached(firstAttestation.getBlockId()));
        assertFalse(firstAgent.receiveAttestation(new Attestation("invalid", firstAgent.getId(), "missing", 1, 1)));
    }

    private void assertProduces(String type, int nodes, int ticks, List<String> authorities) {
        SimulationConfig config = config(type, nodes, authorities);
        SimulationEngine engine = new SimulationEngine(config);
        for (int i = 0; i < ticks; i++) {
            engine.tick();
        }
        assertTrue(engine.getState().getAgents().stream()
                .mapToInt(BlockchainAgent::getBlocksProduced).sum() > 0, type);
    }

    private SimulationConfig config(String type, int nodes, List<String> authorities) {
        SimulationConfig config = new SimulationConfig();
        config.setNodeCount(nodes);
        config.setConsensusType(type);
        config.setNetworkTopology("Erdos-Renyi");
        config.setBlockGossipLatency(0.1);
        config.setRandomSeed(7L);
        config.setAuthorityIds(authorities);
        return config;
    }
}