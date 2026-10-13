package com.sim.network;

import java.util.Comparator;
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

    public NetworkModel(SimulationState state) {
        this.state = state;
        this.messageQueue = new PriorityQueue<>(Comparator.comparingInt(NetworkMessage::getDeliveryTick));
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
        BlockchainAgent sender = state.getAgent(senderId);
        BlockchainAgent receiver = state.getAgent(receiverId);
        if (sender == null || receiver == null || !sender.getPeers().contains(receiverId)) {
            return;
        }

        int latencyTicks = Math.max(1, (int)(state.getConfig().getBlockGossipLatency() * 10));
        int jitter = state.getRng().nextInt(3);
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
        messagesSent++;
    }

    public void deliverMessages() {
        int currentTick = state.getCurrentTick();
        while (!messageQueue.isEmpty() && messageQueue.peek().getDeliveryTick() <= currentTick) {
            NetworkMessage msg = messageQueue.poll();
            BlockchainAgent receiver = state.getAgent(msg.getReceiverId());
            if (receiver != null) {
                receiver.receiveMessage(msg);
                messagesDelivered++;
            }
        }
    }
    
    public int getMessagesSent() { return messagesSent; }
    public int getMessagesDelivered() { return messagesDelivered; }
}