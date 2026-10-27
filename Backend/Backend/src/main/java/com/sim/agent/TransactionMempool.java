package com.sim.agent;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.sim.model.Transaction;

public final class TransactionMempool {
    private final int capacity;
    private final Map<String, Transaction> transactions = new LinkedHashMap<>();

    public TransactionMempool(int capacity) {
        if (capacity <= 0) throw new IllegalArgumentException("Mempool capacity must be greater than zero");
        this.capacity = capacity;
    }

    public boolean add(Transaction transaction) {
        if (transaction == null || transactions.containsKey(transaction.getTxId()) || transactions.size() >= capacity) return false;
        transactions.put(transaction.getTxId(), transaction);
        return true;
    }
    public boolean remove(String txId) { return transactions.remove(txId) != null; }
    public List<Transaction> peek(int limit) {
        return new ArrayList<>(transactions.values()).subList(0, Math.min(Math.max(0, limit), transactions.size()));
    }
    public boolean contains(String txId) { return transactions.containsKey(txId); }
    public int size() { return transactions.size(); }
    public Collection<Transaction> getTransactions() { return List.copyOf(transactions.values()); }
}
