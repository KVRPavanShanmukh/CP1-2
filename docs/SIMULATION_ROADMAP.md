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

## Simulation Mind Map

```text
SIMULATION
│
├── /00 CONFIGURATION (IDLE)
│   ├── Consensus Type (PoW / PoS)
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
│   ├── Live Payload: `latestTick.blockCount` & `latestTick.activeForks`
│   ├── Visual scene: Flowing White Waves
│   └── Agent: "Block broadcast chestunna!"
│
├── /03 CONSENSUS
│   ├── Stage Trigger: Backend WebSocket emits TickUpdate with `currentTick >= 5`
│   ├── Live Payload: `latestTick.activeForks` & `latestTick.instantGini`
│   ├── Visual scene: Dense Cyan Sphere
│   └── Agent: "Ayyayyo... voting!"
│
├── /04 NETWORK ANALYSIS
│   ├── Stage Trigger: Backend WebSocket emits TickUpdate with `currentTick >= 8`
│   ├── Live Payload: Computed Mainchain Stability (`1.0 - latestTick.instantGini`)
│   ├── Visual scene: Turquoise/Cyan Blob
│   └── Agent: "Network ni analyze chestunna!"
│
└── /05 SIMULATION COMPLETE
    ├── Stage Trigger: Backend WebSocket emits SimulationResult to `/topic/simulation/{id}/result`
    ├── Payload: `mainchainRate`, `branchingRatio`, `finalGiniCoefficient`, `durationMillis`
    ├── Visual scene: Magenta Geometric Crystal
    ├── Agent: "Done boss! Results ready!"
    └── UI: Manual scrolling is restored, new simulation can be started.
```
