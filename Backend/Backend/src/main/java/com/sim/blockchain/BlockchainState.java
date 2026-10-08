package com.sim.blockchain;

import java.util.*;

public class BlockchainState {
    private Map<String, Block> allBlocks = new HashMap<>();
    private Map<String, List<String>> childrenByParent = new HashMap<>();
    
    private int activeForks = 0;
    private double mainchainRate = 1.0;
    private Block globalCanonicalHead = null;

    public void addBlock(Block block) {
        allBlocks.put(block.getBlockId(), block);
        String parentId = block.getPreviousBlockId();
        childrenByParent.computeIfAbsent(parentId, k -> new ArrayList<>()).add(block.getBlockId());
        
        recalculateMetrics();
    }

    private void recalculateMetrics() {
        // Calculate active forks: any block with >1 child is a branching point
        int forks = 0;
        for (List<String> children : childrenByParent.values()) {
            if (children.size() > 1) {
                forks += (children.size() - 1);
            }
        }
        this.activeForks = forks;

        // Calculate global canonical head (longest chain)
        Block best = null;
        for (Block b : allBlocks.values()) {
            if (best == null || b.getHeight() > best.getHeight()) {
                best = b;
            }
        }
        this.globalCanonicalHead = best;

        // Mainchain rate: canonical blocks / total blocks
        if (allBlocks.size() > 0 && best != null) {
            this.mainchainRate = (double) best.getHeight() / allBlocks.size();
        }
    }

    public int getActiveForks() { return activeForks; }
    public double getMainchainRate() { return mainchainRate; }
    public int getTotalBlocks() { return allBlocks.size(); }
    public Collection<Block> getAllBlocks() { return allBlocks.values(); }
    public Block getGlobalCanonicalHead() { return globalCanonicalHead; }
}