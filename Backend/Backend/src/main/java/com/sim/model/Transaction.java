package com.sim.model;

import java.util.Objects;

public final class Transaction {
    private final String txId;
    private final String senderId;
    private final String receiverId;
    private final double amount;
    private final int creationTick;

    public Transaction(String txId, String senderId, String receiverId, double amount, int creationTick) {
        validate(txId, senderId, receiverId, amount, creationTick);
        this.txId = txId;
        this.senderId = senderId;
        this.receiverId = receiverId;
        this.amount = amount;
        this.creationTick = creationTick;
    }

    private static void validate(String txId, String senderId, String receiverId, double amount, int creationTick) {
        if (txId == null || !txId.matches("[A-Za-z0-9._:-]+")) throw new IllegalArgumentException("Invalid transaction ID");
        if (senderId == null || senderId.isBlank() || receiverId == null || receiverId.isBlank()) {
            throw new IllegalArgumentException("Transaction agent IDs are required");
        }
        if (!Double.isFinite(amount) || amount <= 0) throw new IllegalArgumentException("Transaction amount must be positive and finite");
        if (creationTick < 0) throw new IllegalArgumentException("Transaction creationTick cannot be negative");
    }

    public String getTxId() { return txId; }
    public String getSenderId() { return senderId; }
    public String getReceiverId() { return receiverId; }
    public double getAmount() { return amount; }
    public int getCreationTick() { return creationTick; }

    @Override public boolean equals(Object other) {
        return other instanceof Transaction transaction && txId.equals(transaction.txId);
    }
    @Override public int hashCode() { return Objects.hash(txId); }
}
