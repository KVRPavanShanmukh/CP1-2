package com.sim.consensus;

import java.util.UUID;

import com.sim.agent.BlockchainAgent;
import com.sim.blockchain.Block;
import com.sim.engine.SimulationState;

public class PowConsensus extends ConsensusStrategy {
    @Override
    public void execute(BlockchainAgent agent, SimulationState state) {
        double totalHash = state.getAgents().stream().mapToDouble(BlockchainAgent::getHashPower).sum();
        double prob = agent.getHashPower() / (totalHash + 0.1);
        if (state.getRng().nextDouble() < prob * 0.5) { // 50% chance someone mines per tick
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