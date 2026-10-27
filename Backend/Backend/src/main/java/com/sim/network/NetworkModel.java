package com.sim.network;

import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.PriorityQueue;
import java.util.UUID;

import com.sim.agent.BlockchainAgent;
import com.sim.engine.SimulationState;

public class NetworkModel {
    private SimulationState state;
    private PriorityQueue<NetworkMessage> messageQueue;

    // Metrics
    private int messagesSent = 0;
    private int messagesDelivered = 0;
    private int messagesDropped = 0;
    private int duplicateMessages = 0;
    private long totalDeliveryDelayTicks = 0;
    private long totalBlockPropagationDelayTicks = 0;
    private int totalBlockDeliveries = 0;

    // Partition tracking
    private final Map<String, Integer> partitionMap = new HashMap<>();
    private int partitionStartTick = -1;
    private int partitionEndTick = -1;

    public NetworkModel(SimulationState state) {
        this.state = state;
        this.messageQueue = new PriorityQueue<>(Comparator.comparingInt(NetworkMessage::getDeliveryTick));
        this.partitionStartTick = state.getConfig().getPartitionStartTick();
        this.partitionEndTick = state.getConfig().getPartitionEndTick();
    }

    public void initializeTopology() {
        String topology = state.getConfig().getNetworkTopology();
        int n = state.getAgents().size();

        if ("Small-World".equalsIgnoreCase(topology)) {
            // Ring lattice with k=4, beta=0.2
            for (int i = 0; i < n; i++) {
                for (int j = 1; j <= 2; j++) {
                    int neighbor = (i + j) % n;
                    addBidirectionalPeer(i, neighbor);
                }
            }
            // Rewiring
            for (int i = 0; i < n; i++) {
                if (state.getRng().nextDouble() < 0.2) {
                    int randomPeer = state.getRng().nextInt(n);
                    if (randomPeer != i) {
                        addBidirectionalPeer(i, randomPeer);
                    }
                }
            }
        } else if ("Scale-Free".equalsIgnoreCase(topology)) {
            // Barabasi-Albert model (simplified)
            // Start with a small clique
            int m0 = Math.min(3, n);
            for (int i = 0; i < m0; i++) {
                for (int j = i + 1; j < m0; j++) {
                    addBidirectionalPeer(i, j);
                }
            }
            // Add remaining nodes with preferential attachment
            for (int i = m0; i < n; i++) {
                int targetDegreeSum = 0;
                for (int j = 0; j < i; j++) {
                    targetDegreeSum += state.getAgents().get(j).getPeers().size();
                }
                if (targetDegreeSum == 0) {
                    addBidirectionalPeer(i, state.getRng().nextInt(i));
                    continue;
                }
                
                int edgesToAdd = Math.min(2, i);
                int added = 0;
                while (added < edgesToAdd) {
                    int target = state.getRng().nextInt(i);
                    double prob = (double) state.getAgents().get(target).getPeers().size() / targetDegreeSum;
                    if (state.getRng().nextDouble() < prob) {
                        addBidirectionalPeer(i, target);
                        added++;
                    }
                }
            }
        } else {
            // Default Erdos-Renyi
            double p = Math.min(1.0, 5.0 / n); // Aim for avg degree ~ 5
            for (int i = 0; i < n; i++) {
                for (int j = i + 1; j < n; j++) {
                    if (state.getRng().nextDouble() < p) {
                        addBidirectionalPeer(i, j);
                    }
                }
            }
        }
        initializePartitions();
    }

    public void initializePartitions() {
        partitionMap.clear();
        List<String> groupA = state.getConfig().getPartitionGroupA();
        List<String> groupB = state.getConfig().getPartitionGroupB();
        if (!groupA.isEmpty() || !groupB.isEmpty()) {
            for (String id : groupA) {
                partitionMap.put(id, 0);
            }
            for (String id : groupB) {
                partitionMap.put(id, 1);
            }
        } else if (state.getConfig().getPartitionRatio() > 0.0) {
            int n = state.getAgents().size();
            int groupASize = Math.max(1, (int) Math.round(n * (1.0 - state.getConfig().getPartitionRatio())));
            for (int i = 0; i < n; i++) {
                partitionMap.put(state.getAgents().get(i).getId(), i < groupASize ? 0 : 1);
            }
        }
    }

    public void setPartition(int startTick, int endTick, List<String> groupA, List<String> groupB) {
        this.partitionStartTick = startTick;
        this.partitionEndTick = endTick;
        partitionMap.clear();
        if (groupA != null) groupA.forEach(id -> partitionMap.put(id, 0));
        if (groupB != null) groupB.forEach(id -> partitionMap.put(id, 1));
    }

    public void setPartitionRatio(double ratio, int startTick, int endTick) {
        this.partitionStartTick = startTick;
        this.partitionEndTick = endTick;
        partitionMap.clear();
        int n = state.getAgents().size();
        int groupASize = Math.max(1, (int) Math.round(n * (1.0 - ratio)));
        for (int i = 0; i < n; i++) {
            partitionMap.put(state.getAgents().get(i).getId(), i < groupASize ? 0 : 1);
        }
    }

    public void healPartition() {
        this.partitionEndTick = state.getCurrentTick() - 1;
    }

    public boolean isPartitionActive() {
        int currentTick = state.getCurrentTick();
        if (partitionStartTick < 0) {
            return false;
        }
        if (currentTick < partitionStartTick) {
            return false;
        }
        if (partitionEndTick >= 0 && currentTick > partitionEndTick) {
            return false;
        }
        if (partitionMap.isEmpty()) {
            initializePartitions();
        }
        return !partitionMap.isEmpty();
    }

    public boolean isCrossPartition(String senderId, String receiverId) {
        Integer g1 = partitionMap.get(senderId);
        Integer g2 = partitionMap.get(receiverId);
        return g1 != null && g2 != null && !g1.equals(g2);
    }

    private void addBidirectionalPeer(int i, int j) {
        state.getAgents().get(i).addPeer(state.getAgents().get(j).getId());
        state.getAgents().get(j).addPeer(state.getAgents().get(i).getId());
    }

    public void broadcastMessage(String senderId, NetworkMessage.MessageType type, Object payload) {
        broadcastMessage(senderId, type, payload, null);
    }

    public void broadcastMessage(String senderId, NetworkMessage.MessageType type, Object payload,
                                 String excludedReceiverId) {
        BlockchainAgent sender = state.getAgent(senderId);
        if (sender == null) return;

        for (String peerId : sender.getPeers()) {
            if (peerId.equals(excludedReceiverId)) {
                continue;
            }
            sendMessage(senderId, peerId, type, payload);
        }
    }

    public void sendMessage(String senderId, String receiverId, NetworkMessage.MessageType type, Object payload) {
        messagesSent++;

        BlockchainAgent sender = state.getAgent(senderId);
        BlockchainAgent receiver = state.getAgent(receiverId);
        if (sender == null || receiver == null || !sender.getPeers().contains(receiverId)) {
            messagesDropped++;
            return;
        }

        // 1. Partition isolation check
        if (isPartitionActive() && isCrossPartition(senderId, receiverId)) {
            messagesDropped++;
            return;
        }

        // 2. Packet loss check (uses state seeded RNG)
        double packetLossRate = state.getConfig().getPacketLossRate();
        if (packetLossRate > 0.0 && state.getRng().nextDouble() < packetLossRate) {
            messagesDropped++;
            return;
        }

        int latencyTicks = Math.max(1, (int)(state.getConfig().getBlockGossipLatency() * 10));
        int maxJitter = state.getConfig().getNetworkLatencyJitter();
        int jitter = maxJitter > 0 ? state.getRng().nextInt(maxJitter + 1) : 0;
        int deliveryTick = state.getCurrentTick() + latencyTicks + jitter;

        NetworkMessage msg = new NetworkMessage(
            UUID.randomUUID().toString(),
            type,
            senderId,
            receiverId,
            payload,
            state.getCurrentTick(),
            deliveryTick
        );
        messageQueue.offer(msg);
        totalDeliveryDelayTicks += deliveryTick - state.getCurrentTick();
    }

    public void deliverMessages() {
        int currentTick = state.getCurrentTick();
        while (!messageQueue.isEmpty() && messageQueue.peek().getDeliveryTick() <= currentTick) {
            NetworkMessage msg = messageQueue.poll();
            BlockchainAgent receiver = state.getAgent(msg.getReceiverId());
            if (receiver != null) {
                // Check if partition became active while message was in transit
                if (isPartitionActive() && isCrossPartition(msg.getSenderId(), msg.getReceiverId())) {
                    messagesDropped++;
                    continue;
                }
                boolean accepted = receiver.receiveMessage(msg);
                if (!accepted) {
                    duplicateMessages++;
                }
                messagesDelivered++;
                // Record block propagation latency only for newly accepted (non-duplicate) peer blocks
                if (accepted && msg.getType() == NetworkMessage.MessageType.BLOCK
                        && msg.getPayload() instanceof com.sim.blockchain.Block block) {
                    if (!receiver.getId().equals(block.getProducerAgentId())) {
                        totalBlockPropagationDelayTicks += Math.max(0, currentTick - block.getTickProduced());
                        totalBlockDeliveries++;
                    }
                }
            } else {
                messagesDropped++;
            }
        }
    }
    
    public int getMessagesSent() { return messagesSent; }
    public int getMessagesDelivered() { return messagesDelivered; }
    public int getMessagesDropped() { return messagesDropped; }
    public int getDuplicateMessages() { return duplicateMessages; }
    public int getQueuedMessages() { return messageQueue.size(); }
    public double getAverageDeliveryDelayTicks() {
        return messagesSent == 0 ? 0.0 : (double) totalDeliveryDelayTicks / messagesSent;
    }
    public double getAverageBlockPropagationDelay() {
        return totalBlockDeliveries == 0 ? 0.0 : (double) totalBlockPropagationDelayTicks / totalBlockDeliveries;
    }
    public Map<String, Integer> getPartitionMap() {
        return new HashMap<>(partitionMap);
    }
}