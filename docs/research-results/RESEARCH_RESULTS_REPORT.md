# CHAIN55 — Research Results Report

> **Generated file — do not edit by hand.** Regenerate with
> `python docs/research-results/generate_report.py` after running
> `mvnw test -Dtest=Phase13ResearchExperiments` from `Backend/Backend`.

Generated: 2026-11-19 18:11 UTC

## Overview

This report presents measured results from the six pre-registered controlled experiments
(`docs/RESEARCH_EXPERIMENT_PLAN.md`) executed with `ExperimentComparisonRunner`.
Every comparison uses the shared ordered seeds `1, 2, 3, 4, 5`
(5 repeats per configuration) and changes exactly one conceptual factor.

Results are **observed associations from a stochastic model**, not causal claims about
real networks. Failed runs remain visible and are never treated as zero observations.

## Methodology

- **Engine:** `SimulationEngine` with `6` agents, `Erdos-Renyi` topology and `8` ticks.
- **Design:** baseline vs. one treatment, shared ordered seeds, one conceptual factor changed (verified by `FactorDetector`).
- **Aggregation:** mean, population standard deviation, minimum and maximum over successful runs.
- **Metrics:** 27 metrics per comparison, including the paper's `mainchainRate` (μ = |M|/|B| over non-genesis blocks), `branchingRatio` (F = |Θ|/|M|) and `giniCoefficient` of per-agent block production.
- **Reproducibility:** block identifiers are a per-run monotonic sequence, so a seed fully determines a run and identical baseline configurations produce identical aggregates across experiments.
- **Run counts:** 5 seeds × (1 baseline + 1 treatment) × 9 comparisons = 90 runs; all passed in the archived dataset.

### Fixed control parameters

| Parameter | Value |
| --- | --- |
| `nodeCount` | 6 |
| `networkTopology` | Erdos-Renyi |
| `slotDuration` | 1.0 |
| `simulationTicks` | 8 |
| `blockGossipLatency` | 0.5 (varied only in Exp 1) |
| `byzantineRatio` | 0.0 (varied only in Exp 4) |
| `byzantineBehaviorEnabled` | false (varied only in Exp 4) |
| `packetLossRate` | 0.0 (varied only in Exp 2) |
| `networkLatencyJitter` | 2 |
| `partitionRatio` | 0.0 (varied only in Exp 3) |
| `transactionsPerAgentPerTick` | 0 (varied only in Exp 5) |
| `mempoolCapacity` | 100 |
| `maxTransactionsPerBlock` | 100 |
| `transactionAmount` | 1.0 |

### Unsupported measurements

- **reorganizations** — no reorganization event counter exists in the simulation state.
- **forkDepth** — active forks and orphan counts exist, but no fork-depth measure is recorded.

These are reported by the API as unsupported instead of being estimated.

## Experiment Results

### Experiment 1 — Network Latency and Canonical-Head Agreement

**Independent variable:** `blockGossipLatency` (FACTOR_BLOCK_GOSSIP_LATENCY)  
**Design:** baseline 0.5 s → treatment 3.0 s  
**Hypothesis:** Higher block gossip latency reduces canonical-head agreement and increases active forks and stale blocks.

_Seeds `1, 2, 3, 4, 5` · baseline attempted 5, successful 5, failed 0 · treatment attempted 5, successful 5, failed 0 · controlled: yes_

**Changed factor:** `Block gossip latency` — blockGossipLatency: 0.5 → 3.0

| Metric | Baseline mean | Treatment mean | Δ | Δ% |
| --- | ---: | ---: | ---: | ---: |
| `canonicalHeadAgreement` | 0.5333 | 0.4667 | -0.0667 | -12.5% |
| `activeForks` | 2.0000 | 2.2000 | 0.2000 | +10.0% |
| `mainchainRate` | 0.4171 | 0.4238 | 0.0067 | +1.6% |
| `branchingRatio` | 1.5000 | 1.5000 | 0.0000 | +0.0% |
| `staleBlocks` | 2.8000 | 0.0000 | -2.8000 | -100.0% |
| `giniCoefficient` | 0.5210 | 0.5198 | -0.0011 | -0.2% |
| `messagesSent` | 31.0000 | 15.8000 | -15.2000 | -49.0% |
| `messagesDelivered` | 4.6000 | 0.0000 | -4.6000 | -100.0% |
| `averagePropagationDelayTicks` | 5.9503 | 30.9320 | 24.9817 | +419.8% |

**Observed association:** `canonicalHeadAgreement` 0.5333 → 0.4667 (Δ -0.0667, -12.5%); `activeForks` 2.0000 → 2.2000 (Δ 0.2000, +10.0%).

**Limitation:** Higher latency reduces delivered messages, so fork counts are confounded with delivery volume. Delayed messages that never arrive inside the 8-tick horizon produce zero block-propagation delay observations.

### Experiment 2 — Packet Loss and Chain Divergence

**Independent variable:** `packetLossRate` (FACTOR_PACKET_LOSS)  
**Design:** baseline 0.0 → treatment 0.3  
**Hypothesis:** Increased packet loss raises dropped messages and chain divergence while reducing canonical-head agreement.

_Seeds `1, 2, 3, 4, 5` · baseline attempted 5, successful 5, failed 0 · treatment attempted 5, successful 5, failed 0 · controlled: yes_

**Changed factor:** `Packet loss rate` — packetLossRate: 0.0 → 0.3

| Metric | Baseline mean | Treatment mean | Δ | Δ% |
| --- | ---: | ---: | ---: | ---: |
| `messagesDropped` | 0.0000 | 7.0000 | 7.0000 | — |
| `canonicalHeadAgreement` | 0.5333 | 0.4000 | -0.1333 | -25.0% |
| `activeForks` | 2.0000 | 2.2000 | 0.2000 | +10.0% |
| `mainchainRate` | 0.4171 | 0.4733 | 0.0562 | +13.5% |
| `branchingRatio` | 1.5000 | 1.5000 | 0.0000 | +0.0% |
| `staleBlocks` | 2.8000 | 0.8000 | -2.0000 | -71.4% |
| `giniCoefficient` | 0.5210 | 0.5333 | 0.0124 | +2.4% |
| `messagesSent` | 31.0000 | 21.0000 | -10.0000 | -32.3% |
| `messagesDelivered` | 4.6000 | 1.2000 | -3.4000 | -73.9% |
| `averagePropagationDelayTicks` | 5.9503 | 4.0710 | -1.8793 | -31.6% |

**Observed association:** `messagesDropped` 0.0000 → 7.0000 (Δ 7.0000, —); `canonicalHeadAgreement` 0.5333 → 0.4000 (Δ -0.1333, -25.0%); `activeForks` 2.0000 → 2.2000 (Δ 0.2000, +10.0%).

**Limitation:** Packet loss is drawn stochastically per message, so five seeds provide limited statistical power.

### Experiment 3 — Network Partitions and Convergence

**Independent variable:** `networkPartition` (FACTOR_PARTITION)  
**Design:** baseline none → treatment ratio 0.4, active ticks 2–6  
**Hypothesis:** An active partition prevents canonical-head agreement from reaching 1.0 during the partition window; convergence may recover after healing.

_Seeds `1, 2, 3, 4, 5` · baseline attempted 5, successful 5, failed 0 · treatment attempted 5, successful 5, failed 0 · controlled: yes_

**Changed factor:** `Network partition` — partitionRatio: 0.0 → 0.4; partitionStartTick: -1 → 2; partitionEndTick: -1 → 6

| Metric | Baseline mean | Treatment mean | Δ | Δ% |
| --- | ---: | ---: | ---: | ---: |
| `convergedRunRate` | 0.0000 | 0.0000 | 0.0000 | — |
| `canonicalHeadAgreement` | 0.5333 | 0.5000 | -0.0333 | -6.2% |
| `activeForks` | 2.0000 | 2.2000 | 0.2000 | +10.0% |
| `mainchainRate` | 0.4171 | 0.4250 | 0.0079 | +1.9% |
| `branchingRatio` | 1.5000 | 1.5333 | 0.0333 | +2.2% |
| `staleBlocks` | 2.8000 | 1.4000 | -1.4000 | -50.0% |
| `messagesDropped` | 0.0000 | 7.0000 | 7.0000 | — |
| `messagesDelivered` | 4.6000 | 3.0000 | -1.6000 | -34.8% |
| `averagePropagationDelayTicks` | 5.9503 | 4.2490 | -1.7013 | -28.6% |

**Observed association:** `convergedRunRate` 0.0000 → 0.0000 (Δ 0.0000, —); `canonicalHeadAgreement` 0.5333 → 0.5000 (Δ -0.0333, -6.2%).

**Limitation:** With 8 ticks and a partition ending at tick 6 there may be too little post-healing time for convergence to recover.

### Experiment 4 — Byzantine-Agent Ratio and Security Metrics

**Independent variable:** `byzantineBehavior` (FACTOR_BYZANTINE; ratio 0.0 → 0.34 with mode ALL)  
**Design:** baseline none → treatment 2 of 6 agents Byzantine with equivocation + withholding  
**Hypothesis:** Higher Byzantine ratio increases malicious actions, withheld blocks and conflicting attestations while reducing canonical-head agreement.

_Seeds `1, 2, 3, 4, 5` · baseline attempted 5, successful 5, failed 0 · treatment attempted 5, successful 5, failed 0 · controlled: yes_

**Changed factor:** `Byzantine behavior` — byzantineRatio: 0.0 → 0.34; byzantineBehaviorEnabled: false → true; byzantineAttackMode: EQUIVOCATION → ALL

| Metric | Baseline mean | Treatment mean | Δ | Δ% |
| --- | ---: | ---: | ---: | ---: |
| `maliciousActionsAttempted` | 0.0000 | 2.6000 | 2.6000 | — |
| `blocksWithheld` | 0.0000 | 2.6000 | 2.6000 | — |
| `conflictingAttestations` | 0.0000 | 0.0000 | 0.0000 | — |
| `byzantineAgents` | 0.0000 | 2.0000 | 2.0000 | — |
| `canonicalHeadAgreement` | 0.5333 | 0.5667 | 0.0333 | +6.2% |
| `activeForks` | 2.0000 | 1.8000 | -0.2000 | -10.0% |
| `mainchainRate` | 0.4171 | 0.6000 | 0.1829 | +43.8% |
| `branchingRatio` | 1.5000 | 0.9000 | -0.6000 | -40.0% |
| `staleBlocks` | 2.8000 | 2.0000 | -0.8000 | -28.6% |
| `orphanBlocks` | 0.0000 | 0.0000 | 0.0000 | — |
| `giniCoefficient` | 0.5210 | 0.6111 | 0.0902 | +17.3% |
| `activeAgents` | 6.0000 | 4.0000 | -2.0000 | -33.3% |
| `messagesSent` | 31.0000 | 18.6000 | -12.4000 | -40.0% |
| `messagesDelivered` | 4.6000 | 3.2000 | -1.4000 | -30.4% |

**Observed association:** `maliciousActionsAttempted` 0.0000 → 2.6000 (Δ 2.6000, —); `blocksWithheld` 0.0000 → 2.6000 (Δ 2.6000, —); `conflictingAttestations` 0.0000 → 0.0000 (Δ 0.0000, —); `byzantineAgents` 0.0000 → 2.0000 (Δ 2.0000, —); `canonicalHeadAgreement` 0.5333 → 0.5667 (Δ 0.0333, +6.2%).

**Limitation:** Byzantine behaviour is deterministic per seed and only the combined ALL mode is tested. Byzantine agents are also non-active, so activeAgents falls concurrently and is not an isolated effect.

### Experiment 5 — Transaction Load and Inclusion Rate

**Independent variable:** `transactionLoad` (FACTOR_TRANSACTION_LOAD; transactionsPerAgentPerTick 0 → 3)  
**Design:** baseline 0 → treatment 3 transactions per agent per tick  
**Hypothesis:** Higher transaction load increases created and included transactions; success rate may fall when mempool or block capacity saturates.

_Seeds `1, 2, 3, 4, 5` · baseline attempted 5, successful 5, failed 0 · treatment attempted 5, successful 5, failed 0 · controlled: yes_

**Changed factor:** `Transaction load` — transactionsPerAgentPerTick: 0 → 3

| Metric | Baseline mean | Treatment mean | Δ | Δ% |
| --- | ---: | ---: | ---: | ---: |
| `transactionsCreated` | 0.0000 | 144.0000 | 144.0000 | — |
| `transactionsIncluded` | 0.0000 | 55.8000 | 55.8000 | — |
| `transactionSuccessRate` | 0.0000 | 0.3875 | 0.3875 | — |
| `transactionsPerSimulationTick` | 0.0000 | 6.9750 | 6.9750 | — |
| `blocksProduced` | 4.2000 | 5.0000 | 0.8000 | +19.0% |
| `blockProductionRate` | 0.5250 | 0.6250 | 0.1000 | +19.0% |
| `mainchainRate` | 0.4171 | 0.5333 | 0.1162 | +27.9% |
| `giniCoefficient` | 0.5210 | 0.6094 | 0.0885 | +17.0% |
| `messagesSent` | 31.0000 | 28.4000 | -2.6000 | -8.4% |
| `messagesDelivered` | 4.6000 | 2.8000 | -1.8000 | -39.1% |

**Observed association:** `transactionsCreated` 0.0000 → 144.0000 (Δ 144.0000, —); `transactionsIncluded` 0.0000 → 55.8000 (Δ 55.8000, —); `transactionSuccessRate` 0.0000 → 0.3875 (Δ 0.3875, —).

**Limitation:** Six agents over eight ticks produce modest volume, and inclusion is capped by maxTransactionsPerBlock; capacity saturation therefore reflects the model limits, not an external throughput claim.

### Experiment 6 — Consensus Strategy Comparison (PoW baseline)

**Independent variable:** `consensusType` (FACTOR_CONSENSUS_STRATEGY)  
**Design:** PoW baseline vs. PoS, DPoS, PoA and PoL, one controlled comparison per alternative.  
**Hypothesis:** Different leader-selection rules change block production, mainchain rate and Gini concentration.

Each `exp6-consensus-*.json` file contains its own PoW baseline, so PoW is present in all
four comparisons and no separate PoW-only dataset is required.

#### 6a — PoW → PoS

_Seeds `1, 2, 3, 4, 5` · baseline attempted 5, successful 5, failed 0 · treatment attempted 5, successful 5, failed 0 · controlled: yes_

| Metric | Baseline mean | Treatment mean | Δ | Δ% |
| --- | ---: | ---: | ---: | ---: |
| `blocksProduced` | 4.2000 | 5.2000 | 1.0000 | +23.8% |
| `blockProductionRate` | 0.5250 | 0.6500 | 0.1250 | +23.8% |
| `mainchainRate` | 0.4171 | 0.4381 | 0.0210 | +5.0% |
| `branchingRatio` | 1.5000 | 1.3333 | -0.1667 | -11.1% |
| `giniCoefficient` | 0.5210 | 0.5556 | 0.0346 | +6.6% |
| `canonicalHeadAgreement` | 0.5333 | 0.4000 | -0.1333 | -25.0% |
| `convergedRunRate` | 0.0000 | 0.0000 | 0.0000 | — |
| `activeForks` | 2.0000 | 2.2000 | 0.2000 | +10.0% |
| `staleBlocks` | 2.8000 | 3.6000 | 0.8000 | +28.6% |
| `messagesSent` | 31.0000 | 396.0000 | 365.0000 | +1177.4% |
| `messagesDelivered` | 4.6000 | 56.0000 | 51.4000 | +1117.4% |
| `messageThroughput` | 0.5750 | 7.0000 | 6.4250 | +1117.4% |
| `averagePropagationDelayTicks` | 5.9503 | 5.9874 | 0.0371 | +0.6% |

**Observed association:** `blockProductionRate` 0.5250 → 0.6500 (Δ 0.1250, +23.8%); `mainchainRate` 0.4171 → 0.4381 (Δ 0.0210, +5.0%); `giniCoefficient` 0.5210 → 0.5556 (Δ 0.0346, +6.6%); `canonicalHeadAgreement` 0.5333 → 0.4000 (Δ -0.1333, -25.0%); `activeForks` 2.0000 → 2.2000 (Δ 0.2000, +10.0%).

#### 6b — PoW → DPoS

_Seeds `1, 2, 3, 4, 5` · baseline attempted 5, successful 5, failed 0 · treatment attempted 5, successful 5, failed 0 · controlled: yes_

| Metric | Baseline mean | Treatment mean | Δ | Δ% |
| --- | ---: | ---: | ---: | ---: |
| `blocksProduced` | 4.2000 | 8.0000 | 3.8000 | +90.5% |
| `blockProductionRate` | 0.5250 | 1.0000 | 0.4750 | +90.5% |
| `mainchainRate` | 0.4171 | 0.5000 | 0.0829 | +19.9% |
| `branchingRatio` | 1.5000 | 1.0000 | -0.5000 | -33.3% |
| `giniCoefficient` | 0.5210 | 0.6667 | 0.1457 | +28.0% |
| `canonicalHeadAgreement` | 0.5333 | 0.5000 | -0.0333 | -6.2% |
| `convergedRunRate` | 0.0000 | 0.0000 | 0.0000 | — |
| `activeForks` | 2.0000 | 1.2000 | -0.8000 | -40.0% |
| `staleBlocks` | 2.8000 | 7.2000 | 4.4000 | +157.1% |
| `messagesSent` | 31.0000 | 64.6000 | 33.6000 | +108.4% |
| `messagesDelivered` | 4.6000 | 9.0000 | 4.4000 | +95.7% |
| `messageThroughput` | 0.5750 | 1.1250 | 0.5500 | +95.7% |
| `averagePropagationDelayTicks` | 5.9503 | 6.0144 | 0.0641 | +1.1% |

**Observed association:** `blockProductionRate` 0.5250 → 1.0000 (Δ 0.4750, +90.5%); `mainchainRate` 0.4171 → 0.5000 (Δ 0.0829, +19.9%); `giniCoefficient` 0.5210 → 0.6667 (Δ 0.1457, +28.0%); `canonicalHeadAgreement` 0.5333 → 0.5000 (Δ -0.0333, -6.2%); `activeForks` 2.0000 → 1.2000 (Δ -0.8000, -40.0%).

#### 6c — PoW → PoA

_Seeds `1, 2, 3, 4, 5` · baseline attempted 5, successful 5, failed 0 · treatment attempted 5, successful 5, failed 0 · controlled: yes_

| Metric | Baseline mean | Treatment mean | Δ | Δ% |
| --- | ---: | ---: | ---: | ---: |
| `blocksProduced` | 4.2000 | 8.0000 | 3.8000 | +90.5% |
| `blockProductionRate` | 0.5250 | 1.0000 | 0.4750 | +90.5% |
| `mainchainRate` | 0.4171 | 0.5000 | 0.0829 | +19.9% |
| `branchingRatio` | 1.5000 | 1.0000 | -0.5000 | -33.3% |
| `giniCoefficient` | 0.5210 | 0.6667 | 0.1457 | +28.0% |
| `canonicalHeadAgreement` | 0.5333 | 0.5000 | -0.0333 | -6.2% |
| `convergedRunRate` | 0.0000 | 0.0000 | 0.0000 | — |
| `activeForks` | 2.0000 | 1.0000 | -1.0000 | -50.0% |
| `staleBlocks` | 2.8000 | 4.2000 | 1.4000 | +50.0% |
| `messagesSent` | 31.0000 | 59.0000 | 28.0000 | +90.3% |
| `messagesDelivered` | 4.6000 | 8.2000 | 3.6000 | +78.3% |
| `messageThroughput` | 0.5750 | 1.0250 | 0.4500 | +78.3% |
| `averagePropagationDelayTicks` | 5.9503 | 5.9866 | 0.0363 | +0.6% |

**Observed association:** `blockProductionRate` 0.5250 → 1.0000 (Δ 0.4750, +90.5%); `mainchainRate` 0.4171 → 0.5000 (Δ 0.0829, +19.9%); `giniCoefficient` 0.5210 → 0.6667 (Δ 0.1457, +28.0%); `canonicalHeadAgreement` 0.5333 → 0.5000 (Δ -0.0333, -6.2%); `activeForks` 2.0000 → 1.0000 (Δ -1.0000, -50.0%).

#### 6d — PoW → PoL

_Seeds `1, 2, 3, 4, 5` · baseline attempted 5, successful 5, failed 0 · treatment attempted 5, successful 5, failed 0 · controlled: yes_

| Metric | Baseline mean | Treatment mean | Δ | Δ% |
| --- | ---: | ---: | ---: | ---: |
| `blocksProduced` | 4.2000 | 8.0000 | 3.8000 | +90.5% |
| `blockProductionRate` | 0.5250 | 1.0000 | 0.4750 | +90.5% |
| `mainchainRate` | 0.4171 | 1.0000 | 0.5829 | +139.7% |
| `branchingRatio` | 1.5000 | 0.0000 | -1.5000 | -100.0% |
| `giniCoefficient` | 0.5210 | 0.8333 | 0.3124 | +60.0% |
| `canonicalHeadAgreement` | 0.5333 | 0.4667 | -0.0667 | -12.5% |
| `convergedRunRate` | 0.0000 | 0.0000 | 0.0000 | — |
| `activeForks` | 2.0000 | 0.0000 | -2.0000 | -100.0% |
| `staleBlocks` | 2.8000 | 0.0000 | -2.8000 | -100.0% |
| `messagesSent` | 31.0000 | 49.4000 | 18.4000 | +59.4% |
| `messagesDelivered` | 4.6000 | 7.0000 | 2.4000 | +52.2% |
| `messageThroughput` | 0.5750 | 0.8750 | 0.3000 | +52.2% |
| `averagePropagationDelayTicks` | 5.9503 | 6.0090 | 0.0587 | +1.0% |

**Observed association:** `blockProductionRate` 0.5250 → 1.0000 (Δ 0.4750, +90.5%); `mainchainRate` 0.4171 → 1.0000 (Δ 0.5829, +139.7%); `giniCoefficient` 0.5210 → 0.8333 (Δ 0.3124, +60.0%); `canonicalHeadAgreement` 0.5333 → 0.4667 (Δ -0.0667, -12.5%); `activeForks` 2.0000 → 0.0000 (Δ -2.0000, -100.0%).

**Limitation:** PoL is a deterministic Proof-of-Location proximity proxy (lowest agent id),
not geographic verification. Different strategies have different inherent production rates, so
Gini differences partly reflect production inequality rather than stake/wealth distribution.

## Summary of Observed Associations

All statements below are **observed associations** from controlled single-factor comparisons
with five seeds. They are descriptive and require replication before causal interpretation.

1. **Network Latency and Canonical-Head Agreement** — `canonicalHeadAgreement` 0.5333 → 0.4667 (Δ -0.0667, -12.5%); `activeForks` 2.0000 → 2.2000 (Δ 0.2000, +10.0%).
2. **Packet Loss and Chain Divergence** — `messagesDropped` 0.0000 → 7.0000 (Δ 7.0000, —); `canonicalHeadAgreement` 0.5333 → 0.4000 (Δ -0.1333, -25.0%); `activeForks` 2.0000 → 2.2000 (Δ 0.2000, +10.0%).
3. **Network Partitions and Convergence** — `convergedRunRate` 0.0000 → 0.0000 (Δ 0.0000, —); `canonicalHeadAgreement` 0.5333 → 0.5000 (Δ -0.0333, -6.2%).
4. **Byzantine-Agent Ratio and Security Metrics** — `maliciousActionsAttempted` 0.0000 → 2.6000 (Δ 2.6000, —); `blocksWithheld` 0.0000 → 2.6000 (Δ 2.6000, —); `conflictingAttestations` 0.0000 → 0.0000 (Δ 0.0000, —); `byzantineAgents` 0.0000 → 2.0000 (Δ 2.0000, —); `canonicalHeadAgreement` 0.5333 → 0.5667 (Δ 0.0333, +6.2%).
5. **Transaction Load and Inclusion Rate** — `transactionsCreated` 0.0000 → 144.0000 (Δ 144.0000, —); `transactionsIncluded` 0.0000 → 55.8000 (Δ 55.8000, —); `transactionSuccessRate` 0.0000 → 0.3875 (Δ 0.3875, —).
6. **Consensus strategies (PoW baseline)** — PoS, DPoS, PoA and PoL each raise block production above the PoW baseline: PoS `blockProductionRate` 0.5250 → 0.6500; DPoS `blockProductionRate` 0.5250 → 1.0000; PoA `blockProductionRate` 0.5250 → 1.0000; PoL `blockProductionRate` 0.5250 → 1.0000. PoL removes active forks in this model while raising Gini concentration, a direct consequence of single-producer selection.

## Limitations

1. **Small sample size.** Five seeds per comparison give limited statistical power; standard deviations are reported but no significance test is claimed.
2. **Short horizon.** Eight ticks cannot capture long-term convergence or stake drift.
3. **Tick-based proxies.** Simulation ticks are not wall-clock time; rates are model quantities, not measured TPS.
4. **Model limitations.** PoL is a proximity proxy; packet loss and partitions are stochastic per message; Byzantine behaviour is simulated and is not a security claim.
5. **Agent-local counters.** `staleBlocks`, `competingBlocks` and `orphanBlocks` may count a block once per agent that knows it.
6. **Floor semantics.** Ratio fields convert to agent counts with floor semantics, so Experiment 4 uses 0.34 rather than 0.33 to instantiate 2 of 6 Byzantine agents.

## Reproducibility Instructions

```bash
cd "Backend/Backend"
mvnw test -Dtest=Phase13ResearchExperiments -DfailIfNoTests=false
# optional explicit output directory:
mvnw test -Dtest=Phase13ResearchExperiments -Dchain55.researchResultsDir=/path/to/results
python ../../docs/research-results/generate_report.py
```

Programmatic alternative: `ResearchExperimentDriver.main()` performs the same runs.
The REST API exposes the archived files at `GET /api/simulations/research` and
`GET /api/simulations/research/{file}`; the UI browses them under ARCHIVED EXPERIMENTS.

## Files

| File | Description |
| --- | --- |
| `exp1-network-latency.json` | Gossip latency 0.5 → 3.0 |
| `exp2-packet-loss.json` | Packet loss 0.0 → 0.3 |
| `exp3-network-partition.json` | No partition → ratio 0.4, ticks 2–6 |
| `exp4-byzantine.json` | No Byzantine agents → 2 of 6 with ALL attack mode |
| `exp5-tx-load.json` | 0 → 3 transactions per agent per tick |
| `exp6-consensus-PoS.json` | PoW vs PoS |
| `exp6-consensus-DPoS.json` | PoW vs DPoS |
| `exp6-consensus-PoA.json` | PoW vs PoA |
| `exp6-consensus-PoL.json` | PoW vs PoL |
| `RESEARCH_RESULTS_REPORT.md` | This generated report |
| `generate_report.py` | Report generator (reads only the JSON files) |

## Conclusion

The research suite is executable and reproducible: nine datasets, one controlled factor per
comparison, shared seeds across baseline and treatment, explicit unsupported measurements,
and a generated report whose every number is traceable to a machine-readable run record.
