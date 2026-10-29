# CHAIN55 — Task 3D: Reproducible Research Experiment Plan

## Overview

This plan defines six controlled experiments using the existing `ExperimentComparisonRunner` / `POST /api/simulations/experiment/compare` framework. Each experiment manipulates exactly one independent variable (controlled comparison) against a shared baseline, using the same ordered seed list for baseline and every treatment. Results are saved to `docs/research-results/` and must not be presented as conclusive findings.

## Supported Factors (verified against FactorDetector)

| Factor | FactorDetector Constant | Fields |
|--------|------------------------|--------|
| nodeCount | FACTOR_NODE_COUNT | nodeCount |
| consensusType | FACTOR_CONSENSUS_STRATEGY | consensusType |
| networkTopology | FACTOR_NETWORK_TOPOLOGY | networkTopology |
| blockGossipLatency | FACTOR_BLOCK_GOSSIP_LATENCY | blockGossipLatency |
| slotDuration | FACTOR_SLOT_DURATION | slotDuration |
| simulationTicks | FACTOR_SIMULATION_TICKS | simulationTicks |
| transactionLoad | FACTOR_TRANSACTION_LOAD | transactionsPerAgentPerTick, mempoolCapacity, maxTransactionsPerBlock, transactionAmount |
| authorityIds | FACTOR_AUTHORITIES | authorityIds |
| inactiveAgentRatio | FACTOR_INACTIVE_RATIO | inactiveAgentRatio |
| packetLossRate | FACTOR_PACKET_LOSS | packetLossRate |
| networkLatencyJitter | FACTOR_LATENCY_JITTER | networkLatencyJitter |
| networkPartition | FACTOR_PARTITION | partitionRatio, partitionStartTick, partitionEndTick, partitionGroupA, partitionGroupB |
| byzantineBehavior | FACTOR_BYZANTINE | byzantineRatio, byzantineBehaviorEnabled, byzantineAttackMode |

## Supported Outcome Metrics (verified against ExperimentAggregate METRICS)

Primary metrics per experiment are drawn from: canonicalHeadAgreement, activeForks, staleBlocks, convergedRunRate, messagesDropped, maliciousActionsAttempted, blocksWithheld, conflictingAttestations, transactionsCreated, transactionsIncluded, transactionSuccessRate, blockProductionRate, giniCoefficient, byzantineAgents, inactiveAgents, activeAgents, messagesSent, messagesDelivered.

Unsupported (not measured): reorganizations, forkDepth.

## Fixed Control Parameters (all experiments unless noted)

| Parameter | Value | Reason |
|-----------|-------|--------|
| nodeCount | 6 | Small enough for fast runs, large enough for meaningful forks/agreement |
| networkTopology | Erdos-Renyi | Default, well-understood random graph |
| slotDuration | 1.0 | Default |
| simulationTicks | 8 | Sufficient for block production and convergence observation |
| blockGossipLatency | 0.5 | Default (varied only in Exp 1) |
| byzantineRatio | 0.0 | Default (varied only in Exp 4) |
| byzantineBehaviorEnabled | false | Default (varied only in Exp 4) |
| packetLossRate | 0.0 | Default (varied only in Exp 2) |
| networkLatencyJitter | 2 | Default |
| partitionRatio | 0.0 | Default (varied only in Exp 3) |
| partitionStartTick | -1 | Disabled (varied only in Exp 3) |
| partitionEndTick | -1 | Disabled (varied only in Exp 3) |
| transactionsPerAgentPerTick | 0 | Default (varied only in Exp 5) |
| mempoolCapacity | 100 | Default |
| maxTransactionsPerBlock | 100 | Default |
| transactionAmount | 1.0 | Default |

## Shared Seeds

5 seeds: `1L, 2L, 3L, 4L, 5L` — applied identically to baseline and every treatment within each experiment.

## Experiment 1 — Network Latency and Canonical-Head Agreement

| Element | Specification |
|---------|---------------|
| Research question | How does network latency affect canonical-head agreement and chain divergence? |
| Hypothesis | Higher block gossip latency reduces canonical-head agreement and increases active forks/stale blocks. |
| Independent variable | `blockGossipLatency` (FACTOR_BLOCK_GOSSIP_LATENCY) |
| Baseline value | 0.5 |
| Treatment value | 3.0 |
| Controlled? | Yes — exactly one factor differs |
| Primary outcomes | canonicalHeadAgreement, activeForks |
| Secondary outcomes | staleBlocks, competingBlocks, blockPropagationDelay, messagesDelivered |
| Repetitions | 5 shared seeds |
| Expected limitation | Higher latency may reduce total messages delivered, confounding fork counts with delivery volume. |
| Confounder | Slot duration unchanged; agents may produce fewer blocks per tick under latency, affecting divergence measures. |

## Experiment 2 — Packet Loss and Chain Divergence

| Element | Specification |
|---------|---------------|
| Research question | How does packet loss affect stale blocks, active forks, and dropped messages? |
| Hypothesis | Increased packet loss increases messagesDropped, staleBlocks, and activeForks while reducing canonical-head agreement. |
| Independent variable | `packetLossRate` (FACTOR_PACKET_LOSS) |
| Baseline value | 0.0 |
| Treatment value | 0.3 |
| Controlled? | Yes — exactly one factor differs |
| Primary outcomes | messagesDropped, staleBlocks, activeForks |
| Secondary outcomes | canonicalHeadAgreement, messagesDelivered, blockPropagationDelay |
| Repetitions | 5 shared seeds |
| Expected limitation | Packet loss is stochastic per-message; with only 5 seeds, variance may be high. |
| Confounder | Dropped messages may reduce block propagation, indirectly affecting fork resolution. |

## Experiment 3 — Network Partitions and Convergence

| Element | Specification |
|---------|---------------|
| Research question | How do network partitions affect convergence? |
| Hypothesis | An active partition prevents canonical-head agreement from reaching 1.0 during the partition window; convergence may recover after the partition heals. |
| Independent variable | `networkPartition` (FACTOR_PARTITION) — partitionRatio, partitionStartTick, partitionEndTick |
| Baseline value | partitionRatio=0.0, partitionStartTick=-1, partitionEndTick=-1 (no partition) |
| Treatment value | partitionRatio=0.4, partitionStartTick=2, partitionEndTick=6 (partition active ticks 2–6) |
| Controlled? | Yes — all partition fields form one conceptual factor |
| Primary outcomes | convergedRunRate, canonicalHeadAgreement |
| Secondary outcomes | activeForks, staleBlocks, messagesDropped, durationMillis |
| Repetitions | 5 shared seeds |
| Expected limitation | With only 8 ticks and partition ending at tick 6, there may be insufficient ticks for post-healing convergence. |
| Confounder | Partition drops cross-partition messages, which also increases messagesDropped independently of convergence effects. |

## Experiment 4 — Byzantine-Agent Ratio and Security Metrics

| Element | Specification |
|---------|---------------|
| Research question | How does the Byzantine-agent ratio affect security-related metrics? |
| Hypothesis | Higher Byzantine ratio increases maliciousActionsAttempted, blocksWithheld, conflictingAttestations and reduces canonical-head agreement. |
| Independent variable | `byzantineBehavior` (FACTOR_BYZANTINE) — byzantineRatio, byzantineBehaviorEnabled, byzantineAttackMode |
| Baseline value | byzantineRatio=0.0, byzantineBehaviorEnabled=false, byzantineAttackMode=EQUIVOCATION |
| Treatment value | byzantineRatio=0.33 (2 of 6 agents), byzantineBehaviorEnabled=true, byzantineAttackMode=ALL |
| Controlled? | Yes — all Byzantine fields form one conceptual factor |
| Primary outcomes | maliciousActionsAttempted, blocksWithheld, conflictingAttestations |
| Secondary outcomes | canonicalHeadAgreement, activeForks, byzantineAgents, activeAgents |
| Repetitions | 5 shared seeds |
| Expected limitation | Byzantine behavior is deterministic per seed; results may not generalize to other attack modes. |
| Confounder | Byzantine agents are also counted as non-active, so activeAgents decreases concurrently — not isolated. |

## Experiment 5 — Transaction Load and Inclusion Rate

| Element | Specification |
|---------|---------------|
| Research question | How does transaction load affect transaction inclusion and success rate? |
| Hypothesis | Higher transactionsPerAgentPerTick increases transactionsCreated and transactionsIncluded; transactionSuccessRate may decrease if mempool/block capacity is saturated. |
| Independent variable | `transactionLoad` (FACTOR_TRANSACTION_LOAD) — transactionsPerAgentPerTick (primary), with mempoolCapacity and maxTransactionsPerBlock held at defaults |
| Baseline value | transactionsPerAgentPerTick=0 |
| Treatment value | transactionsPerAgentPerTick=3 |
| Controlled? | Yes — exactly one conceptual factor (transactionLoad) |
| Primary outcomes | transactionsCreated, transactionsIncluded, transactionSuccessRate |
| Secondary outcomes | transactionsPerSimulationTick, blockProductionRate, messagesSent |
| Repetitions | 5 shared seeds |
| Expected limitation | With 6 agents and 8 ticks, total transaction volume is modest; mempool saturation may not occur. |
| Confounder | Inactive agents (0 by default) generate no transactions; consensus strategy affects block production rate and thus inclusion capacity. |

## Experiment 6 — Consensus Strategy Comparison

| Element | Specification |
|---------|---------------|
| Research question | How do the supported consensus strategies compare on chain and distribution metrics? |
| Hypothesis | PoW, PoS, DPoS, PoA, and PoL produce different mainchain rates, Gini coefficients, and block production rates due to different leader selection mechanisms. |
| Independent variable | `consensusType` (FACTOR_CONSENSUS_STRATEGY) |
| Baseline value | PoW |
| Treatment values | PoS, DPoS, PoA, PoL (four separate comparisons, each controlled) |
| Controlled? | Yes — each comparison changes exactly one factor |
| Primary outcomes | blockProductionRate, giniCoefficient, canonicalHeadAgreement |
| Secondary outcomes | activeForks, staleBlocks, messagesSent, messagesDelivered |
| Repetitions | 5 shared seeds per comparison |
| Expected limitation | PoL is a deterministic lowest-agent-ID proxy, not geographic verification; results reflect model assumptions, not real-world PoL. |
| Confounder | Different consensus strategies have different inherent block production rates; differences in Gini may reflect production inequality, not stake/wealth distribution. |

## Reproducibility Guarantees

- Same ordered seed list applied to baseline and every treatment within an experiment.
- `ExperimentRunner.runRepeated()` copies the template configuration per seed; templates are never mutated.
- `ExperimentRunResult.configuration` stores the actual config used per run (including seed).
- `isControlled()` is true only when exactly one conceptual factor differs.
- Failed runs remain visible; never treated as zero-valued observations.

## Results Output

All results saved to `D:\CP1\CHAIN55\PROJECT B\docs\research-results\`:
- `experiment-plan.md` (this file)
- `experiment-results.json` — raw JSON output from ExperimentComparisonRunner for each experiment
- `analysis-summary.md` — measured means, variability, deltas, limitations (not causal claims)