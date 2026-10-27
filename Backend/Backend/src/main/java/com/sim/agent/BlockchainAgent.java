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
import com.sim.consensus.DposConsensus;
import com.sim.consensus.PoaConsensus;
import com.sim.consensus.PolConsensus;
import com.sim.network.NetworkMessage;
import com.sim.model.Transaction;

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
    private Map<String, Attestation> latestAttestationsByValidator = new HashMap<>();
    
    private Queue<NetworkMessage> inbox = new LinkedList<>();
    private Map<String, List<Block>> orphansPendingParent = new HashMap<>(); 
    private Set<String> pendingOrphanIds = new HashSet<>();
    private Set<String> receivedMessageIds = new HashSet<>();
    private Set<String> requestedBlockIds = new HashSet<>();
    private final TransactionMempool mempool;

    // Metrics
    private int blocksProduced = 0;
    private int blocksProposed = 0;
    private int blocksAccepted = 0;
    private int blocksRejected = 0;
    private int duplicateMessages = 0;
    private int attestationsProduced = 0;
    private int attestationsReceived = 0;

    /**
     * When true this agent receives and processes incoming messages but does not
     * initiate any outbound activity: no gossip, no block requests, no block
     * production, no attestation creation, no transaction generation.
     * Set via {@link #setInactive(boolean)} after construction.
     */
    private boolean inactive = false;

    public BlockchainAgent(String id, Random rng, com.sim.engine.SimulationState state) {
        this.id = id;
        this.rng = rng;
        this.state = state;
        this.hashPower = rng.nextDouble() * 100;
        this.stake = rng.nextDouble() * 1000;
        this.mempool = new TransactionMempool(state.getConfig().getMempoolCapacity());
    }

    public String getId() { return id; }
    public double getHashPower() { return hashPower; }
    public double getStake() { return stake; }
    public List<String> getPeers() { return peers; }
    public void addPeer(String peerId) { if (!peers.contains(peerId)) peers.add(peerId); }
    public Random getRng() { return rng; }
    protected com.sim.engine.SimulationState getSimulationState() { return state; }
    public boolean isInactive() { return inactive; }
    public void setInactive(boolean inactive) { this.inactive = inactive; }
    public boolean isByzantineBehaviorEnabled() { return false; }
    public boolean addTransaction(Transaction transaction) {
        if (transaction == null || !id.equals(transaction.getSenderId())
                || state.getAgent(transaction.getReceiverId()) == null) return false;
        return mempool.add(transaction);
    }
    public List<Transaction> getPendingTransactions() { return List.copyOf(mempool.getTransactions()); }
    public int getMempoolSize() { return mempool.size(); }
    public void removeIncludedTransactions(List<Transaction> transactions) {
        if (transactions != null) transactions.forEach(transaction -> mempool.remove(transaction.getTxId()));
    }

    // --- PHASE 1: AGENT LIFECYCLE ---

    public boolean receiveMessage(NetworkMessage msg) {
        if (msg == null || msg.getMessageId() == null || !receivedMessageIds.add(msg.getMessageId())) {
            return false;
        }
        if (msg.getPayload() instanceof Block block && knownBlocks.containsKey(block.getBlockId())) {
            return false;
        }
        if (msg.getPayload() instanceof Attestation attestation
                && knownAttestations.containsKey(attestation.getAttestationId())) {
            return false;
        }
        inbox.offer(msg);
        return true;
    }

    public void processMessages() {
        while (!inbox.isEmpty()) {
            NetworkMessage msg = inbox.poll();
            if (msg.getType() == NetworkMessage.MessageType.BLOCK) {
                Block block = (Block) msg.getPayload();
                boolean knownBefore = block != null && knownBlocks.containsKey(block.getBlockId());
                if (receiveBlock(block, msg.getSenderId())) {
                    if (!inactive) gossipBlock((Block) msg.getPayload(), msg.getSenderId());
                } else if (knownBefore) {
                    duplicateMessages++;
                }
            } else if (msg.getType() == NetworkMessage.MessageType.ATTESTATION) {
                if (receiveAttestation((Attestation) msg.getPayload())) {
                    if (!inactive) gossipAttestation((Attestation) msg.getPayload(), msg.getSenderId());
                }
            } else if (msg.getType() == NetworkMessage.MessageType.BLOCK_REQUEST) {
                // Inactive agents do not respond to block requests (that would be outbound activity).
                if (!inactive) handleBlockRequest((String) msg.getPayload(), msg.getSenderId());
            } else if (msg.getType() == NetworkMessage.MessageType.BLOCK_RESPONSE) {
                Block block = (Block) msg.getPayload();
                boolean knownBefore = block != null && knownBlocks.containsKey(block.getBlockId());
                if (receiveBlock(block, msg.getSenderId())) {
                    if (!inactive) gossipBlock((Block) msg.getPayload(), msg.getSenderId());
                } else if (knownBefore) {
                    duplicateMessages++;
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
            blocksRejected++;
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
        if (state.getAgent(block.getProducerAgentId()) == null) {
            return false;
        }
        if (block.getPreviousBlockId() == null || block.getPreviousBlockId().isBlank() || block.getHeight() <= 0) {
            return false;
        }
        String consensusType = state.getConfig().getConsensusType();
        if ("DPoS".equalsIgnoreCase(consensusType)
                && !DposConsensus.isEligible(block.getProducerAgentId(), block.getTickProduced(), state)) {
            return false;
        }
        if ("PoA".equalsIgnoreCase(consensusType)
                && !PoaConsensus.isAuthorized(block.getProducerAgentId(), state)) {
            return false;
        }
        if ("PoL".equalsIgnoreCase(consensusType)
                && !PolConsensus.isEligible(block.getProducerAgentId(), state)) {
            return false;
        }
        if (wouldCreateCycle(block)) {
            return false;
        }
        Set<String> transactionIds = new HashSet<>();
        for (Transaction transaction : block.getTransactions()) {
            if (transaction == null || !transactionIds.add(transaction.getTxId())
                    || state.getAgent(transaction.getSenderId()) == null
                    || state.getAgent(transaction.getReceiverId()) == null) return false;
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

    private void gossipAttestation(Attestation attestation, String sourceAgentId) {
        state.getNetworkModel().broadcastMessage(id, NetworkMessage.MessageType.ATTESTATION,
                attestation, sourceAgentId);
    }

    public boolean receiveAttestation(Attestation attestation) {
        if (!validateAttestation(attestation) || knownAttestations.containsKey(attestation.getAttestationId())) {
            return false;
        }
        knownAttestations.put(attestation.getAttestationId(), attestation);
        Attestation latest = latestAttestationsByValidator.get(attestation.getValidatorId());
        if (latest == null || isNewer(attestation, latest)) {
            latestAttestationsByValidator.put(attestation.getValidatorId(), attestation);
            updateCanonicalHead();
        }
        attestationsReceived++;
        return true;
    }

    private boolean validateAttestation(Attestation attestation) {
        if (attestation == null || attestation.getAttestationId() == null
                || attestation.getAttestationId().isBlank()
                || attestation.getValidatorId() == null || attestation.getValidatorId().isBlank()
                || attestation.getBlockId() == null || attestation.getBlockId().isBlank()
                || attestation.getSlot() < 0 || attestation.getTimestamp() < 0) {
            return false;
        }
        if (state.getAgent(attestation.getValidatorId()) == null) {
            return false;
        }
        return attachedBlockIds.contains(attestation.getBlockId());
    }

    private boolean isNewer(Attestation candidate, Attestation current) {
        return candidate.getSlot() > current.getSlot()
                || (candidate.getSlot() == current.getSlot()
                && candidate.getTimestamp() > current.getTimestamp());
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
    public void incrementBlocksProposed() { blocksProposed++; }
    public int getBlocksProposed() { return blocksProposed; }
    public int getBlocksAccepted() { return blocksAccepted; }
    public int getBlocksRejected() { return blocksRejected; }
    public int getDuplicateMessages() { return duplicateMessages; }
    public int getAttestationsProduced() { return attestationsProduced; }
    public int getAttestationsReceived() { return attestationsReceived; }
    
    public Map<String, Block> getKnownBlocks() { return knownBlocks; }
    public Map<String, List<String>> getChildrenByParent() { return childrenByParent; }
    public Map<String, Attestation> getKnownAttestations() { return knownAttestations; }
    public Map<String, Attestation> getLatestAttestations() {
        return new HashMap<>(latestAttestationsByValidator);
    }
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
        if (canonicalHeadId == null || !attachedBlockIds.contains(canonicalHeadId)) return null;
        Attestation att = new Attestation(UUID.randomUUID().toString(), this.id, canonicalHeadId, slot, currentTick);
        if (!receiveAttestation(att)) return null;
        attestationsProduced++;
        return att;
    }
}