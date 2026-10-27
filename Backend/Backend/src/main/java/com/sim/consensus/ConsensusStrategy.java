package com.sim.consensus;

import java.util.Locale;
import java.util.UUID;
import java.util.List;

import com.sim.agent.BlockchainAgent;
import com.sim.blockchain.Block;
import com.sim.engine.SimulationState;
import com.sim.model.Transaction;

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
        List<Transaction> transactions = agent.getPendingTransactions().subList(0,
                Math.min(state.getConfig().getMaxTransactionsPerBlock(), agent.getMempoolSize()));
        Block block = new Block(UUID.randomUUID().toString(), parentId, agent.getId(),
                newHeight, state.getCurrentTick(), transactions);
        agent.incrementBlocksProposed();
        if (!agent.receiveBlock(block) || !state.getBlockchainState().addBlock(block)) {
            return false;
        }
        agent.removeIncludedTransactions(transactions);
        agent.incrementBlocksProduced();
        state.getNetworkModel().broadcastMessage(agent.getId(),
                com.sim.network.NetworkMessage.MessageType.BLOCK, block);
        return true;
    }
}