# CHAIN55 — Final Completion Summary

This document records the final completion pass over `CP1-2-main`: what was broken, what was
changed, how it was verified, and exactly what the capstone paper must update to match the
finished codebase.

**Verification date:** 2026-11-19
**Repository:** `D:\CP1\CHAIN55\PROJECT B` (`CP1-2-main`)
**Baseline:** 140/140 backend tests passed, but `Phase13ResearchExperiments` was silently
excluded from `mvn test`; frontend built with a 1.66 MB chunk warning; research datasets had
been produced by an older code revision.

---

## 1. Definition of Done — final status

| Requirement | Status | Evidence |
| --- | --- | --- |
| All backend unit and phase tests compile and pass | **PASS** | `mvnw test` → `Tests run: 148, Failures: 0, Errors: 0, Skipped: 0`, `BUILD SUCCESS` |
| `Phase13ResearchExperiments` actually runs in the default suite | **PASS** | Added to surefire includes; run output shows `Tests run: 6` for the class |
| Frontend builds cleanly | **PASS** | `npm run build` → 2348 modules transformed, `built in 2.42s`; only the optional >500 kB chunk-size advisory |
| Frontend lint | **PASS** | `npm run lint` → `Found 88 warnings and 0 errors` (warnings are React-compiler advisories on existing animation code, not failures) |
| Simulation page wired to the real engine | **PASS** | `POST /api/simulations/start` → RabbitMQ → `SimulationWorker` runs the configured `SimulationEngine` |
| Dashboard shows live data | **PASS** | Latest result + newest-first run list fetched from MongoDB through the REST API |
| History and archived experiments browsable in the UI | **PASS** | `RUN HISTORY` and `ARCHIVED EXPERIMENTS` drawers |
| Stray logs/backups removed and ignored | **PASS** | See §5 |
| README + this summary accurate | **PASS** | This pass |

---

## 2. Backend changes

### 2.1 Test-suite completeness
- `Phase13ResearchExperiments` does not match surefire's default `*Test`/`*Tests` patterns, so
  `mvn test` never executed the research suite. Added an explicit surefire `<include>` while
  keeping all default patterns. The class name is preserved so
  `mvnw test -Dtest=Phase13ResearchExperiments` keeps working.

### 2.2 Reproducibility (root-cause fix)
- Block identifiers were generated with `UUID.randomUUID()`. Because LMD-GHOST breaks
  fork-choice ties by block id, two runs with the same seed could diverge. Proven by the
  archived data: identical baseline configurations produced different
  `canonicalHeadAgreement` (0.5333 vs 0.5667) in different experiment files.
- Added `SimulationState.nextBlockId()` (monotonic `b1`, `b2`, …). Block production in
  `ConsensusStrategy` and invalid-block creation in `ByzantineNodeAgent` now use it. The RNG
  stream is unchanged.
- Added `Phase6MetricsTests.seededRunsAreBitReproducible`, which asserts identical blocks,
  forks, stale blocks, delivered messages, agreement, mainchain rate and Gini for two runs
  with the same seed.
- After the fix every experiment baseline with the same configuration reports identical
  aggregates (verified across `exp1`/`exp2`/`exp3` baselines).

### 2.3 Scientific metrics
- **Mainchain rate** was `canonicalHeight / totalBlocks`, counting genesis in the denominator
  and therefore reporting `< 1.0` even for a single canonical chain. It is now
  `μ = |M| / |B|` over non-genesis blocks and `1.0` for a genesis-only run
  (`BlockchainState`). `Phase6MetricsTests` was updated to the corrected definition and a new
  test asserts `μ = 1.0`, `F = 0.0` for a single chain.
- **Branching ratio** was `activeForks / totalBlocks` in the worker. It is now
  `F = |Θ| / |M|` (off-chain blocks per canonical block), derived in `BlockchainState` and
  consistent with `μ` (`F = (1-μ)/μ`).
- Both values were added to `MetricsSnapshot` and are now part of every live tick, stored
  result and experiment aggregate.
- `giniCoefficient` was promised by `docs/RESEARCH_EXPERIMENT_PLAN.md` but missing from
  `ExperimentAggregate.METRICS`; it is now aggregated. `mainchainRate` and `branchingRatio`
  were added as well, taking the comparison suite from 24 to **27 metrics**.

### 2.4 Async worker / REST correctness
- `SimulationWorker` interprets `slotDuration` as **seconds** and sleeps
  `max(50 ms, slotDuration × 1000)`; previously `(long) 1.0` slept 1 ms and flooded the tick
  stream.
- Final results are taken from the engine's own final `MetricsSnapshot` (the old code
  created a second `MetricsCalculator`, which also reset the Gini field).
- `TickUpdate` now carries `totalTicks` and `progress` alongside the full metric snapshot, so
  the UI renders real progress.
- `SimulationOrchestratorService` marks a configuration `FAILED` when the RabbitMQ publish
  fails instead of leaving it `RUNNING` forever.
- `SimulationConfig` gained `createdAt`; `GET /api/simulations/history` sorts newest-first.
- `GET /api/simulations/{id}` returns configuration + status + optional result.
- `GET /api/simulations/{id}/result` returns HTTP 404 until a result exists (previously
  `200` with `null`).
- New read-only archive API: `GET /api/simulations/research` and
  `GET /api/simulations/research/{file}`, served by `ResearchResultsService` with a strict
  file-name allowlist. The directory is auto-detected (`docs/research-results`) or set with
  `RESEARCH_RESULTS_DIR`.

### 2.5 Authentication / session
- `application.yaml` declared `SameSite=None` with `Secure=false`. Browsers reject that
  combination, which silently broke session login over plain HTTP. Default is now
  `SameSite=Lax` (`SESSION_COOKIE_SAME_SITE`), with `none` + `SESSION_COOKIE_SECURE=true`
  documented for HTTPS.
- `.env.example` files updated with the new variable plus `RESEARCH_RESULTS_DIR` /
  `VITE_WS_URL`.

### 2.6 Experiment path portability
- `Phase13ResearchExperiments` and `ResearchExperimentDriver` used the absolute path
  `D:\CP1\CHAIN55\PROJECT B\docs\research-results`. They now walk up from the Maven working
  directory, prefer a directory already containing `exp*.json`, and support
  `-Dchain55.researchResultsDir=…`. An empty `Backend/Backend/docs/research-results`
  placeholder that shadowed the real archive was removed.
- Driver output file names now match the test suite (`exp1-network-latency.json`, etc.).
- Archived datasets serialize `Instant` through a dedicated test mapper, so no extra Jackson
  module or `.m2` download is required.

### 2.7 Byzantine ratio semantics
- `Phase8InactiveAgentTests.configuredRatioWithRoundingDown` documents floor semantics
  (0.3 × 5 = 1). That behaviour is preserved for Byzantine and inactive counts, and the
  Experiment 4 treatment ratio is `0.34` so that 2 of 6 agents are Byzantine as the research
  plan intends. Plan and report were updated accordingly.

---

## 3. Frontend changes

### 3.1 API layer (`services/api.js`)
- `API_BASE` and derived `WS_BASE` honour `VITE_API_BASE_URL` / `VITE_WS_URL`; no hardcoded
  `localhost:8080` inside pages.
- Added `DEFAULT_SIMULATION_CONFIG`, `simulationApi.start/history/result/get/researchList/
  researchDocument`; every call uses `credentials: 'include'`.

### 3.2 `Simulation.jsx`
- Uses the shared API client instead of direct `axios` calls and hardcoded URLs.
- Exposes **every** backend parameter: consensus, topology, nodes, ticks, seed, gossip
  latency, slot duration, jitter, Byzantine toggle/ratio/mode, inactive ratio, packet loss,
  partition ratio/start/end, PoA authority ids, transaction load (tx/agent/tick, mempool
  capacity, block cap, amount).
- Client-side validation mirrors `SimulationConfig.validate()` and the controller limits;
  errors are shown before a request is sent, and unauthenticated users see a sign-in prompt.
- Live STOMP status (`connecting/connected/reconnecting/error`), subscriptions for ticks and
  results, progressive section advance based on `progress`, and a **3-second result poll
  fallback** so a missed STOMP frame cannot leave the run stuck.
- Tick-by-tick SVG trend chart (head agreement, Gini, transaction success) plus complete
  final metrics: μ, F, Gini, throughput, transaction success, Byzantine/orphan stats,
  propagation delay, duration.
- `RUN HISTORY` drawer (newest-first, opens stored results) and `ARCHIVED EXPERIMENTS`
  drawer (reuses the existing `ExperimentReport` renderer on the JSON served by the API).
- Dashboard deep link `/simulation` with `state.openDrawer === 'history'` opens the drawer.

### 3.3 `Dashboard.jsx`
- Removed the fabricated `2,450 CHN` balance and the three hardcoded transactions.
- Section 4 now shows the latest completed run's measured μ, F, Gini and canonical-head
  agreement plus the six most recent configurations (status, consensus, nodes, ticks,
  creation time), all fetched from the backend. Empty and error states are handled.

### 3.4 Dead pages and navigation
- `Learning.jsx`, `Manual.jsx` and `Abstract.jsx` existed but had no routes and referenced
  CSS classes that were never defined (`page-container`, `kott-card`, `grid-layout`,
  `serif`). Added routes in `App.jsx`, a shared `pages/InfoPages.css`, scrollable layout and
  cross-links between the three knowledge pages.
- Added a `LEARN` item to the global navbar (active for `/learning`, `/manual`, `/abstract`).

### 3.5 Styling
- `Simulation.css` gained the configuration grid, validation list, live trend chart,
  history table, status pills and the full-screen archive/history drawers.
- Removed an unused `SimulationCursor` import from `Simulation.jsx`.

---

## 4. Research outputs (regenerated)

All nine datasets were regenerated by the fixed engine and are internally consistent:

| Dataset | Controlled factor | Treatment |
| --- | --- | --- |
| `exp1-network-latency.json` | `blockGossipLatency` 0.5 → 3.0 | 5 seeds |
| `exp2-packet-loss.json` | `packetLossRate` 0.0 → 0.3 | 5 seeds |
| `exp3-network-partition.json` | ratio 0.4, ticks 2–6 | 5 seeds |
| `exp4-byzantine.json` | 0 → 2 Byzantine agents (0.34, `ALL`) | 5 seeds |
| `exp5-tx-load.json` | 0 → 3 tx/agent/tick | 5 seeds |
| `exp6-consensus-PoS/DPoS/PoA/PoL.json` | PoW baseline vs alternative | 5 seeds each |

- 90 runs total (9 comparisons × (baseline + treatment) × 5 seeds), 0 failures.
- 27 metrics per comparison, each with mean, population standard deviation, min, max and
  sample count.
- `PoW` is present as the baseline inside every `exp6` file; no separate PoW dataset is
  needed and none was invented.
- `docs/research-results/RESEARCH_RESULTS_REPORT.md` is now **generated** from the JSON by
  `generate_report.py`, so report numbers cannot drift from the machine-readable records.
  The old report contained duplicated Experiment 4 and Experiment 5 sections and quoted
  values from a pre-fix revision; both problems are gone.
- Representative final numbers (means over 5 seeds):
  - Exp 1: head agreement 0.5333 → 0.4667, propagation delay 5.95 → 30.93 ticks.
  - Exp 2: head agreement 0.5333 → 0.4000, dropped messages 0 → 7.0.
  - Exp 3: head agreement 0.5333 → 0.5000, dropped messages 0 → 7.0.
  - Exp 4: malicious actions 0 → 2.6, withheld blocks 0 → 2.6, Byzantine agents 0 → 2.0.
  - Exp 5: created 0 → 144.0, included 0 → 55.8, success rate 0 → 0.3875.
  - Exp 6: block production rate 0.525 → 0.65 (PoS), 1.0 (DPoS/PoA/PoL); PoL reports μ = 1.0
    and F = 0.0 because a single eligible producer never forks.

---

## 5. Repository cleanup

Removed (all previously tracked or stray): root `%PYSCRIPT%`, `build_log.txt`,
`compile.txt`, `compile_log.txt`, `compile_output.txt`, `plan_check.txt`,
`plan_experiments.txt`, `run_output.txt`, `test_pw.txt`, `temp_sim_2b57_utf8.jsx`,
`temp_sim_utf8.jsx`, `temp_simulation_2b57c4d.jsx`, `temp_simulation_original.jsx`; backend
`clip.txt`, `compile.txt`, `compile_err.txt`, `compile_out.txt`, `errors.txt`,
`full_test_output.txt`, `run.txt`, `test_output.txt`, `test_pw.txt`, `test_pw_results.txt`,
`test_results.txt`; the empty duplicate `Backend/Backend/docs/` directory; local build logs
and `frontend/build-baseline.log`.

`.gitignore` additions cover `%PYSCRIPT%`, the full debug-log set
(`compile_err.txt`, `compile_out.txt`, `compile_output.txt`, `errors.txt`, `run.txt`,
`clip.txt`, `test_output.txt`, `test_pw*.txt`, `test_results.txt`, `full_test_output.txt`,
`build_log.txt`, `plan_*.txt`, `run_output.txt`), `*.orig`, `*.bak`, `*.rej`, and editor
backup files.

Configuration files verified: `docker-compose.yml` (Mongo + RabbitMQ with matching
credentials), root `.env.example`, `Backend/Backend/.env.example`, `frontend/.env.example`,
`application.yaml`.

---

## 6. Paper alignment — exact updates required

The draft paper (*CHAIN55: Agent-Based Blockchain Simulation and Learning Platform*, KL
University Batch 73) described an early prototype. After this pass the following statements
must be changed in the IEEE manuscript.

### 6.1 Architecture and implementation claims

| Draft claim | Replace with |
| --- | --- |
| Worker executes a fixed 10-tick simulation | `SimulationWorker` executes the configured `SimulationEngine` for `simulationTicks` ticks (default 10, up to 10 000) with all parameters listed in README §Simulation configuration |
| Four metrics (mainchain rate, branching ratio, Gini, duration) | 27 aggregated metrics plus a full `MetricsSnapshot` streamed per tick; duration is diagnostic, not an experimental outcome |
| Dashboard contains static presentation data | Dashboard and simulation views read configuration, history and results from MongoDB through the REST API; only marketing copy is static |
| `/api/simulations/{id}/result` always returns a result | Returns HTTP 404 while a run is pending; `GET /api/simulations/{id}` exposes status and the optional result |
| No experiment archive API | `GET /api/simulations/research` and `/research/{file}` serve the archived exp1–exp6 datasets |
| WebSocket streams "tick updates" | TickUpdate includes `currentTick`, `totalTicks`, `progress`, `blockCount`, `activeForks`, `mainchainRate`, `instantGini` and the full metrics snapshot |

### 6.2 `PoL` terminology
- Standardise on **Proof of Location (PoL)** with an explicit parenthetical on first use:
  *implemented as a deterministic proximity proxy (lowest agent id), not geographic
  verification*.
- Delete any expansion of `PoL` as "Proof of Ledger"; that term appears nowhere in the code.
- The UI option is "Proof of Location (PoL)"; the engine class is `PolConsensus` and the
  method `getEligibleLocationAgentId`.

### 6.3 Metric definitions and numbers
- Mainchain rate: `μ = |M| / |B|` over non-genesis blocks; a single-chain run reports 1.0.
  Do **not** use the old `canonicalHeight / totalBlocks` formula.
- Branching ratio: define explicitly as `F = |Θ| / |M|` (off-chain blocks per canonical
  block), and note `F = (1-μ)/μ`.
- Gini: discrete Lorenz definition over per-agent block production at the final tick.
- Replace every experiment table with the regenerated values in
  `docs/research-results/RESEARCH_RESULTS_REPORT.md`; in particular:
  - Experiment 4 now instantiates **2** Byzantine agents via ratio 0.34 (floor semantics),
    produces `maliciousActionsAttempted = 2.6` and `blocksWithheld = 2.6` (the old report
    claimed 0.0 and 2 agents at ratio 0.33).
  - Experiment 5 creates `144.0` transactions with `55.8` included and success rate `0.3875`
    (the old report claimed 36 created / 4 included / 0.0556).
  - Experiment 6 message counts and throughput changed materially under the deterministic
    block-id fix (e.g. PoS: 31 → 396 messages sent; DPoS throughput 0.575 → 1.125).
  - Experiment 2/3 head-agreement baselines are 0.5333 (not 0.6333).
- State that 5 seeds are descriptive and no significance test is claimed.

### 6.4 Reproducibility section
- State that a seed fully determines a run because block identifiers are a per-run monotonic
  sequence and fork-choice tie-breaks are therefore stable.
- State that `ExperimentRunner` copies the configuration per seed and never mutates the
  submitted template; failed runs are retained but excluded from means and deviations.
- Document `-Dchain55.researchResultsDir` and `python docs/research-results/generate_report.py`.

### 6.5 Threats to validity / limitations
Add or update:
- Tick-based proxies (simulation time, not wall-clock TPS).
- Agent-local double counting for stale/competing/orphan blocks.
- PoL is a proximity proxy.
- Byzantine counters are model observables, not security guarantees.
- Floor semantics for agent-count ratios (0.34 for 2/6).
- Ratio of 5 seeds, 8 ticks, 6 agents — small-scale design.
- Reorganizations and fork depth are **not measured**; do not report them.

### 6.6 Testing and release
- Report 148 automated tests (Phase 1–13 + Spring context), including the research suite in
  the default `mvn test` run.
- Frontend verified with `npm run build` and `npm run lint` (0 errors).
- Stack statement: Java 17 + Spring Boot, React 19 + Vite, MongoDB, RabbitMQ, STOMP/SockJS.
  No Python/Mesa code exists in the repository; remove any Mesa/Python claim.

---

## 7. How to reproduce the verification

```bash
# infrastructure
docker compose up -d

# backend (148 tests, research datasets regenerated)
cd Backend/Backend
./mvnw test                      # Windows: mvnw.cmd test

# report regeneration (optional)
python ../../docs/research-results/generate_report.py

# frontend
cd ../../frontend
npm run build
npm run lint

# run the platform
cd ../Backend/Backend && ./mvnw spring-boot:run
cd ../../frontend && npm run dev
```

Sign in with a seeded development account (`owner` / `chain55`), open **SIMULATION**, start a
run, then inspect **RUN HISTORY** and **ARCHIVED EXPERIMENTS**.

---

## 8. Remaining known limitations (explicit, not defects)

- No statistical significance testing: five seeds are reported descriptively.
- Byzantine behaviour covers the four implemented modes only; no collusion or network-level
  eclipse attack model.
- Reorganizations and fork depth are not instrumented; the API reports them as unsupported.
- `SimulationResult`/`SimulationConfig` identifiers remain UUIDs (identity only, they never
  participate in consensus decisions).
- `npm run lint` still reports 88 React-compiler advisories in animation-heavy legacy
  components; they are warnings (0 errors) and do not affect the build or runtime.
- The production bundle is a single ~1.64 MB chunk; code-splitting is a future optimisation.
