# CHAIN55 — Agent-Based Modelling of Distributed Ledger Participant Behaviour

[![Java](https://img.shields.io/badge/Java-17-orange.svg)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-Backend-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-19%20%2B%20Vite-61DAFB.svg)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/3D%20Visualizer-Three.js-black.svg)](https://threejs.org/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248.svg)](https://www.mongodb.com/)
[![RabbitMQ](https://img.shields.io/badge/Queue-RabbitMQ-FF6600.svg)](https://www.rabbitmq.com/)
[![Tests](https://img.shields.io/badge/Maven%20Tests-149%20Passing-success.svg)](#verification--automated-testing)

**CHAIN55** is an interactive, full-stack **Agent-Based Blockchain Simulation, Research & Learning Platform** built as a Complex Adaptive Systems (CAS) laboratory. Rather than assuming all blockchain nodes behave identically, CHAIN55 models every validator and peer as an autonomous, stateful software agent interacting over realistic peer-to-peer (P2P) topologies—revealing how honest, inactive, slow, and malicious (Byzantine) behaviors drive macro-level consensus stability, forks, throughput, and wealth centralization.

---

## Table of Contents

- [Problem Statement & Core Aim](#problem-statement--core-aim)
- [Key Features](#key-features)
- [System Architecture & Tech Stack](#system-architecture--tech-stack)
- [Theoretical & Research Foundation](#theoretical--research-foundation)
- [Research Experiments & Metrics](#research-experiments--metrics)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
- [Verification & Automated Testing](#verification--automated-testing)
- [Project Team & Credits](#project-team--credits)

---

## Problem Statement & Core Aim

Traditional analytical models for Distributed Ledger Technology (DLT) assume **homogeneous participant behavior** to simplify mathematical modeling. Real blockchain networks violate that assumption: nodes can be honest, malicious (executing equivocation or block withholding), inactive, or hindered by high latency, packet loss, and network partitions.

CHAIN55 provides a low-cost, repeatable testbed to answer critical pre-deployment questions:
- How does consensus degrade when a fraction of validators turn Byzantine or go offline?
- Under what latency, packet loss, or network partition conditions does a unified chain disintegrate into disconnected forks?
- How do consensus mechanisms and P2P network topologies shape transaction throughput, fork intensity, and wealth/decision-making centralization?

---

## Key Features

### 1. Complex Adaptive Systems (CAS) Simulation Engine (Phases 1–13)
- **Autonomous Stateful Agents:** Each `BlockchainAgent` maintains local state (node ID, stake/balance, P2P neighbors, local blocktree `BlockchainState`, local `TransactionMempool`, and latest peer attestations).
- **Adversarial & Fault Modeling:** Dedicated `ByzantineNodeAgent` supporting configurable malicious ratios and attack modes (e.g., attestation equivocation, block withholding), alongside configurable inactive node ratios.
- **5 Pluggable Consensus Mechanisms (`ConsensusStrategy`):**
  - Proof of Work (**PoW**)
  - Proof of Stake (**PoS**)
  - Delegated Proof of Stake (**DPoS**)
  - Proof of Authority (**PoA**)
  - Proof of Location (**PoL**)
- **Fork Choice Rule:** Local **LMD GHOST** (*Latest Message Driven Greediest Heaviest Observed SubTree*) head selection (`LmdGhostForkChoice`).
- **3 P2P Network Topologies & Reliability Faults (`NetworkModel`):**
  - **Erdős–Rényi** (Random), **Small-World** (Watts–Strogatz), and **Scale-Free** (Barabási–Albert) graphs.
  - Configurable slot duration, propagation latency jitter, probabilistic packet loss, and timed network partitions.

### 2. Live 3D Cosmic Agent Visualizer (`/agent`)
- Launching a simulation from `/simulation` automatically opens the live Three.js WebGL stage streamed via **WebSocket / STOMP**.
- **Space-Themed Visual Encoding:**
  - **Honest Active Agents:** Swirling cyan spiral galaxies with glowing solid cores.
  - **Active Slot Proposer:** Radiant golden super-galaxy / quasar.
  - **Inactive / Offline Agents:** Dim silver-slate dormant galaxies.
  - **Byzantine / Malicious Agents:** Jagged, molten crimson-glowing meteoroids/asteroids.
  - **P2P Topology Links:** Thick, high-contrast glowing cyan cylinder bridges carrying live animated block, attestation, transaction, and attack pulses between exact neighbor pairs.
- **Interactive Inspection:** Full 3D `OrbitControls`, live telemetry event feed, and click-to-inspect **Node Inspector** displaying any agent's role, stake, head block, mempool size, neighbors, and active actions.

### 3. Analytics, Learning & Architecture Hub
- **Simulation Lab (`/simulation`):** Full-parameter configuration studio for consensus, topology, fault injection, and Byzantine scenarios.
- **Analytics Dashboard (`/dashboard`):** Persisted simulation history and performance metrics loaded live from MongoDB.
- **Interactive Learn Hub (`/learn`):** Five structured modules covering CAS/ABM principles, consensus mechanisms, network topologies & phase transitions, adversarial faults, and metric interpretation.
- **Technical Architecture Explorer (`/architecture`):** Dedicated full-stack breakdown of every layer and component in CHAIN55.
- **Multi-Seed Statistical Experiment Suite (`com.sim.experiment`):** Automated baseline-vs-treatment runner with statistical aggregation and factor-change detection.

---

## System Architecture & Tech Stack

```text
┌─────────────────────────────┐      REST API (Axios)      ┌──────────────────────────────────┐
│        Frontend Layer       │ ─────────────────────────► │          Backend Layer           │
│ React 19 + Vite + Three.js  │                            │    Java 17 + Spring Boot         │
│ Simulation / 3D Agent /     │ ◄─── WebSocket / STOMP ─── │ SimulationController / Security  │
│ Dashboard / Learn / Arch    │       (Live Telemetry)     │ SimulationOrchestratorService    │
└─────────────────────────────┘                            └───────────┬──────────────┬───────┘
                                                                       │              │
                                                      Persist Configs  │              │ Publish Job
                                                      & Results        ▼              ▼
                                                           ┌────────────────┐  ┌──────────────┐
                                                           │    MongoDB     │  │   RabbitMQ   │
                                                           │  (Spring Data) │  │ (Async Queue)│
                                                           └────────────────┘  └──────┬───────┘
                                                                                      │ Consume Job
                                                                                      ▼
                                                           ┌──────────────────────────────────┐
                                                           │    Simulation Processing Layer   │
                                                           │ SimulationWorker + Engine (P1-13)│
                                                           │ Agents / LMD-GHOST / NetworkModel│
                                                           └──────────────────────────────────┘
```

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React 19, Vite, React Router, Axios, Three.js (`OrbitControls`), Custom CSS, Oxlint |
| **Backend** | Java 17, Spring Boot, Maven, Spring Security, Jackson |
| **Database** | MongoDB (via Spring Data MongoDB) |
| **Async Queue & Streaming** | RabbitMQ, Spring WebSocket, STOMP, SockJS |
| **Infrastructure & Reporting** | Docker Compose, JUnit 5 (149 tests), Python report generator (`generate_report.py`) |

---

## Theoretical & Research Foundation

CHAIN55 synthesizes mechanics and mathematical metrics from four peer-reviewed studies:

1. **Kraner, Vallarano, Tessone, & Schwarz-Schilling (2023)** — *Agent-Based Modelling of Ethereum Consensus* (`arXiv:2305.13906`): LMD GHOST fork choice, slot/attestation thresholds, block and attestation gossip latencies, reorg/balancing threats, and latency-driven phase transitions.
2. **Wei, Li, & He (2020)** — *Impacts of Consensus Protocols and Trade Network Topologies on Blockchain System Performance* (*JASSS* 23(3)): Comparative evaluation of PoW, PoS, and DPoS across Random, Small-World, and Scale-Free topologies using Gini inequality and trade efficiency.
3. **Mueller-Bloch, Andersen, Spasovski, & Hahn (2022)** — *Understanding Decentralization of Decision-Making Power in Proof-of-Stake Blockchains* (*EJIS*): Formal Complex Adaptive Systems (CAS) mapping (generative rules, elemental micro-agents, observed macro-outcomes) and Lorenz-curve Gini centralization analysis.
4. **Lin, Dziubałtowska, Macek, Penzkofer, & Müller (2023)** — *TangleSim: An Agent-Based, Modular Simulator for DAG-Based DLTs* (`arXiv:2305.01232`): Modular gossip/solidification pipelines, heterogeneous link delays, packet loss, and Byzantine adversarial models.

---

## Research Experiments & Metrics

### Core Mathematical Metrics
- **Mainchain Rate ($\mu$):** Proportion of produced blocks retained in the canonical chain ($\mu \to 1$ indicates healthy consensus):
  $$\mu = \frac{\vert{}M\vert{}}{\vert{}B\vert{}} = 1 - \frac{\vert{}\Theta\vert{}}{\vert{}B\vert{}}$$
- **Branching Ratio ($F$):** Fork intensity off the mainchain ($F = 0$ indicates zero forks):
  $$F = \frac{1}{\vert{}M\vert{}}\sum_{b \in M}\sum_{c \in \Theta}\delta(p(b), p(c))$$
- **Consensus Phase-Transition Law:** Consensus disintegrates into competing forks when network diameter times block latency exceeds slot duration:
  $$D(\mathcal{G})\tau_{\text{block}} > T_{\text{slot}}$$
- **Gini Coefficient ($G \in [0, 1]$):** Measures wealth and decision-making centralization across participants ($0$ = uniform decentralization, $1$ = monopoly centralization).

### Included Experiment Datasets (`docs/research-results/`)
- `exp1-network-latency.json` — Impact of propagation latency on mainchain rate and branching ratio
- `exp2-packet-loss.json` — Network degradation under probabilistic packet drops
- `exp3-network-partition.json` — Consensus divergence and recovery across timed network splits
- `exp4-byzantine.json` — Resilience under varying fractions of adversarial Byzantine nodes
- `exp5-tx-load.json` — Mempool dynamics, throughput, and confirmation performance under load
- `exp6-consensus-{PoS, DPoS, PoA, PoL}.json` — Cross-protocol consensus comparisons
- `RESEARCH_RESULTS_REPORT.md` — Compiled statistical analysis across all experiments

---

## Repository Structure

```text
CP1-2/
├── docker-compose.yml                  # MongoDB & RabbitMQ containers
├── .env.example                        # Root environment variable template
├── Backend/
│   └── Backend/
│       ├── pom.xml                     # Maven dependencies (Java 17 / Spring Boot)
│       ├── src/main/java/com/
│       │   ├── ProB/Backend/           # Spring Boot entry point
│       │   └── sim/
│       │       ├── agent/              # BlockchainAgent, ByzantineNodeAgent, TransactionMempool
│       │       ├── blockchain/         # Block, Attestation, BlockchainState
│       │       ├── consensus/          # ConsensusStrategy (PoW/PoS/DPoS/PoA/PoL), LmdGhostForkChoice
│       │       ├── network/            # NetworkModel, NetworkMessage
│       │       ├── engine/             # SimulationEngine, SimulationState, SimulationTick
│       │       ├── metrics/            # MetricsCalculator, GiniCalculator, MetricsSnapshot
│       │       ├── experiment/         # Multi-seed statistical comparison framework
│       │       ├── worker/             # SimulationWorker (async execution + live telemetry)
│       │       ├── controller/         # REST API controllers
│       │       ├── service/            # Orchestration, WebSocket streaming, research results, auth
│       │       ├── listener/           # RabbitMQListener
│       │       ├── config/             # Security, MongoDB seeding, RabbitMQ, WebSocket, Jackson
│       │       ├── model/              # SimulationConfig, TickUpdate, Node/Edge/EventTelemetry, etc.
│       │       └── repository/         # Spring Data MongoDB repositories
│       └── src/test/java/com/sim/      # Phase1AgentTests .. Phase13ResearchExperiments + Worker tests
├── frontend/
│   ├── package.json                    # React 19, Vite, Three.js, Axios, React Router
│   └── src/
│       ├── components/                 # Navbar, InteractiveShape, SimulationCursor
│       ├── pages/                      # Landing, Login, Dashboard, Simulation, Agent (3D),
│       │                               # Learning, Architecture, Abstract, Manual, Blog, Profile
│       └── services/api.js             # REST & WebSocket API client
└── docs/
    ├── SIMULATION_ROADMAP.md           # 13-phase engineering roadmap
    ├── RESEARCH_EXPERIMENT_PLAN.md     # Experimental design specification
    ├── FINAL_COMPLETION_SUMMARY.md     # Final release audit summary
    └── research-results/               # exp1–exp6 JSON datasets, report & generator script
```

---

## Getting Started

### Prerequisites
- **Java 17+**
- **Node.js 18+** & **npm**
- **Docker & Docker Compose** (for MongoDB and RabbitMQ)

### 1. Clone & Configure Environment
```bash
git clone [https://github.com/KVRPavanShanmukh/CP1-2.git](https://github.com/KVRPavanShanmukh/CP1-2.git)
cd CP1-2
```
Copy `.env.example` (root, `Backend/Backend/.env.example`, and `frontend/.env.example`) to `.env` and fill in your local values if customizing defaults.

### 2. Start MongoDB & RabbitMQ
```bash
docker-compose up -d
```

### 3. Run the Spring Boot Backend
**Windows (PowerShell):**
```powershell
cd Backend\Backend
.\mvnw.cmd spring-boot:run
```
**macOS / Linux:**
```bash
cd Backend/Backend
./mvnw spring-boot:run
```
The backend runs on `http://localhost:8080`.

### 4. Run the React + Vite Frontend
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser. Logging in redirects directly to `/landing`, and starting any simulation from `/simulation` automatically launches the live 3D Cosmic Agent Visualizer at `/agent`.

---

## Verification & Automated Testing

### Backend Test Suite (149 Automated Tests)
Run the full phased test suite (`Phase1AgentTests` through `Phase13ResearchExperiments`, `SimulationWorkerTests`, and `BackendApplicationTests`):

```powershell
# Windows
cd Backend\Backend
.\mvnw.cmd test

# macOS / Linux
cd Backend/Backend
./mvnw test
```

### Frontend Production Build & Lint
```bash
cd frontend
npm run lint
npm run build
```

---

## Project Team & Credits

Developed at the **Department of Computer Science & Information Technology, KL University (Vijayawada, Andhra Pradesh, India — Capstone Batch 73)**.

| Name | Role | Contributions |
| :--- | :--- | :--- |
| **Jupalli Pravallika** | **Team Leader** | Project leadership & coordination, literature survey, research documentation, and consensus algorithm comparison |
| **K.V.R. Sai Pavan Shanmukh** | **Core Backend & Lead Full-Stack System Architect** | End-to-end architecture and development: Java Spring Boot CAS simulation engine (Phases 1–13), all 5 consensus protocols, P2P network topologies, RabbitMQ + WebSocket live telemetry, statistical research engine, React 19 + Vite frontend, Three.js 3D Cosmic Agent Visualizer, and full-stack integration |
| **Janga Sathvik Reddy** | **Database Management** | MongoDB schema configuration, document collections, and persistent storage management |
| **V Sai Ganesh** | **Testing & Quality Assurance** | Test case validation, quality assurance workflows, and consensus scenario verification |
| **Jaladi Rohan Kumar** | **Testing & Quality Assurance** | Simulation testing execution, scenario verification, and metric output validation |

**Faculty Guide & Research Mentor:** **K. Nirmala**, Department of Computer Science & Information Technology, KL University.