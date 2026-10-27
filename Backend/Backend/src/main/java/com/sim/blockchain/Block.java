package com.sim.blockchain;

import java.util.List;
import com.sim.model.Transaction;

public class Block {
    public static final String GENESIS_ID = "GENESIS";

    private String blockId;
    private String previousBlockId;
    private String producerAgentId;
    private int height;
    private int tickProduced;
    private final List<Transaction> transactions;

    public Block(String blockId, String previousBlockId, String producerAgentId, int height, int tickProduced) {
        this(blockId, previousBlockId, producerAgentId, height, tickProduced, List.of());
    }

    public Block(String blockId, String previousBlockId, String producerAgentId, int height, int tickProduced,
            List<Transaction> transactions) {
        this.blockId = blockId;
        this.previousBlockId = previousBlockId;
        this.producerAgentId = producerAgentId;
        this.height = height;
        this.tickProduced = tickProduced;
        this.transactions = transactions == null ? List.of() : List.copyOf(transactions);
    }

    public String getBlockId() { return blockId; }
    public String getPreviousBlockId() { return previousBlockId; }
    public String getProducerAgentId() { return producerAgentId; }
    public int getHeight() { return height; }
    public int getTickProduced() { return tickProduced; }
    public List<Transaction> getTransactions() { return transactions; }
}