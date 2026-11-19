# CHAIN55 — Agent-Based Blockchain Simulation & Learning Platform

CHAIN55 models a distributed ledger as a **Complex Adaptive System (CAS)**: every node is an
autonomous, stateful agent with local state (stake/balance, peers, blocktree, mempool,
attestations) that gossips blocks and attestations, validates and solidifies blocks, runs
fork choice (LMD GHOST), and proposes blocks when the active consensus mechanism selects it.
Micro-level interactions produce the macro-level properties the platform measures —
consensus stability, fork proliferation, phase transitions, and centralization of block
production.

The stack is a complete, runnable platform:

- **Spring Boot 4 (Java 17)** simulation engine, REST API, RabbitMQ worker and STOMP/WebSocket stream
- **React 19 + Vite** interactive console (configuration, live telemetry, history, archive)
- **MongoDB** persistence for configurations and final results
- **RabbitMQ** asynchronous job queue and tick/result fan-out
- **9 seeded research datasets** (`exp1`–`exp6`) produced by the test suite itself

> Run `mvnw test` (backend) and `npm run build` (frontend) before demoing; both are green and
> the research datasets are regenerated as part of the backend test suite.

---

## Research foundation

The simulator synthesises four peer-reviewed models:

| Source | Model elements implemented |
| --- | --- |
| Kraner et al. (2023), *Agent-Based Modelling of Ethereum Consensus* | Gasper-style LMD GHOST fork choice, slot/attestation thresholds, stochastic block and attestation gossip, Erdős–Rényi P2P graphs, mainchain rate μ and branching ratio F |
| Wei, Li & He (2020), *Impacts of Consensus Protocols and Trade Network Topologies* | PoW / PoS / DPoS with Random (Erdős–Rényi), Small-World and Scale-Free topologies; Gini index of block production; transaction creation/inclusion metrics |
| Mueller-Bloch et al. (2022), *Decentralization of Decision-Making Power in PoS* | CAS mapping (generative rules → micro agents → macro distribution), stake-weighted block production, Lorenz/Gini concentration measure |
| Lin et al. (2023), *TangleSim* | Modular agent pipeline: gossip, storage, solidification (missing-parent requests), block factory, booker/opinion state; heterogeneous delay, packet loss, Byzantine layer |

### Core metrics

| Metric | Definition |
| --- | --- |
| Mainchain rate | `μ = |M| / |B|` where `M` is the canonical chain length and `B` excludes genesis; a single-chain run reports `1.0` |
| Branching ratio | `F = |Θ| / |M|` (off-chain blocks per canonical block), the fork counterpart of μ |
| Gini coefficient | Gini of per-agent block production at the final tick (`0` equal, `1` maximal concentration) |
| Canonical-head agreement | Share of agents sharing the most common local head |
| Converged | `true` only when every agent has a head and all heads agree |
| Transaction success rate | Unique included transactions / transactions accepted into mempools |
| Block production rate | Blocks produced / completed simulation ticks (simulation time, not wall-clock TPS) |
| Average propagation delay | Mean scheduled delivery delay in **simulation ticks** (not physical latency) |

Agent-local counters (`staleBlocks`, `competingBlocks`, `orphanBlocks`) are summed per agent,
so one block can be counted once per agent that knows it. `reorganizations` and `forkDepth`
are explicitly **not** measured and are reported as unsupported instead of being invented.

---

## Repository layout

```text
PROJECT B/
├── Backend/Backend/                  Spring Boot application
│   ├── src/main/java/com/ProB/Backend/BackendApplication.java
│   ├── src/main/java/com/sim/
│   │   ├── agent/        BlockchainAgent, ByzantineNodeAgent, TransactionMempool
│   │   ├── blockchain/   Block, Attestation, BlockchainState
│   │   ├── consensus/    ConsensusStrategy, PoW/PoS/DPoS/PoA/PoL, LmdGhostForkChoice
│   │   ├── engine/       SimulationEngine, SimulationState, SimulationTick
│   │   ├── network/      NetworkModel, NetworkMessage
│   │   ├── metrics/      GiniCalculator, MetricsCalculator, MetricsSnapshot
│   │   ├── experiment/   ExperimentRunner, ExperimentComparisonRunner, FactorDetector,
│   │   │                 aggregates, statistics and comparison models
│   │   ├── service/      SimulationOrchestratorService, WebSocketStreamService,
│   │   │                 ResearchResultsService (+ auth/blog/team/friend services)
│   │   ├── controller/   SimulationController, AuthController, …
│   │   ├── listener/     RabbitMQListener
│   │   ├── worker/       SimulationWorker
│   │   ├── config/       RabbitMQConfig, WebSocketConfig, SecurityConfig, DataSeeder
│   │   ├── model/        SimulationConfig, SimulationResult, TickUpdate, …
│   │   └── repository/   Mongo repositories
│   ├── src/test/java/com/sim/        Phase1…Phase13 tests + ResearchExperimentDriver
│   └── src/main/resources/application.yaml
├── docs/
│   ├── SIMULATION_ROADMAP.md         End-to-end data flow and experiment semantics
│   ├── RESEARCH_EXPERIMENT_PLAN.md   Pre-registered exp1–exp6 design
│   ├── FINAL_COMPLETION_SUMMARY.md   What changed in the final completion pass
│   └── research-results/             exp*.json datasets + RESEARCH_RESULTS_REPORT.md
├── frontend/                         React 19 + Vite SPA
│   └── src/
│       ├── pages/        Login, Landing, Dashboard, Simulation, Learning, Manual, Abstract, Blog, Profile
│       ├── components/   Navbar, SimulationCursor, InteractiveShape, NexusTeamModal
│       └── services/api.js  REST client, simulationApi, DEFAULT_SIMULATION_CONFIG
├── docker-compose.yml                MongoDB + RabbitMQ
├── .env.example                      Shared configuration template
└── README.md
```

---

## Phase capability map

| Phase | Capability |
| --- | --- |
| 1 | Stateful `BlockchainAgent`, stake, peer list, blocktree, mempool |
| 2 | P2P network model with seeded topologies (Erdős–Rényi, Small-World, Scale-Free) |
| 3 | Block tree, validation, solidification and missing-parent requests |
| 4 | Attestations, latest-message tracking and slot thresholds |
| 5 | PoW / PoS / DPoS / PoA / PoL consensus strategies and LMD GHOST fork choice |
| 6 | Authoritative metrics snapshot (mainchain rate, branching ratio, Gini, convergence, messages) |
| 7 | Transaction generation, mempool capacity, inclusion accounting |
| 8 | Inactive agents (no production, attestation, gossip or transactions) |
| 9 | Byzantine agents: equivocation, block withholding, invalid blocks, combined `ALL` |
| 10 | Packet loss, latency jitter, network partitions, delay queue and propagation metrics |
| 11 | Multi-seed repeated runs and baseline-vs-treatment comparison with factor detection |
| 12 | Experiment validation (limits, controlled comparisons, unavailable measurements) |
| 13 | Reproducible research suite writing `docs/research-results/exp*.json` |

---

## Quick start

### Prerequisites

- Java 17+ (`java -version`)
- Node.js 20+ and npm
- Docker Desktop (for MongoDB and RabbitMQ)

### 1. Infrastructure

```bash
docker compose up -d
```

| Service | Address |
| --- | --- |
| MongoDB | `mongodb://localhost:27017/simulation_db` |
| RabbitMQ AMQP | `localhost:5672` |
| RabbitMQ management | http://localhost:15672 (`guest` / `guest`) |

### 2. Backend

```bash
cd Backend/Backend
./mvnw spring-boot:run        # Windows: mvnw.cmd spring-boot:run
```

API base: `http://localhost:8080`, WebSocket/SockJS: `http://localhost:8080/ws-simulation`.
On startup `DataSeeder` creates development accounts (only if absent):

| Username | Password | Role |
| --- | --- | --- |
| `owner` | `chain55` | OWNER |
| `admin` | `admin` | ADMIN |
| `pavan` | `pavan123` | USER |
| `sarah` | `sarah123` | USER |

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL (default `http://localhost:5173`) and sign in. The login session is a
server-side session cookie; `SESSION_COOKIE_SAME_SITE=lax` works for local/LAN HTTP, and
`none` + `SESSION_COOKIE_SECURE=true` is required only behind HTTPS.

### Environment variables

Copy `.env.example` (root), `Backend/Backend/.env.example` and `frontend/.env.example` as needed.

| Variable | Default | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | `mongodb://localhost:27017/simulation_db` | Mongo connection |
| `RABBITMQ_HOST` / `PORT` / `USERNAME` / `PASSWORD` | `localhost` / `5672` / `guest` / `guest` | Broker |
| `PORT` | `8080` | Backend HTTP port |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173` | REST + STOMP origins |
| `SESSION_COOKIE_SAME_SITE` | `lax` | Session cookie policy |
| `SESSION_COOKIE_SECURE` | `false` | Set `true` behind HTTPS |
| `RESEARCH_RESULTS_DIR` | auto-detect `docs/research-results` | Directory served by the archive API |
| `VITE_API_BASE_URL` | `http://localhost:8080/api` | Frontend REST base |
| `VITE_WS_URL` | derived from the API base | Optional STOMP endpoint override |

---

## Simulation configuration

All fields map 1:1 to `com.sim.model.SimulationConfig`; the frontend form and the REST API
accept the same names.

| Field | Default | Meaning |
| --- | --- | --- |
| `nodeCount` | 10 | Number of agents (1–1000 via API) |
| `consensusType` | `PoW` | `PoW`, `PoS`, `DPoS`, `PoA`, `PoL` |
| `networkTopology` | `Erdos-Renyi` | `Erdos-Renyi`, `Small-World`, `Scale-Free` |
| `blockGossipLatency` | 0.5 | Seconds of gossip latency → `10 × latency` simulation ticks |
| `slotDuration` | 1.0 | Seconds per tick in the live worker (50 ms floor) |
| `simulationTicks` | 10 | Number of simulation ticks (≤ 10 000 via API) |
| `randomSeed` | 7 | Seed for all stochastic draws; a seed fully determines a run |
| `byzantineRatio` | 0.0 | Fraction of agents instantiated as Byzantine (rounded) |
| `byzantineBehaviorEnabled` | false | Enables the attack mode below |
| `byzantineAttackMode` | `EQUIVOCATION` | `EQUIVOCATION`, `BLOCK_WITHHOLDING`, `INVALID_BLOCK`, `ALL`, `NONE` |
| `inactiveAgentRatio` | 0.0 | Fraction of agents marked inactive (rounded) |
| `packetLossRate` | 0.0 | Per-message drop probability |
| `networkLatencyJitter` | 2 | Uniform `[0, jitter]` extra delay ticks |
| `partitionRatio` | 0.0 | Fraction of agents in partition group B |
| `partitionStartTick` / `partitionEndTick` | -1 / -1 | Partition window (inclusive, `-1` disables) |
| `partitionGroupA` / `partitionGroupB` | `[]` | Optional explicit partition membership |
| `authorityIds` | `[]` | PoA authorities; empty = first agents by id |
| `transactionsPerAgentPerTick` | 0 | Transaction generation load |
| `mempoolCapacity` | 100 | Per-agent mempool capacity |
| `maxTransactionsPerBlock` | 100 | Inclusion cap per block |
| `transactionAmount` | 1.0 | Amount carried by generated transactions |

**PoL naming:** `PoL` is **Proof of Location** everywhere in this codebase. Because the model
has no geographic data, it is implemented as a deterministic *proximity proxy*: the lowest
agent id is treated as the closest eligible location and only that agent may propose a block.
It is not geographic verification and is described as a proxy in the UI, docs and report.

---

## REST API

All endpoints except `/api/auth/**` require an authenticated session cookie (login through
the UI or `POST /api/auth/login`).

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/auth/signup` | Register (returns assigned UID) |
| `POST` | `/api/auth/login` | Create session (`username`, `password`, optional `uid`) |
| `GET` | `/api/auth/me` | Current session user |
| `POST` | `/api/auth/logout` | Invalidate session |
| `POST` | `/api/simulations/start` | Validate, persist and queue a simulation |
| `GET` | `/api/simulations/history` | Persisted configurations, newest first |
| `GET` | `/api/simulations/{id}` | Configuration + status + optional final result |
| `GET` | `/api/simulations/{id}/result` | Stored final result (404 until the run finishes) |
| `POST` | `/api/simulations/experiment` | Repeat one configuration over a seed list |
| `POST` | `/api/simulations/experiment/compare` | Baseline vs. treatments with shared seeds |
| `GET` | `/api/simulations/research` | Index of archived `exp*.json` datasets |
| `GET` | `/api/simulations/research/{file}` | One archived dataset, exactly as written by the test suite |

Example run:

```bash
curl -c cookies.txt -H "Content-Type: application/json" \
  -d '{"username":"owner","password":"chain55"}' \
  http://localhost:8080/api/auth/login

curl -b cookies.txt -H "Content-Type: application/json" \
  -d '{"nodeCount":10,"consensusType":"PoS","networkTopology":"Erdos-Renyi",
       "blockGossipLatency":0.5,"slotDuration":1.0,"simulationTicks":10,
       "randomSeed":7,"byzantineRatio":0.2,"byzantineBehaviorEnabled":true,
       "byzantineAttackMode":"ALL","packetLossRate":0.05,"networkLatencyJitter":2,
       "transactionsPerAgentPerTick":2,"inactiveAgentRatio":0.1}' \
  http://localhost:8080/api/simulations/start
```

Validation failures return `400` with `{"error": "..."}`. Resource limits are
`nodeCount ≤ 1000`, `simulationTicks ≤ 10000`, `seeds ≤ 50`.

### WebSocket / STOMP

SockJS endpoint: `/ws-simulation`.

| Topic | Payload |
| --- | --- |
| `/topic/simulation/{id}` | `TickUpdate`: `currentTick`, `totalTicks`, `progress`, `blockCount`, `activeForks`, `mainchainRate`, `instantGini`, `metrics` (`MetricsSnapshot`) |
| `/topic/simulation/{id}/result` | `SimulationResult`: status, consensus, seed, ticks, μ, F, Gini, duration, full final metrics |

The frontend also polls `GET /api/simulations/{id}` every 3 s until the run completes, so a
dropped STOMP frame does not leave the UI stuck.

---

## Simulation pipeline

```text
Simulation.jsx ──POST /api/simulations/start──► SimulationController
                                                   │ validate + persist (RUNNING)
                                                   ▼
                                     SimulationOrchestratorService ──► RabbitMQ jobs queue
                                                                          │
                                                                          ▼
                                                              SimulationWorker
                                                        builds SimulationEngine, ticks it
                                                                          │
                                            ┌─────────────────────────────┤
                                            ▼                             ▼
                                   ticks queue (TickUpdate)      results queue (SimulationResult)
                                            │                             │
                                            ▼                             ▼
                                   RabbitMQListener ──► STOMP /topic/... ──► React live state
                                            │                             │
                                            └──────────────► MongoDB ◄────┘
```

`SimulationWorker` runs the real `SimulationEngine` — configurable node count, consensus,
topology, latency, loss, partitions, Byzantine/inactive agents, transaction load and tick
count — not a fixed stub. Each tick publishes a cumulative `MetricsSnapshot`; the stored
result is the engine's own final snapshot, so persisted and streamed metrics agree.

---

## Research experiments (exp1–exp6)

`docs/RESEARCH_EXPERIMENT_PLAN.md` pre-registers six controlled experiments. They are
executed by `Phase13ResearchExperiments`, which is part of the normal `mvnw test` run and
writes the datasets to `docs/research-results/`:

| File | Comparison |
| --- | --- |
| `exp1-network-latency.json` | gossip latency 0.5 → 3.0 |
| `exp2-packet-loss.json` | packet loss 0.0 → 0.3 |
| `exp3-network-partition.json` | no partition → ratio 0.4, ticks 2–6 |
| `exp4-byzantine.json` | Byzantine ratio 0.0 → 0.33 with `ALL` attacks |
| `exp5-tx-load.json` | 0 → 3 transactions per agent per tick |
| `exp6-consensus-PoS/DPoS/PoA/PoL.json` | PoW baseline vs each alternative consensus |

Every comparison uses the shared seeds `1..5`, changes exactly one conceptual factor, and
aggregates 27 metrics as mean, population standard deviation, min, max and sample count.
PoW is the baseline **inside every `exp6` file**, so no separate PoW dataset is needed.
Failed runs stay in `runs`/`failedRuns` and never contribute a zero observation.

Regenerate the datasets:

```bash
cd Backend/Backend
mvnw test -Dtest=Phase13ResearchExperiments      # Windows: mvnw.cmd ...
# optional explicit output directory:
mvnw test -Dtest=Phase13ResearchExperiments -Dchain55.researchResultsDir=/path/to/results
```

`ResearchExperimentDriver` exposes the same runs as a `main()` for programmatic use. The
result report is `docs/research-results/RESEARCH_RESULTS_REPORT.md`; archived datasets are
also browsable in the UI via **SIMULATION → ARCHIVED EXPERIMENTS**.

Reproducibility guarantees:

- The same seed produces the same run: block identifiers are a per-run monotonic sequence, not random UUIDs, so fork-choice tie-breaks are stable.
- `ExperimentRunner` copies the template per seed and never mutates it.
- `isControlled()` is true only when exactly one conceptual factor differs; multi-factor deltas are descriptive, not causal.
- Relative deltas are `null` (with a reason) when the baseline mean is zero; no zero substitution.

---

## Testing & verification

```bash
# backend: 147 tests across Phase1…Phase13 plus the Spring context test
cd Backend/Backend
mvnw test

# frontend: production build and lint
cd frontend
npm run build
npm run lint        # oxlint: 0 errors
```

The surefire configuration explicitly includes `Phase13ResearchExperiments` (a class name
that does not match the default `*Test(s)` patterns) so `mvnw test` really runs the research
suite. A non-zero shell exit after `BUILD SUCCESS` on Windows is only the Mockito/JDK agent
warning on stderr.

---

## Troubleshooting

**Login succeeds but simulation calls return 401** — the session cookie was rejected.
Use `SESSION_COOKIE_SAME_SITE=lax` over HTTP (default), and only set
`SESSION_COOKIE_SAME_SITE=none` together with `SESSION_COOKIE_SECURE=true` on HTTPS.

**Simulation stays `RUNNING` forever** — RabbitMQ is unreachable or no worker consumed the
job. Check `docker compose ps` and the RabbitMQ management UI; the orchestrator marks the
configuration `FAILED` when the job cannot be published.

**No live ticks** — confirm the CORS/STOMP origin list contains the exact browser origin and
that `/ws-simulation` is reachable. The dashboard still updates through the 3 s result poll.

**ARCHIVED EXPERIMENTS is empty** — run the Phase 13 tests (or set `RESEARCH_RESULTS_DIR` to
the `docs/research-results` directory).

**MongoDB / RabbitMQ connection errors** — `docker compose up -d`, then
`docker compose logs mongodb` / `docker compose logs rabbitmq`.

---

## Model limitations

- Simulation ticks are not wall-clock time; block production and message throughput are tick-based proxies.
- Network delay is a discrete delivery queue, not physical latency; packet loss and partitions are modelled stochastically per message.
- PoL is a deterministic proximity proxy (lowest agent id), not geographic verification.
- Byzantine behaviour is simulated for experimentation; counters are model observables, not security claims.
- Results from five seeds per comparison are descriptive associations, not causal conclusions.

## License

No license has been specified for this repository yet.
