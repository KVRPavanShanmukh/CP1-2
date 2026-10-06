package com.sim.agent;

import com.sim.blockchain.Block;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

public class BlockchainAgent {
    private String id;
    private double hashPower;
    private double stake;
    private List<String> peers = new ArrayList<>();
    private List<Block> pendingBlocks = new ArrayList<>();
    private Block highestBlock = null;

    private int blocksProduced = 0;
    private int blocksAccepted = 0;

    public BlockchainAgent(String id, Random rng) {
        this.id = id;
        this.hashPower = rng.nextDouble() * 100;
        this.stake = rng.nextDouble() * 1000;
    }

    public String getId() { return id; }
    public double getHashPower() { return hashPower; }
    public double getStake() { return stake; }
    public List<String> getPeers() { return peers; }
    public void addPeer(String peerId) { if (!peers.contains(peerId)) peers.add(peerId); }
    
    public Block getHighestBlock() { return highestBlock; }
    
    public void receiveBlock(Block block) {
        if (highestBlock == null || block.getHeight() > highestBlock.getHeight()) {
            highestBlock = block;
            blocksAccepted++;
        }
    }
    
    public void incrementBlocksProduced() { blocksProduced++; }
    public int getBlocksProduced() { return blocksProduced; }
}