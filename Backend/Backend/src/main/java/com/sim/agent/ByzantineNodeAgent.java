package com.sim.agent;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Random;
import java.util.UUID;

import com.sim.blockchain.Attestation;
import com.sim.blockchain.Block;

/**
 * Autonomous Byzantine agent supporting explicit, deterministic attack modes:
 *
 * <ul>
 *   <li><b>EQUIVOCATION</b>: Targets non-canonical/random attached blocks for attestations
 *       in PoS, splitting fork choice weight.</li>
 *   <li><b>BLOCK_WITHHOLDING</b>: Produces valid blocks locally but suppresses network
 *       propagation, depriving honest peers of chain progression.</li>
 *   <li><b>INVALID_BLOCK</b>: Proposes structurally invalid blocks over the network,
 *       exercising peer validation and rejection tracking.</li>
 *   <li><b>ALL</b>: Combines attestation equivocation and block withholding.</li>
 *   <li><b>NONE</b>: Behaves honestly regardless of enablement flag.</li>
 * </ul>
 *
 * All attack decisions are deterministic based on the agent's seeded RNG.
 */
public class ByzantineNodeAgent extends BlockchainAgent {
    private boolean equivocationEnabled = true;
    private boolean delayedPropagationEnabled = false;

    private int maliciousActionsAttempted = 0;
    private int blocksWithheld = 0;
    private int conflictingAttestations = 0;
    private final List<Block> withheldBlocks = new ArrayList<>();

    public ByzantineNodeAgent(String id, Random rng, com.sim.engine.SimulationState state) {
        super(id, rng, state);
    }

    @Override
    public boolean isByzantineBehaviorEnabled() {
        return getSimulationState().getConfig().isByzantineBehaviorEnabled();
    }

    public String getAttackMode() {
        String mode = getSimulationState().getConfig().getByzantineAttackMode();
        return mode == null || mode.isBlank() ? "EQUIVOCATION" : mode.trim().toUpperCase(Locale.ROOT);
    }

    @Override
    public int getMaliciousActionsAttempted() {
        return maliciousActionsAttempted;
    }

    @Override
    public int getBlocksWithheld() {
        return blocksWithheld;
    }

    @Override
    public int getConflictingAttestations() {
        return conflictingAttestations;
    }

    public List<Block> getWithheldBlocksList() {
        return List.copyOf(withheldBlocks);
    }

    @Override
    public boolean shouldWithholdBlock(Block block) {
        if (!isByzantineBehaviorEnabled()) {
            return false;
        }
        String mode = getAttackMode();
        return "BLOCK_WITHHOLDING".equals(mode) || "ALL".equals(mode);
    }

    @Override
    public void onBlockWithheld(Block block) {
        blocksWithheld++;
        maliciousActionsAttempted++;
        withheldBlocks.add(block);
    }

    /**
     * Broadcasts previously withheld blocks to peers, modeling delayed release
     * in selfish mining strategies.
     */
    public void releaseWithheldBlocks() {
        for (Block block : withheldBlocks) {
            getSimulationState().getNetworkModel().broadcastMessage(
                    getId(), com.sim.network.NetworkMessage.MessageType.BLOCK, block);
        }
        withheldBlocks.clear();
    }

    @Override
    public boolean shouldProposeInvalidBlock() {
        if (!isByzantineBehaviorEnabled()) {
            return false;
        }
        String mode = getAttackMode();
        return "INVALID_BLOCK".equals(mode);
    }

    @Override
    public boolean proposeInvalidBlock(com.sim.engine.SimulationState state) {
        incrementBlocksProposed();
        maliciousActionsAttempted++;
        // Construct a structurally invalid block (negative height, invalid parent)
        Block invalidBlock = new Block(
                UUID.randomUUID().toString(),
                "invalid-parent-" + state.getCurrentTick(),
                getId(),
                -1,
                state.getCurrentTick(),
                List.of()
        );
        // Route through normal network broadcast so peers evaluate via validateBlock()
        state.getNetworkModel().broadcastMessage(
                getId(),
                com.sim.network.NetworkMessage.MessageType.BLOCK,
                invalidBlock
        );
        return false;
    }

    @Override
    public Attestation createAttestation(int slot, int currentTick) {
        if (!isByzantineBehaviorEnabled()) {
            return super.createAttestation(slot, currentTick);
        }
        String mode = getAttackMode();
        if (!"EQUIVOCATION".equals(mode) && !"ALL".equals(mode)) {
            return super.createAttestation(slot, currentTick);
        }
        if (!equivocationEnabled) {
            return super.createAttestation(slot, currentTick);
        }

        List<Block> attachedBlocks = new ArrayList<>();
        for (Block block : getKnownBlocks().values()) {
            if (isAttached(block.getBlockId())) {
                attachedBlocks.add(block);
            }
        }
        if (attachedBlocks.isEmpty()) return null;

        // Sort attached blocks by blockId for 100% deterministic list ordering
        attachedBlocks.sort(Comparator.comparing(Block::getBlockId));

        Block targetBlock = attachedBlocks.get(getRng().nextInt(attachedBlocks.size()));

        String attestationId = getId() + "-byzantine-attestation-" + slot + "-" + currentTick
                + "-" + targetBlock.getBlockId();
        Attestation att = new Attestation(attestationId, this.getId(), targetBlock.getBlockId(), slot, currentTick);
        if (receiveAttestation(att)) {
            conflictingAttestations++;
            maliciousActionsAttempted++;
            return att;
        }
        return null;
    }

    @Override
    public void processMessages() {
        if (isByzantineBehaviorEnabled() && delayedPropagationEnabled) {
            if (getRng().nextDouble() < 0.3) {
                return;
            }
        }
        super.processMessages();
    }
}
