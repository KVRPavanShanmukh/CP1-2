package com.sim.consensus;

import com.sim.agent.BlockchainAgent;
import com.sim.engine.SimulationState;
import com.sim.blockchain.Block;

import java.util.Locale;
import java.util.UUID;

public abstract class ConsensusStrategy {
    public abstract void execute(BlockchainAgent agent, SimulationState state);
    
    public static ConsensusStrategy create(String type) {
        if (type == null || type.isBlank()) {
            throw new IllegalArgumentException("Consensus type is required");
        }
        switch (type.trim().toUpperCase(Locale.ROOT)) {
            case "POW": return new PowConsensus();
            case "POS": return new PosConsensus();
            case "DPOS": return new DposConsensus();
            case "POA": return new PoaConsensus();
            case "POL": return new PolConsensus();
            default: throw new IllegalArgumentException("Unsupported consensus type: " + type);
        }
    }

    protected boolean produceBlock(BlockchainAgent agent, SimulationState state) {
        Block parent = agent.getHighestBlock();
        int newHeight = parent == null ? 1 : parent.getHeight() + 1;
        String parentId = parent == null ? Block.GENESIS_ID : parent.getBlockId();
        Block block = new Block(UUID.randomUUID().toString(), parentId, agent.getId(),
                newHeight, state.getCurrentTick());
        if (!agent.receiveBlock(block) || !state.getBlockchainState().addBlock(block)) {
            return false;
        }
        agent.incrementBlocksProduced();
        state.getNetworkModel().broadcastMessage(agent.getId(),
                com.sim.network.NetworkMessage.MessageType.BLOCK, block);
        return true;
    }
}