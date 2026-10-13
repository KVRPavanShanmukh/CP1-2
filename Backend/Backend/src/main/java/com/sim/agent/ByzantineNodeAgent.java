package com.sim.agent;

import com.sim.blockchain.Attestation;
import com.sim.blockchain.Block;

import java.util.Random;
import java.util.ArrayList;
import java.util.List;

public class ByzantineNodeAgent extends BlockchainAgent {
    private boolean equivocationEnabled = true;
    private boolean delayedPropagationEnabled = false;

    public ByzantineNodeAgent(String id, Random rng, com.sim.engine.SimulationState state) {
        super(id, rng, state);
    }

    @Override
    public boolean isByzantineBehaviorEnabled() {
        return getSimulationState().getConfig().isByzantineBehaviorEnabled();
    }

    @Override
    public Attestation createAttestation(int slot, int currentTick) {
        if (!isByzantineBehaviorEnabled() || !equivocationEnabled) {
            return super.createAttestation(slot, currentTick);
        }

        List<Block> attachedBlocks = new ArrayList<>();
        for (Block block : getKnownBlocks().values()) {
            if (isAttached(block.getBlockId())) {
                attachedBlocks.add(block);
            }
        }
        if (attachedBlocks.isEmpty()) return null;

        Block randomBlock = attachedBlocks.get(getRng().nextInt(attachedBlocks.size()));
        
        String attestationId = getId() + "-byzantine-attestation-" + slot + "-" + currentTick
            + "-" + randomBlock.getBlockId();
        Attestation att = new Attestation(attestationId, this.getId(), randomBlock.getBlockId(), slot, currentTick);
        return receiveAttestation(att) ? att : null;
    }

    @Override
    public void processMessages() {
        if (isByzantineBehaviorEnabled() && delayedPropagationEnabled) {
            // Randomly skip processing to simulate delay or selective processing
            if (getRng().nextDouble() < 0.3) {
                return; 
            }
        }
        super.processMessages();
    }
}
