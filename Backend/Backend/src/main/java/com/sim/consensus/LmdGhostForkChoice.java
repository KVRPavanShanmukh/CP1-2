package com.sim.consensus;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.sim.agent.BlockchainAgent;
import com.sim.blockchain.Attestation;
import com.sim.blockchain.Block;

public class LmdGhostForkChoice {
    
    public static Block calculateHead(BlockchainAgent agent, List<BlockchainAgent> allAgents) {
        Map<String, Block> blocks = agent.getKnownBlocks();
        if (blocks.isEmpty()) return null;
        
        Block root = null;
        for (Block b : blocks.values()) {
            if (!agent.isAttached(b.getBlockId())) {
                continue;
            }
            if (root == null || b.getHeight() < root.getHeight()
                    || (b.getHeight() == root.getHeight()
                    && b.getBlockId().compareTo(root.getBlockId()) < 0)) {
                root = b;
            }
        }
        if (root == null) return null;
        
        Map<String, List<String>> childrenMap = agent.getChildrenByParent();
        
        // 1. Get the latest message (attestation) per validator
        Map<String, Attestation> latestPerValidator = new HashMap<>();
        latestPerValidator.putAll(agent.getLatestAttestations());
        
        // 2. Pre-calculate stake mapping for fast lookup
        Map<String, Double> validatorStakes = new HashMap<>();
        for (BlockchainAgent a : allAgents) {
            validatorStakes.put(a.getId(), a.getStake());
        }

        // 3. Compute vote weight for each block directly voted on
        Map<String, Double> directVotes = new HashMap<>();
        for (Attestation att : latestPerValidator.values()) {
            double stake = validatorStakes.getOrDefault(att.getValidatorId(), 0.0);
            directVotes.put(att.getBlockId(), directVotes.getOrDefault(att.getBlockId(), 0.0) + stake);
        }

        // 4. LMD-GHOST recursive step
        Block current = root;
        while (true) {
            List<String> childrenIds = childrenMap.get(current.getBlockId());
            if (childrenIds == null || childrenIds.isEmpty()) {
                break; // Reached a leaf
            }
            
            // Find the child with the highest accumulated weight
            Block bestChild = null;
            double bestWeight = -1;
            
            for (String childId : childrenIds) {
                if (!agent.isAttached(childId)) {
                    continue;
                }
                Block child = blocks.get(childId);
                if (child == null) continue;
                
                double weight = getAccumulatedWeight(childId, childrenMap, directVotes);
                if (weight > bestWeight || (weight == bestWeight && childId.compareTo(bestChild != null ? bestChild.getBlockId() : "") > 0)) {
                    bestWeight = weight;
                    bestChild = child;
                }
            }
            
            if (bestChild != null) {
                current = bestChild;
            } else {
                break;
            }
        }
        
        return current;
    }
    
    private static double getAccumulatedWeight(String rootBlockId, Map<String, List<String>> childrenMap, Map<String, Double> directVotes) {
        double totalWeight = directVotes.getOrDefault(rootBlockId, 0.0);
        List<String> children = childrenMap.get(rootBlockId);
        if (children != null) {
            for (String childId : children) {
                totalWeight += getAccumulatedWeight(childId, childrenMap, directVotes);
            }
        }
        return totalWeight;
    }
}
