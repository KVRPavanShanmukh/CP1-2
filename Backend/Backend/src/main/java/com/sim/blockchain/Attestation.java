package com.sim.blockchain;

public class Attestation {
    private String attestationId;
    private String validatorId;
    private String blockId;
    private int slot;
    private int timestamp;

    public Attestation(String attestationId, String validatorId, String blockId, int slot, int timestamp) {
        this.attestationId = attestationId;
        this.validatorId = validatorId;
        this.blockId = blockId;
        this.slot = slot;
        this.timestamp = timestamp;
    }

    public String getAttestationId() { return attestationId; }
    public String getValidatorId() { return validatorId; }
    public String getBlockId() { return blockId; }
    public int getSlot() { return slot; }
    public int getTimestamp() { return timestamp; }
}
