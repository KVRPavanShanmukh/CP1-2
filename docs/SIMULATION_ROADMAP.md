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

Model limitations remain explicit: PoL is a deterministic agent-ID proxy rather than geographic verification; Byzantine behavior is simulated and is not a security claim; and network delay is a discrete queue model rather than real network latency. Stake/delegate/authority behavior follows the simplified Phase 5 strategies and no transaction throughput is reported because the current model has no transaction pool.

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
