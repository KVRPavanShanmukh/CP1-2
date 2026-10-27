package com.sim.engine;

import com.sim.agent.BlockchainAgent;
import com.sim.model.SimulationConfig;
import com.sim.blockchain.BlockchainState;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import com.sim.model.Transaction;

public class SimulationState {
    private SimulationConfig config;
    private Random rng;
    private List<BlockchainAgent> agents = new ArrayList<>();
    private BlockchainState globalBlockchainState = new BlockchainState();
    private com.sim.network.NetworkModel networkModel;
    private int currentTick = 0;
    private int transactionSequence = 0;
    private int transactionsCreatedCount = 0;

    public SimulationState(SimulationConfig config, Random rng) {
        this.config = config;
        this.rng = rng;
    }

    public void addAgent(BlockchainAgent agent) {
        agents.add(agent);
    }

    public BlockchainAgent getAgent(String id) {
        for (BlockchainAgent agent : agents) {
            if (agent.getId().equals(id)) return agent;
        }
        return null;
    }

    public List<BlockchainAgent> getAgents() { return agents; }
    public BlockchainState getBlockchainState() { return globalBlockchainState; }
    public SimulationConfig getConfig() { return config; }
    public Random getRng() { return rng; }
    
    public void setNetworkModel(com.sim.network.NetworkModel networkModel) {
        this.networkModel = networkModel;
    }
    public com.sim.network.NetworkModel getNetworkModel() { return networkModel; }
    
    public void incrementTick() { currentTick++; }

    /**
     * Generates transactions for the current tick. Each agent attempts to send
     * {@code transactionsPerAgentPerTick} transactions to a randomly chosen different
     * agent. Only successfully accepted transactions (i.e. those that pass mempool
     * deduplication and capacity checks) are counted in {@code transactionsCreatedCount}.
     */
    public void generateTransactions() {
        int count = config.getTransactionsPerAgentPerTick();
        if (count == 0 || agents.size() < 2) return;
        for (BlockchainAgent sender : agents) {
            if (sender.isInactive()) continue; // inactive agents do not generate transactions
            for (int i = 0; i < count; i++) {
                BlockchainAgent receiver = agents.get(rng.nextInt(agents.size()));
                if (receiver == sender) receiver = agents.get((agents.indexOf(sender) + 1) % agents.size());
                Transaction tx = new Transaction("tx-" + currentTick + "-" + transactionSequence++,
                        sender.getId(), receiver.getId(), config.getTransactionAmount(), currentTick);
                if (sender.addTransaction(tx)) {
                    transactionsCreatedCount++;
                }
            }
        }
    }

    public int getCurrentTick() { return currentTick; }

    /** Returns the cumulative count of transactions that were successfully accepted into agent mempools. */
    public int getTransactionsCreatedCount() { return transactionsCreatedCount; }
}