package com.sim.blockchain;

import java.util.ArrayList;
import java.util.List;

public class BlockchainState {
    private List<Block> allBlocks = new ArrayList<>();
    private int activeForks = 0;
    private double mainchainRate = 1.0;

    public void addBlock(Block block) {
        allBlocks.add(block);
        // Simple logic for forks
        long uniqueHeights = allBlocks.stream().map(Block::getHeight).distinct().count();
        activeForks = (int)(allBlocks.size() - uniqueHeights);
        if (allBlocks.size() > 0) {
            mainchainRate = (double)uniqueHeights / allBlocks.size();
        }
    }

    public int getActiveForks() { return activeForks; }
    public double getMainchainRate() { return mainchainRate; }
    public int getTotalBlocks() { return allBlocks.size(); }
    public List<Block> getAllBlocks() { return allBlocks; }
}