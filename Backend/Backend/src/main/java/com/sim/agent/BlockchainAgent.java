package com.sim.agent;

import com.sim.blockchain.Attestation;
import com.sim.blockchain.Block;
import com.sim.network.NetworkMessage;

import java.util.*;

public class BlockchainAgent {
    private String id;
    private double hashPower;
    private double stake;
    private List<String> peers = new ArrayList<>();
    
    private com.sim.engine.SimulationState state;
    private Random rng;

    // --- LOCAL STATE (Phase 1) ---
    private Map<String, Block> knownBlocks = new HashMap<>();
    private Map<String, List<String>> childrenByParent = new HashMap<>();
    private Block highestBlock = null; 
    private String canonicalHeadId = null;

    private List<Block> pendingBlocks = new ArrayList<>();
    private Map<String, Attestation> knownAttestations = new HashMap<>();
    
    private Queue<NetworkMessage> inbox = new LinkedList<>();
    private Map<String, List<Block>> orphansPendingParent = new HashMap<>(); 

    // Metrics
    private int blocksProduced = 0;
    private int blocksAccepted = 0;
    private int attestationsProduced = 0;
    private int attestationsReceived = 0;

    public BlockchainAgent(String id, Random rng, com.sim.engine.SimulationState state) {
        this.id = id;
        this.rng = rng;
        this.state = state;
        this.hashPower = rng.nextDouble() * 100;
        this.stake = rng.nextDouble() * 1000;
    }

    public String getId() { return id; }
    public double getHashPower() { return hashPower; }
    public double getStake() { return stake; }
    public List<String> getPeers() { return peers; }
    public void addPeer(String peerId) { if (!peers.contains(peerId)) peers.add(peerId); }
    public Random getRng() { return rng; }

    // --- PHASE 1: AGENT LIFECYCLE ---

    public void receiveMessage(NetworkMessage msg) {
        inbox.offer(msg);
    }

    public void processMessages() {
        while (!inbox.isEmpty()) {
            NetworkMessage msg = inbox.poll();
            if (msg.getType() == NetworkMessage.MessageType.BLOCK) {
                receiveBlock((Block) msg.getPayload());
            } else if (msg.getType() == NetworkMessage.MessageType.ATTESTATION) {
                receiveAttestation((Attestation) msg.getPayload());
            } else if (msg.getType() == NetworkMessage.MessageType.BLOCK_REQUEST) {
                handleBlockRequest((String) msg.getPayload(), msg.getSenderId());
            }
        }
    }

    public void receiveBlock(Block block) {
        if (knownBlocks.containsKey(block.getBlockId())) {
            return; // Already know this block
        }

        // Structural validation
        if (!validateBlock(block)) {
            return;
        }

        // Parent check
        String parentId = block.getPreviousBlockId();
        if (parentId != null && !parentId.equals("0") && !knownBlocks.containsKey(parentId)) {
            // Missing parent, put in orphan pool and request
            orphansPendingParent.computeIfAbsent(parentId, k -> new ArrayList<>()).add(block);
            requestBlock(parentId);
            return;
        }

        acceptBlock(block);
    }

    private void acceptBlock(Block block) {
        knownBlocks.put(block.getBlockId(), block);
        String parentId = block.getPreviousBlockId();
        childrenByParent.computeIfAbsent(parentId, k -> new ArrayList<>()).add(block.getBlockId());
        
        blocksAccepted++;

        // Process any orphans that were waiting for this block
        List<Block> resolvedOrphans = orphansPendingParent.remove(block.getBlockId());
        if (resolvedOrphans != null) {
            for (Block orphan : resolvedOrphans) {
                acceptBlock(orphan); // Recursively accept resolved orphans
            }
        }

        updateCanonicalHead();
    }

    private boolean validateBlock(Block block) {
        // Basic structural validation
        if (block == null || block.getBlockId() == null || block.getProducerAgentId() == null) {
            return false;
        }
        if (block.getHeight() < 0) {
            return false;
        }
        return true;
    }

    private void requestBlock(String missingBlockId) {
        // In Phase 2, this will route through the actual network model
        // For now, we just prepare the capability
    }

    private void handleBlockRequest(String requestedBlockId, String requesterId) {
        // In Phase 2, this will send the block back if we have it
    }

    public void receiveAttestation(Attestation attestation) {
        if (!knownAttestations.containsKey(attestation.getAttestationId())) {
            knownAttestations.put(attestation.getAttestationId(), attestation);
            attestationsReceived++;
        }
    }

    private void updateCanonicalHead() {
        if (state.getConfig().getConsensusType().contains("PoS") || state.getConfig().getConsensusType().contains("PoA")) {
            Block head = com.sim.consensus.LmdGhostForkChoice.calculateHead(this, state.getAgents());
            if (head != null) {
                this.highestBlock = head;
                this.canonicalHeadId = head.getBlockId();
            }
        } else {
            // Simple longest chain rule for PoW
            Block best = null;
            for (Block b : knownBlocks.values()) {
                if (best == null || b.getHeight() > best.getHeight()) {
                    best = b;
                }
            }
            if (best != null) {
                this.highestBlock = best;
                this.canonicalHeadId = best.getBlockId();
            }
        }
    }

    public Block getHighestBlock() { 
        return highestBlock; 
    }
    
    public String getCanonicalHeadId() {
        return canonicalHeadId;
    }
    
    public Block getBlock(String blockId) {
        return knownBlocks.get(blockId);
    }

    public void incrementBlocksProduced() { blocksProduced++; }
    public int getBlocksProduced() { return blocksProduced; }
    
    public Map<String, Block> getKnownBlocks() { return knownBlocks; }
    public Map<String, List<String>> getChildrenByParent() { return childrenByParent; }
    public Map<String, Attestation> getKnownAttestations() { return knownAttestations; }

    public Attestation createAttestation(int slot, int currentTick) {
        if (canonicalHeadId == null) return null;
        Attestation att = new Attestation(UUID.randomUUID().toString(), this.id, canonicalHeadId, slot, currentTick);
        knownAttestations.put(att.getAttestationId(), att);
        attestationsProduced++;
        return att;
    }
}