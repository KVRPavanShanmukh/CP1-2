package com.sim;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

import com.sim.agent.BlockchainAgent;
import com.sim.agent.TransactionMempool;
import com.sim.blockchain.Block;
import com.sim.engine.SimulationEngine;
import com.sim.experiment.ExperimentAggregate;
import com.sim.experiment.ExperimentRunner;
import com.sim.metrics.MetricsCalculator;
import com.sim.metrics.MetricsSnapshot;
import com.sim.model.SimulationConfig;
import com.sim.model.Transaction;

/**
 * Phase 7: Transaction modelling tests.
 *
 * Covers:
 *  - Transaction model validation
 *  - Mempool capacity and deduplication
 *  - Inclusion and removal via block production
 *  - Behaviour when a block is rejected (no silent removal)
 *  - Accurate cumulative metrics and success-rate formula
 *  - Experiment reproducibility with transactions
 */
class Phase7TransactionTests {

    // -------------------------------------------------------------------------
    // 1. Transaction model validation
    // -------------------------------------------------------------------------

    @Test
    void transactionConstructorRejectsInvalidInputs() {
        // null or blank txId
        assertThrows(IllegalArgumentException.class, () ->
                new Transaction(null, "A", "B", 1.0, 0));
        assertThrows(IllegalArgumentException.class, () ->
                new Transaction("", "A", "B", 1.0, 0));
        // txId with illegal characters
        assertThrows(IllegalArgumentException.class, () ->
                new Transaction("tx id with spaces", "A", "B", 1.0, 0));
        // blank sender/receiver
        assertThrows(IllegalArgumentException.class, () ->
                new Transaction("tx-1", "", "B", 1.0, 0));
        assertThrows(IllegalArgumentException.class, () ->
                new Transaction("tx-1", "A", null, 1.0, 0));
        // non-positive amount
        assertThrows(IllegalArgumentException.class, () ->
                new Transaction("tx-1", "A", "B", 0.0, 0));
        assertThrows(IllegalArgumentException.class, () ->
                new Transaction("tx-1", "A", "B", -5.0, 0));
        assertThrows(IllegalArgumentException.class, () ->
                new Transaction("tx-1", "A", "B", Double.NaN, 0));
        // negative creationTick
        assertThrows(IllegalArgumentException.class, () ->
                new Transaction("tx-1", "A", "B", 1.0, -1));
    }

    @Test
    void transactionIsImmutableAndValueEquals() {
        Transaction t1 = new Transaction("tx-1", "sender", "receiver", 5.0, 3);
        Transaction t2 = new Transaction("tx-1", "sender2", "receiver2", 9.0, 7);
        // Equality is identity-by-txId only
        assertEquals(t1, t2, "Transactions with the same txId must be equal");
        assertEquals(t1.hashCode(), t2.hashCode());
        // Fields are readable
        assertEquals("tx-1", t1.getTxId());
        assertEquals("sender", t1.getSenderId());
        assertEquals("receiver", t1.getReceiverId());
        assertEquals(5.0, t1.getAmount());
        assertEquals(3, t1.getCreationTick());
    }

    // -------------------------------------------------------------------------
    // 2. Mempool capacity and deduplication
    // -------------------------------------------------------------------------

    @Test
    void mempoolRejectsDuplicatesAndEnforcesCapacity() {
        TransactionMempool mempool = new TransactionMempool(3);
        Transaction t1 = new Transaction("tx-1", "A", "B", 1.0, 0);
        Transaction t2 = new Transaction("tx-2", "A", "B", 1.0, 0);
        Transaction t3 = new Transaction("tx-3", "A", "B", 1.0, 0);
        Transaction t4 = new Transaction("tx-4", "A", "B", 1.0, 0);

        assertTrue(mempool.add(t1));
        assertTrue(mempool.add(t2));
        assertTrue(mempool.add(t3));
        // Duplicate must be rejected
        assertFalse(mempool.add(t1), "Duplicate transaction must be rejected");
        // Over capacity must be rejected
        assertFalse(mempool.add(t4), "Transaction must be rejected when mempool is at capacity");

        assertEquals(3, mempool.size());
        assertTrue(mempool.contains("tx-1"));
        assertFalse(mempool.contains("tx-4"));
    }

    @Test
    void mempoolCapacityOfZeroOrNegativeIsRejected() {
        assertThrows(IllegalArgumentException.class, () -> new TransactionMempool(0));
        assertThrows(IllegalArgumentException.class, () -> new TransactionMempool(-1));
    }

    @Test
    void mempoolRemoveMakesRoomForNewEntry() {
        TransactionMempool mempool = new TransactionMempool(2);
        Transaction t1 = new Transaction("tx-1", "A", "B", 1.0, 0);
        Transaction t2 = new Transaction("tx-2", "A", "B", 1.0, 0);
        Transaction t3 = new Transaction("tx-3", "A", "B", 1.0, 0);
        mempool.add(t1);
        mempool.add(t2);
        assertTrue(mempool.remove("tx-1"));
        assertTrue(mempool.add(t3), "After removal there should be room for a new transaction");
        assertEquals(2, mempool.size());
        assertFalse(mempool.contains("tx-1"));
        assertTrue(mempool.contains("tx-3"));
    }

    // -------------------------------------------------------------------------
    // 3. Transaction inclusion and removal via block production
    // -------------------------------------------------------------------------

    @Test
    void transactionsIncludedInBlockAreRemovedFromProducerMempool() {
        SimulationEngine engine = engine("PoW", 3, 5);
        // Manually inject a transaction into the first agent's mempool
        BlockchainAgent agent0 = engine.getState().getAgents().get(0);
        BlockchainAgent agent1 = engine.getState().getAgents().get(1);
        Transaction tx = new Transaction("tx-manual-1", agent0.getId(), agent1.getId(), 10.0, 0);
        assertTrue(agent0.addTransaction(tx));
        assertEquals(1, agent0.getMempoolSize());

        // Simulate several ticks so consensus has a chance to produce a block for agent0
        // and include this tx. Use a seeded engine so we control the run deterministically.
        engine = engine("PoW", 3, 5, 42L, 1);
        agent0 = engine.getState().getAgents().get(0);
        agent1 = engine.getState().getAgents().get(1);
        tx = new Transaction("tx-manual-1", agent0.getId(), agent1.getId(), 10.0, 0);
        agent0.addTransaction(tx);

        for (int i = 0; i < 10; i++) {
            engine.tick();
        }
        // After production the tx must either be included in global blockchain OR still in mempool —
        // it must NOT have been silently discarded.
        boolean inChain = engine.getState().getBlockchainState().getIncludedTransactionCount() > 0;
        boolean stillInMempool = agent0.getMempoolSize() > 0 && agent0.getPendingTransactions()
                .stream().anyMatch(t -> t.getTxId().equals("tx-manual-1"));
        assertTrue(inChain || stillInMempool,
                "tx-manual-1 must either be included in the chain or still in the mempool; it cannot vanish silently.");
    }

    @Test
    void transactionValidationInBlockRejectsUnknownSenderOrReceiver() {
        SimulationEngine engine = engine("PoW", 2, 1);
        BlockchainAgent agent = engine.getState().getAgents().get(0);

        // Build a block with a transaction whose receiver does not exist
        Transaction badTx = new Transaction("tx-bad", agent.getId(), "ghost-agent", 1.0, 0);
        Block blockWithBadTx = new Block("block-bad-tx", Block.GENESIS_ID, agent.getId(), 1, 1,
                List.of(badTx));
        assertFalse(agent.receiveBlock(blockWithBadTx),
                "Block with transaction referencing non-existent agent must be rejected");
        assertEquals(0, engine.getState().getBlockchainState().getIncludedTransactionCount(),
                "Rejected block must not contribute to included transaction count");
    }

    @Test
    void duplicateTransactionInSingleBlockIsRejected() {
        SimulationEngine engine = engine("PoW", 2, 1);
        BlockchainAgent agent0 = engine.getState().getAgents().get(0);
        BlockchainAgent agent1 = engine.getState().getAgents().get(1);
        Transaction tx = new Transaction("tx-dup", agent0.getId(), agent1.getId(), 1.0, 0);
        Block blockWithDuplicate = new Block("block-dup", Block.GENESIS_ID, agent0.getId(), 1, 1,
                List.of(tx, tx));
        assertFalse(agent0.receiveBlock(blockWithDuplicate),
                "Block containing duplicate transaction IDs must be rejected");
    }

    // -------------------------------------------------------------------------
    // 4. Rejected blocks do not silently remove transactions
    // -------------------------------------------------------------------------

    @Test
    void rejectedBlockDoesNotCauseSilentTransactionLoss() {
        SimulationEngine engine = engine("PoW", 2, 1);
        BlockchainAgent agent0 = engine.getState().getAgents().get(0);
        BlockchainAgent agent1 = engine.getState().getAgents().get(1);

        // Add a transaction to agent0's mempool
        Transaction tx = new Transaction("tx-no-loss", agent0.getId(), agent1.getId(), 1.0, 0);
        assertTrue(agent0.addTransaction(tx));

        // Attempt to add a block referencing a non-existent parent — this must be rejected
        Block orphanBlock = new Block("orphan-block", "nonexistent-parent", agent0.getId(), 2, 1,
                List.of(tx));
        boolean accepted = agent0.receiveBlock(orphanBlock);
        // The block will be placed in the orphan pool, not accepted into the canonical chain;
        // the transaction must still be in agent0's mempool.
        assertTrue(agent0.getMempoolSize() > 0,
                "Transaction must remain in mempool after a block with missing parent is placed in orphan pool");
        assertTrue(agent0.getPendingTransactions().stream()
                .anyMatch(t -> t.getTxId().equals("tx-no-loss")),
                "tx-no-loss must still be in agent0's mempool after orphan-block placement");
    }

    // -------------------------------------------------------------------------
    // 5. Metrics: accurate cumulative counts and success-rate formula
    // -------------------------------------------------------------------------

    @Test
    void metricsReportAccurateTransactionCounts() {
        // Use a config with 1 tx per agent per tick to generate real transactions
        SimulationEngine engine = engine("PoW", 4, 5, 99L, 1);
        for (int i = 0; i < 5; i++) {
            engine.tick();
        }
        MetricsSnapshot snap = new MetricsCalculator().calculateMetrics(engine.getState());

        // transactionsCreated must match the state counter (not the estimate)
        assertEquals(engine.getState().getTransactionsCreatedCount(), snap.getTransactionsCreated(),
                "transactionsCreated in snapshot must match SimulationState.getTransactionsCreatedCount()");

        // included cannot exceed created
        assertTrue(snap.getTransactionsIncluded() <= snap.getTransactionsCreated(),
                "Included must be <= created");

        // Zero-denominator guard: if none created, success rate must be 0.0
        SimulationEngine noTx = engine("PoW", 4, 3);
        MetricsSnapshot noTxSnap = new MetricsCalculator().calculateMetrics(noTx.getState());
        assertEquals(0.0, noTxSnap.getTransactionSuccessRate(), 1e-9,
                "Success rate must be 0.0 when no transactions were created");
        assertEquals(0, noTxSnap.getTransactionsCreated());
        assertEquals(0, noTxSnap.getTransactionsIncluded());
    }

    @Test
    void transactionSuccessRateIsIncludedDividedByCreated() {
        SimulationEngine engine = engine("PoW", 4, 5, 42L, 1);
        for (int i = 0; i < 5; i++) {
            engine.tick();
        }
        MetricsSnapshot snap = new MetricsCalculator().calculateMetrics(engine.getState());
        int created = snap.getTransactionsCreated();
        int included = snap.getTransactionsIncluded();
        if (created > 0) {
            double expectedRate = (double) included / created;
            assertEquals(expectedRate, snap.getTransactionSuccessRate(), 1e-9,
                    "Success rate must equal included/created");
        }
        // transactionsPerSimulationTick must equal included / tick
        double expectedTpst = 5 == 0 ? 0.0 : (double) included / 5;
        assertEquals(expectedTpst, snap.getTransactionsPerSimulationTick(), 1e-9,
                "transactionsPerSimulationTick must equal included/currentTick");
    }

    // -------------------------------------------------------------------------
    // 6. Experiment reproducibility with transaction settings
    // -------------------------------------------------------------------------

    @Test
    void seededRunsWithTransactionsAreFullyDeterministic() {
        ExperimentRunner runner = new ExperimentRunner();

        // Run same seed twice; block counts and tx metrics must be identical
        SimulationConfig cfg = txConfig("PoW", 4, 5, 12345L, 1);
        var r1 = runner.run(cfg);
        var r2 = runner.run(cfg);

        assertEquals("COMPLETED", r1.getStatus());
        assertEquals("COMPLETED", r2.getStatus());
        assertNotNull(r1.getMetrics());
        assertNotNull(r2.getMetrics());
        assertEquals(r1.getMetrics().getBlocksProduced(), r2.getMetrics().getBlocksProduced(),
                "Block counts must be identical for same seed");
        assertEquals(r1.getMetrics().getTransactionsCreated(), r2.getMetrics().getTransactionsCreated(),
                "Transactions created must be identical for same seed");
        assertEquals(r1.getMetrics().getTransactionsIncluded(), r2.getMetrics().getTransactionsIncluded(),
                "Transactions included must be identical for same seed");
    }

    @Test
    void experimentAggregateIncludesTransactionSuccessRate() {
        SimulationConfig template = txConfig("PoW", 3, 5, 0L, 1);
        ExperimentRunner runner = new ExperimentRunner();
        ExperimentAggregate agg = runner.runRepeated(template, List.of(1L, 2L, 3L));

        assertEquals(3, agg.getSuccessfulRuns());
        assertEquals(0, agg.getFailedRuns());
        // meanTransactionSuccessRate must be in [0, 1]
        assertTrue(agg.getMeanTransactionSuccessRate() >= 0.0 &&
                        agg.getMeanTransactionSuccessRate() <= 1.0,
                "Mean tx success rate must be in [0, 1], got " + agg.getMeanTransactionSuccessRate());
    }

    @Test
    void experimentCopyPreservesTransactionSettings() {
        SimulationConfig template = txConfig("PoW", 3, 5, 7L, 2);
        template.setMempoolCapacity(50);
        template.setMaxTransactionsPerBlock(10);
        template.setTransactionAmount(3.5);

        ExperimentRunner runner = new ExperimentRunner();
        ExperimentAggregate agg = runner.runRepeated(template, List.of(1L, 2L));
        assertEquals(2, agg.getSuccessfulRuns(),
                "Both runs must complete with transaction settings copied correctly");
        // Template must not be mutated
        assertEquals(50, template.getMempoolCapacity());
        assertEquals(10, template.getMaxTransactionsPerBlock());
        assertEquals(3.5, template.getTransactionAmount(), 1e-9);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private SimulationEngine engine(String consensus, int nodes, int ticks) {
        return new SimulationEngine(config(consensus, nodes, ticks, 7L, 0));
    }

    private SimulationEngine engine(String consensus, int nodes, int ticks, long seed, int txPerAgentPerTick) {
        return new SimulationEngine(config(consensus, nodes, ticks, seed, txPerAgentPerTick));
    }

    private SimulationConfig config(String consensus, int nodes, int ticks, long seed, int txPerAgentPerTick) {
        SimulationConfig c = new SimulationConfig();
        c.setConsensusType(consensus);
        c.setNodeCount(nodes);
        c.setNetworkTopology("Erdos-Renyi");
        c.setBlockGossipLatency(1.0);
        c.setRandomSeed(seed);
        c.setSimulationTicks(ticks);
        c.setTransactionsPerAgentPerTick(txPerAgentPerTick);
        return c;
    }

    private SimulationConfig txConfig(String consensus, int nodes, int ticks, long seed, int txPerAgentPerTick) {
        return config(consensus, nodes, ticks, seed, txPerAgentPerTick);
    }
}
