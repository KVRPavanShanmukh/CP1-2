package com.sim.consensus;

import java.util.UUID;

import com.sim.agent.BlockchainAgent;
import com.sim.blockchain.Block;
import com.sim.engine.SimulationState;

public class PosConsensus extends ConsensusStrategy {
    @Override
    public void execute(BlockchainAgent agent, SimulationState state) {
        // 1. Attest to the current canonical head
        com.sim.blockchain.Attestation att = agent.createAttestation(state.getCurrentTick() / 10, state.getCurrentTick());
        if (att != null) {
            state.getNetworkModel().broadcastMessage(agent.getId(), com.sim.network.NetworkMessage.MessageType.ATTESTATION, att);
        }

        // 2. Block proposal
        double totalStake = state.getAgents().stream().mapToDouble(BlockchainAgent::getStake).sum();
        double prob = agent.getStake() / (totalStake + 0.1);
        if (state.getRng().nextDouble() < prob * 0.5) {
            int newHeight = agent.getHighestBlock() != null ? agent.getHighestBlock().getHeight() + 1 : 1;
            String prevId = agent.getHighestBlock() != null ? agent.getHighestBlock().getBlockId() : Block.GENESIS_ID;
            Block block = new Block(UUID.randomUUID().toString(), prevId, agent.getId(), newHeight, state.getCurrentTick());
            if (agent.receiveBlock(block) && state.getBlockchainState().addBlock(block)) {
                agent.incrementBlocksProduced();
                state.getNetworkModel().broadcastMessage(agent.getId(), com.sim.network.NetworkMessage.MessageType.BLOCK, block);
            }
        }
    }
}