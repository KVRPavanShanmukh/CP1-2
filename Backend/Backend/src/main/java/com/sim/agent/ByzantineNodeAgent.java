package com.sim.agent;

import com.sim.blockchain.Attestation;
import com.sim.blockchain.Block;
import com.sim.network.NetworkMessage;

import java.util.Random;

public class ByzantineNodeAgent extends BlockchainAgent {
    private boolean equivocationEnabled = true;
    private boolean delayedPropagationEnabled = false;

    public ByzantineNodeAgent(String id, Random rng, com.sim.engine.SimulationState state) {
        super(id, rng, state);
    }

    @Override
    public Attestation createAttestation(int slot, int currentTick) {
        if (!equivocationEnabled) {
            return super.createAttestation(slot, currentTick);
        }

        // Equivocation: Create an attestation for a random known block instead of the canonical head
        Object[] blocks = getKnownBlocks().values().toArray();
        if (blocks.length == 0) return null;
        
        Block randomBlock = (Block) blocks[getRng().nextInt(blocks.length)];
        
        Attestation att = new Attestation(java.util.UUID.randomUUID().toString(), this.getId(), randomBlock.getBlockId(), slot, currentTick);
        getKnownAttestations().put(att.getAttestationId(), att);
        
        // Let's call the super metric increment if possible, or just ignore for simplicity since metrics are mostly private in superclass.
        // I will just return the fake attestation.
        return att;
    }

    @Override
    public void processMessages() {
        if (delayedPropagationEnabled) {
            // Randomly skip processing to simulate delay or selective processing
            if (getRng().nextDouble() < 0.3) {
                return; 
            }
        }
        super.processMessages();
    }
}
