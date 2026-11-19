package com.sim.blockchain;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.HashSet;
import java.util.Set;
import com.sim.model.Transaction;

public class BlockchainState {
    private Map<String, Block> allBlocks = new HashMap<>();
    private Map<String, List<String>> childrenByParent = new HashMap<>();
    
    private int activeForks = 0;
    private double mainchainRate = 1.0;
    private Block globalCanonicalHead = null;
    private final Set<String> includedTransactionIds = new HashSet<>();

    public BlockchainState() {
        Block genesis = new Block(Block.GENESIS_ID, null, "GENESIS", 0, 0);
        allBlocks.put(genesis.getBlockId(), genesis);
        childrenByParent.computeIfAbsent(null, k -> new ArrayList<>()).add(genesis.getBlockId());
        recalculateMetrics();
    }

    public boolean addBlock(Block block) {
        if (block == null || block.getBlockId() == null || allBlocks.containsKey(block.getBlockId())) {
            return false;
        }
        allBlocks.put(block.getBlockId(), block);
        block.getTransactions().forEach(transaction -> includedTransactionIds.add(transaction.getTxId()));
        String parentId = block.getPreviousBlockId();
        childrenByParent.computeIfAbsent(parentId, k -> new ArrayList<>()).add(block.getBlockId());
        
        recalculateMetrics();
        return true;
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

        // Mainchain rate mu = |M| / |B| (Kraner et al.), where B excludes the genesis
        // block and M is the canonical chain. A run with only genesis is fully canonical.
        int nonGenesisBlocks = Math.max(0, allBlocks.size() - 1);
        int canonicalBlocks = best == null ? 0 : best.getHeight();
        if (nonGenesisBlocks == 0) {
            this.mainchainRate = 1.0;
        } else {
            this.mainchainRate = Math.min(1.0, (double) canonicalBlocks / nonGenesisBlocks);
        }
    }

    public int getActiveForks() { return activeForks; }
    public double getMainchainRate() { return mainchainRate; }
    /** Canonical chain length in blocks after genesis (the paper's |M|). */
    public int getCanonicalBlockCount() {
        return globalCanonicalHead == null ? 0 : globalCanonicalHead.getHeight();
    }
    /** Blocks that are not part of the canonical chain (the paper's |Theta|). */
    public int getOffChainBlockCount() {
        return Math.max(0, getTotalBlocks() - 1 - getCanonicalBlockCount());
    }
    /**
     * Branching ratio F = |Theta| / |M|: off-chain blocks per canonical block.
     * Because mu = |M| / (|M| + |Theta|), F is the direct fork counterpart of the
     * mainchain rate and equals (1 - mu) / mu when mu > 0.
     */
    public double getBranchingRatio() {
        int canonical = getCanonicalBlockCount();
        return canonical == 0 ? 0.0 : (double) getOffChainBlockCount() / canonical;
    }
    public int getTotalBlocks() { return allBlocks.size(); }
    public Collection<Block> getAllBlocks() { return allBlocks.values(); }
    public Block getGlobalCanonicalHead() { return globalCanonicalHead; }
    public int getIncludedTransactionCount() { return includedTransactionIds.size(); }
    public Block getGenesisBlock() { return allBlocks.get(Block.GENESIS_ID); }
}