package com.sim.agent;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Queue;
import java.util.Random;
import java.util.Set;
import java.util.UUID;

import com.sim.blockchain.Attestation;
import com.sim.blockchain.Block;
import com.sim.network.NetworkMessage;

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
    private Set<String> attachedBlockIds = new HashSet<>();
    private Set<String> canonicalBlockIds = new HashSet<>();
    private Block highestBlock = null; 
    private String canonicalHeadId = null;

    private Map<String, Attestation> knownAttestations = new HashMap<>();
    
    private Queue<NetworkMessage> inbox = new LinkedList<>();
    private Map<String, List<Block>> orphansPendingParent = new HashMap<>(); 
    private Set<String> pendingOrphanIds = new HashSet<>();
    private Set<String> receivedMessageIds = new HashSet<>();
    private Set<String> requestedBlockIds = new HashSet<>();

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
        if (msg == null || msg.getMessageId() == null || !receivedMessageIds.add(msg.getMessageId())) {
            return;
        }
        inbox.offer(msg);
    }

    public void processMessages() {
        while (!inbox.isEmpty()) {
            NetworkMessage msg = inbox.poll();
            if (msg.getType() == NetworkMessage.MessageType.BLOCK) {
                if (receiveBlock((Block) msg.getPayload(), msg.getSenderId())) {
                    gossipBlock((Block) msg.getPayload(), msg.getSenderId());
                }
            } else if (msg.getType() == NetworkMessage.MessageType.ATTESTATION) {
                receiveAttestation((Attestation) msg.getPayload());
            } else if (msg.getType() == NetworkMessage.MessageType.BLOCK_REQUEST) {
                handleBlockRequest((String) msg.getPayload(), msg.getSenderId());
            } else if (msg.getType() == NetworkMessage.MessageType.BLOCK_RESPONSE) {
                if (receiveBlock((Block) msg.getPayload(), msg.getSenderId())) {
                    gossipBlock((Block) msg.getPayload(), msg.getSenderId());
                }
            }
        }
    }

    public boolean receiveBlock(Block block) {
        return receiveBlock(block, null);
    }

    private boolean receiveBlock(Block block, String sourceAgentId) {
        if (block == null) {
            return false;
        }
        if (knownBlocks.containsKey(block.getBlockId())) {
            return attachBlock(block.getBlockId());
        }

        // Structural validation
        if (!validateBlock(block)) {
            return false;
        }

        // Parent check
        String parentId = block.getPreviousBlockId();
        if (parentId != null && !parentId.equals("0") && !attachedBlockIds.contains(parentId)) {
            // Missing parent, put in orphan pool and request
            retainOrphan(block, parentId);
            requestBlock(parentId, sourceAgentId);
            return false;
        }

        return acceptBlock(block);
    }

    private boolean acceptBlock(Block block) {
        if (block == null || !validateBlock(block)) {
            return false;
        }

        if (knownBlocks.containsKey(block.getBlockId())) {
            return attachBlock(block.getBlockId());
        }

        knownBlocks.put(block.getBlockId(), block);
        indexChild(block);
        return attachBlock(block.getBlockId());
    }

    private void retainOrphan(Block block, String parentId) {
        knownBlocks.put(block.getBlockId(), block);
        indexChild(block);
        if (pendingOrphanIds.add(block.getBlockId())) {
            orphansPendingParent.computeIfAbsent(parentId, k -> new ArrayList<>()).add(block);
        }
    }

    private void indexChild(Block block) {
        String parentId = block.getPreviousBlockId();
        List<String> children = childrenByParent.computeIfAbsent(parentId, k -> new ArrayList<>());
        if (!children.contains(block.getBlockId())) {
            children.add(block.getBlockId());
        }
    }

    private boolean attachBlock(String blockId) {
        Block block = knownBlocks.get(blockId);
        if (block == null || attachedBlockIds.contains(blockId)) {
            return false;
        }
        String parentId = block.getPreviousBlockId();
        if (parentId != null && !parentId.equals("0") && !attachedBlockIds.contains(parentId)) {
            return false;
        }

        attachedBlockIds.add(blockId);
        pendingOrphanIds.remove(blockId);
        blocksAccepted++;

        // Process any orphans that were waiting for this block
        List<Block> resolvedOrphans = orphansPendingParent.remove(blockId);
        if (resolvedOrphans != null) {
            for (Block orphan : resolvedOrphans) {
                pendingOrphanIds.remove(orphan.getBlockId());
                attachBlock(orphan.getBlockId());
            }
        }

        updateCanonicalHead();
        return true;
    }

    private boolean validateBlock(Block block) {
        // Basic structural validation
        if (block == null || block.getBlockId() == null || block.getBlockId().isBlank()
                || block.getProducerAgentId() == null || block.getProducerAgentId().isBlank()) {
            return false;
        }
        if (Block.GENESIS_ID.equals(block.getBlockId())) {
            return "GENESIS".equals(block.getProducerAgentId())
                    && block.getPreviousBlockId() == null && block.getHeight() == 0;
        }
        if (block.getPreviousBlockId() == null || block.getPreviousBlockId().isBlank() || block.getHeight() <= 0) {
            return false;
        }
        if (wouldCreateCycle(block)) {
            return false;
        }
        Block parent = knownBlocks.get(block.getPreviousBlockId());
        if (parent != null && block.getHeight() != parent.getHeight() + 1) {
            return false;
        }
        return true;
    }

    private boolean wouldCreateCycle(Block block) {
        String currentId = block.getPreviousBlockId();
        Set<String> visited = new HashSet<>();
        while (currentId != null && visited.add(currentId)) {
            if (currentId.equals(block.getBlockId())) {
                return true;
            }
            Block current = knownBlocks.get(currentId);
            if (current == null) {
                return false;
            }
            currentId = current.getPreviousBlockId();
        }
        return currentId != null;
    }

    private void requestBlock(String missingBlockId, String preferredPeerId) {
        if (!requestedBlockIds.add(missingBlockId)) {
            return;
        }
        if (preferredPeerId != null && peers.contains(preferredPeerId)) {
            state.getNetworkModel().sendMessage(id, preferredPeerId,
                    NetworkMessage.MessageType.BLOCK_REQUEST, missingBlockId);
        } else {
            state.getNetworkModel().broadcastMessage(id,
                    NetworkMessage.MessageType.BLOCK_REQUEST, missingBlockId);
        }
    }

    private void handleBlockRequest(String requestedBlockId, String requesterId) {
        Block requestedBlock = knownBlocks.get(requestedBlockId);
        if (requestedBlock != null) {
            state.getNetworkModel().sendMessage(id, requesterId,
                    NetworkMessage.MessageType.BLOCK_RESPONSE, requestedBlock);
        }
    }

    private void gossipBlock(Block block, String sourceAgentId) {
        state.getNetworkModel().broadcastMessage(id, NetworkMessage.MessageType.BLOCK, block, sourceAgentId);
    }

    public void receiveAttestation(Attestation attestation) {
        if (!knownAttestations.containsKey(attestation.getAttestationId())) {
            knownAttestations.put(attestation.getAttestationId(), attestation);
            attestationsReceived++;
        }
    }

    private void updateCanonicalHead() {
        String consensusType = state.getConfig().getConsensusType();
        if (consensusType != null && (consensusType.contains("PoS") || consensusType.contains("PoA"))) {
            Block head = com.sim.consensus.LmdGhostForkChoice.calculateHead(this, state.getAgents());
            if (head != null) {
                this.highestBlock = head;
                this.canonicalHeadId = head.getBlockId();
            }
        } else {
            // Deterministic longest attached chain baseline for PoW.
            Block best = null;
            for (String blockId : attachedBlockIds) {
                Block b = knownBlocks.get(blockId);
                if (best == null || b.getHeight() > best.getHeight()
                        || (b.getHeight() == best.getHeight()
                        && b.getBlockId().compareTo(best.getBlockId()) > 0)) {
                    best = b;
                }
            }
            if (best != null) {
                this.highestBlock = best;
                this.canonicalHeadId = best.getBlockId();
            }
        }
        rebuildCanonicalPath();
    }

    private void rebuildCanonicalPath() {
        canonicalBlockIds.clear();
        String currentId = canonicalHeadId;
        while (currentId != null && canonicalBlockIds.add(currentId)) {
            Block current = knownBlocks.get(currentId);
            currentId = current == null ? null : current.getPreviousBlockId();
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
    public int getBlocksAccepted() { return blocksAccepted; }
    
    public Map<String, Block> getKnownBlocks() { return knownBlocks; }
    public Map<String, List<String>> getChildrenByParent() { return childrenByParent; }
    public Map<String, Attestation> getKnownAttestations() { return knownAttestations; }
    public Map<String, Block> getOrphanBlocks() {
        Map<String, Block> orphans = new HashMap<>();
        for (String blockId : pendingOrphanIds) {
            Block block = knownBlocks.get(blockId);
            if (block != null) {
                orphans.put(blockId, block);
            }
        }
        return orphans;
    }
    public Set<String> getCanonicalBlockIds() { return new HashSet<>(canonicalBlockIds); }
    public boolean isCanonical(String blockId) { return canonicalBlockIds.contains(blockId); }
    public boolean isStale(String blockId) {
        return attachedBlockIds.contains(blockId) && !canonicalBlockIds.contains(blockId);
    }
    public boolean isAttached(String blockId) { return attachedBlockIds.contains(blockId); }

    public Attestation createAttestation(int slot, int currentTick) {
        if (canonicalHeadId == null) return null;
        Attestation att = new Attestation(UUID.randomUUID().toString(), this.id, canonicalHeadId, slot, currentTick);
        knownAttestations.put(att.getAttestationId(), att);
        attestationsProduced++;
        return att;
    }
}