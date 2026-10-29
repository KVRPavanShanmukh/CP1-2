# Simulation Roadmap & Data Flow

This document maps the complete journey and technical flow of the CHAIN55 network engine simulation, tracing exactly how the React frontend interacts with the Spring Boot/RabbitMQ backend architecture.

## Technical Flow Diagram

```text
USER
  │
  ▼
START SIMULATION
  │
  ▼
FRONTEND HANDLER (Simulation.jsx -> handleStartSimulation)
  │
  ▼
BACKEND REQUEST (POST /api/simulations/start)
  │
  ▼
SIMULATION ENGINE (SimulationOrchestratorService -> SimulationWorker)
  │
  ├───────────────┐
  ▼               ▼
RABBITMQ       WEBSOCKET (RabbitMQListener.java forwards)
  │               │
  └───────┬───────┘
          ▼
     FRONTEND STATE (connectWebSocket -> setLiveTicks)
          │
          ▼
   SIMULATION JOURNEY (Auto-scroll based on currentTick)
          │
          ├── /01 NETWORK FORMATION
          ├── /02 BLOCK PROPAGATION
          ├── /03 CONSENSUS FLOW
          ├── /04 NETWORK ANALYSIS
          └── /05 SIMULATION COMPLETE
                  │
                  ▼
           FINAL RESULTS (SimulationResult payload)
```

## Phase 6 Metrics and Experiments

`MetricsSnapshot` is the backend source of truth for live and final telemetry.

- Block counts are cumulative per run: proposals/production, globally accepted blocks, validation rejections, local canonical blocks, stale competing blocks, and retained orphans.
- Canonical/stale/orphan counts are aggregate agent-local observations; they are not global block totals and may count a block once per agent that knows it.
- Network message counts are cumulative queue events. Propagation delay is the configured scheduled delivery delay in ticks, not physical network latency. Duplicate delivery counts rejected duplicate payload processing.
- Canonical-head agreement is the fraction of agents sharing the most common local head. Convergence is true only when all agents have a head and agree.
- Production and message-throughput rates are cumulative totals divided by completed simulation ticks. Gini is recalculated from agent production counts.
- A run records consensus mode, tick count, seed, status, duration, and the final snapshot. Failed runs retain `FAILED` status and an error message.

`ExperimentRunner` reuses `SimulationEngine` for repeated seeded runs. Aggregates report successful sample count, failed-run count, mean, population standard deviation, minimum, and maximum block production. Failed runs are retained and are never treated as zero-valued successful observations.

Model limitations remain explicit: PoL is a deterministic agent-ID proxy rather than geographic verification; Byzantine behavior is simulated and is not a security claim; and network delay is a discrete queue model rather than real network latency. Stake/delegate/authority behavior follows the simplified Phase 5 strategies, and transaction metrics describe mempool and chain inclusion inside the model rather than external throughput.

## Controlled Experiment Workflow

### Endpoints and backward compatibility

`POST /api/simulations/experiment` is unchanged: it accepts `{ configuration, seeds }` and still returns the existing aggregate fields (`runs`, `sampleCount`, `successfulRuns`, `failedRuns`, block means/deviation/min/max, transaction success rate, message means, and delays). New fields are additive only: `attemptedRuns` and `statistics` on the aggregate, and a `configuration` snapshot on each run. Existing clients keep the same request and response fields.

`POST /api/simulations/experiment/compare` accepts:

```json
{
  "baseline": { "name": "baseline", "configuration": { "consensusType": "PoW", "nodeCount": 10 } },
  "treatments": [ { "name": "jitter-6", "configuration": { "networkLatencyJitter": 6 } } ],
  "seeds": [1, 2, 3]
}
```

It returns `baselineName`, `seeds`, the baseline aggregate, one entry per treatment (`treatmentName`, `changedFactors`, `controlled`, `statusNote`, aggregate, `comparisons`), and `unsupportedMeasurements`. Each comparison reports `metric`, `unit`, `measurement`, `definition`, `available`, `unavailableReason`, per-side sample counts, `baselineMean`, `treatmentMean`, `absoluteDelta`, and `relativeDelta`.

Validation matches the single-configuration endpoint (same configuration validation, `nodeCount` and `simulationTicks` limits) and additionally requires a named baseline, at least one named treatment, unique treatment names, and 1 to 50 non-null shared seeds. Violations return HTTP 400 with an `error` message.

### Experiment semantics

- One ordered seed list runs the baseline and every treatment, so seed-to-seed variation is shared rather than confounded with the treatment.
- Every run keeps its own copied configuration, seed, status, metrics, duration, and error message; the submitted templates are never mutated or re-seeded.
- Only `COMPLETED` runs with a snapshot contribute to `statistics`. `FAILED` runs stay in `runs` and `failedRuns`, are excluded from every mean and deviation, and are never converted into zero-valued observations.
- `attemptedRuns = successfulRuns + failedRuns`. Because one seed can fail, each side reports its own attempted, successful, and failed counts.
- Statistics use the mean, the population standard deviation (dividing by the sample count), the minimum, the maximum, and the successful sample count.
- A comparison is `controlled` only when exactly one conceptual factor differs. Multi-factor comparisons are marked uncontrolled and their deltas are descriptive, not causal. Identical configurations produce no factor change and are not controlled either.
- `relativeDelta` is `null` when the baseline mean is exactly zero or either side lacks successful observations; `unavailableReason` explains why and no zero substitute is used.

### Factor grouping

| Conceptual factor | Persisted fields |
| --- | --- |
| `nodeCount` | `nodeCount` |
| `consensusType` | `consensusType` |
| `networkTopology` | `networkTopology` |
| `blockGossipLatency` | `blockGossipLatency` |
| `slotDuration` | `slotDuration` |
| `simulationTicks` | `simulationTicks` |
| `transactionLoad` | `transactionsPerAgentPerTick`, `mempoolCapacity`, `maxTransactionsPerBlock`, `transactionAmount` |
| `authorityIds` | `authorityIds` |
| `inactiveAgentRatio` | `inactiveAgentRatio` |
| `packetLossRate` | `packetLossRate` |
| `networkLatencyJitter` | `networkLatencyJitter` |
| `networkPartition` | `partitionRatio`, `partitionStartTick`, `partitionEndTick`, `partitionGroupA`, `partitionGroupB` |
| `byzantineBehavior` | `byzantineRatio`, `byzantineBehaviorEnabled`, `byzantineAttackMode` |

`randomSeed` is shared by design, and `id`/`status` are not experimental variables, so none of them count as factors.

### Measurement status

Direct measurements (final snapshot values, one value per successful run):

- Chain state: `canonicalHeadAgreement`, `activeForks`, and `convergedRunRate` (the mean of the converged flag).
- Participation: `activeAgents`, `inactiveAgents`, `byzantineAgents`.
- Transactions: `transactionsCreated`, `transactionsIncluded`, `transactionSuccessRate`.
- Network events: `messagesSent`, `messagesDelivered`, `messagesDropped`.
- Adversarial counters: `maliciousActionsAttempted`, `blocksWithheld`, `conflictingAttestations`.
- Production: `blocksProduced`.

Agent-local observations (`AGENT_LOCAL_OBSERVATION`): `staleBlocks`, `competingBlocks`, and `orphanBlocks` sum per-agent observations, so one block may be counted once per agent that knows it. They are not global block totals, and `competingBlocks` shares the stale-block source.

Modeled tick-based proxies (`MODELED_TICK_PROXY`): `transactionsPerSimulationTick`, `blockProductionRate`, `messageThroughput`, `averagePropagationDelayTicks`, and `blockPropagationDelay`. Simulation ticks are not wall-clock time, and scheduled queue delay is not physical network latency. `durationMillis` is diagnostic wall-clock timing and is not a reproducible performance outcome, so it is not aggregated.

Unsupported measurements, reported with a reason instead of a value:

- `reorganizations`: no reorganization event counter exists in the simulation state.
- `forkDepth`: active forks and orphan counts exist, but no fork-depth measure is recorded.
- Geographic location for PoL, attacker profitability, and real network latency remain out of scope.

The experiment workflow is capability, not evidence: no result is produced until a comparison is actually executed, and the UI never prefills counts or deltas.

## Simulation Mind Map

```text
SIMULATION
│
├── /00 CONFIGURATION (IDLE)
│   ├── Consensus Type (PoW / PoS / DPoS / PoA / PoL)
│   ├── Nodes (nodeCount)
│   ├── Latency (blockGossipLatency)
│   └── FLOATING START SIMULATION BUTTON (Over WebGL)
│
├── START
│   ├── Frontend event: axios.post to /api/simulations/start
│   ├── Backend request: SimulationController -> OrchestratorService
│   ├── Messaging: Published to RabbitMQ `simulation.jobs.start`
│   ├── Engine: SimulationWorker receives job
│   └── Frontend state: Loading active, auto-scroll starts, manual scroll locked.
│
├── /01 NETWORK FORMATION
│   ├── Stage Trigger: Simulation started, initial WebGL morph.
│   ├── Node state: Uses requested `nodeCount` and `blockGossipLatency`
│   ├── Visual scene: Purple Particle Sphere
│   └── Agent: "Nodes ready boss!"
│
├── /02 BLOCK PROPAGATION
│   ├── Stage Trigger: Backend WebSocket emits TickUpdate with `currentTick >= 2`
│   ├── Live Payload: `TickUpdate.metrics` with cumulative block and network metrics
│   ├── Visual scene: Flowing White Waves
│   └── Agent: "Block broadcast chestunna!"
│
├── /03 CONSENSUS
│   ├── Stage Trigger: Backend WebSocket emits TickUpdate with `currentTick >= 5`
│   ├── Live Payload: `TickUpdate.metrics` with Gini and convergence metrics
│   ├── Visual scene: Dense Cyan Sphere
│   └── Agent: "Ayyayyo... voting!"
│
├── /04 NETWORK ANALYSIS
│   ├── Stage Trigger: Backend WebSocket emits TickUpdate with `currentTick >= 8`
│   ├── Live Payload: canonical-head agreement and propagation delay from `TickUpdate.metrics`
│   ├── Visual scene: Turquoise/Cyan Blob
│   └── Agent: "Network ni analyze chestunna!"
│
└── /05 SIMULATION COMPLETE
    ├── Stage Trigger: Backend WebSocket emits SimulationResult to `/topic/simulation/{id}/result`
    ├── Payload: `SimulationResult.metrics`, configuration, seed, status, and duration
    ├── Visual scene: Magenta Geometric Crystal
    ├── Agent: "Done boss! Results ready!"
    └── UI: Manual scrolling is restored, new simulation can be started.
```
