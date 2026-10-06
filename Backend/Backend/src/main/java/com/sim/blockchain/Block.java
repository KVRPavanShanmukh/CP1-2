package com.sim.blockchain;

public class Block {
    private String blockId;
    private String previousBlockId;
    private String producerAgentId;
    private int height;
    private int tickProduced;

    public Block(String blockId, String previousBlockId, String producerAgentId, int height, int tickProduced) {
        this.blockId = blockId;
        this.previousBlockId = previousBlockId;
        this.producerAgentId = producerAgentId;
        this.height = height;
        this.tickProduced = tickProduced;
    }

    public String getBlockId() { return blockId; }
    public String getPreviousBlockId() { return previousBlockId; }
    public String getProducerAgentId() { return producerAgentId; }
    public int getHeight() { return height; }
}