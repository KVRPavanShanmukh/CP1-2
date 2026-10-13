# CHAIN55 Phases 1–6 — Final Audit Report

**Audit date:** 2026-10-13  
**Scope:** Read-only. No files were modified.

---

## 1. Git Diff & Changed-File List

### `git diff --check HEAD` result
```
(no output — exit 0)
```
No trailing whitespace or whitespace errors anywhere in the working tree.

### Latest two commits (HEAD and HEAD~1)

| Commit | Message |
|--------|---------|
| `a706660` | Phase 6 completed. Audit needed |
| `9a69746` | Phase 6 completed. Audit needed |

### Files changed across Phases 5 → 6 (`HEAD~2..HEAD`) — 21 files, 730 net insertions

| File | ±Lines |
|---|---|
| `.gitignore` | +38 |
| `BlockchainAgent.java` | +34 |
| `ConsensusStrategy.java` | +9 |
| `SimulationController.java` | +36 |
| `SimulationEngine.java` | +7 |
| `ExperimentAggregate.java` | +54 (new) |
| `ExperimentRequest.java` | +15 (new) |
| `ExperimentRunResult.java` | +28 (new) |
| `ExperimentRunner.java` | +61 (new) |
| `RabbitMQListener.java` | +15/−15 |
| `MetricsCalculator.java` | +58 |
| `MetricsSnapshot.java` | +80 (new) |
| `SimulationConfig.java` | +41 |
| `SimulationResult.java` | +19 |
| `TickUpdate.java` | +4 |
| `NetworkModel.java` | +17 |
| `SimulationOrchestratorService.java` | +1 |
| `SimulationWorker.java` | +50 |
| `Phase6MetricsTests.java` | +132 (new) |
| `docs/SIMULATION_ROADMAP.md` | +25 |
| `frontend/src/pages/Simulation.jsx` | +56 |

> **Stale temp files found in repo root:** `temp_sim_2b57_utf8.jsx`, `temp_sim_utf8.jsx`, `temp_simulation_2b57c4d.jsx`, `temp_simulation_original.jsx`.  
> These are not tracked by the Phase changes but are present in the working tree and are untracked/ignored by `.gitignore`. They do not affect the build.

---

## 2. `POST /api/simulations/experiment` — Correctness

**Controller** ([SimulationController.java](file:///d:/CP1/CHAIN55/PROJECT%20B/Backend/Backend/src/main/java/com/sim/controller/SimulationController.java), L62–73):
- Null-checks `request` and `request.getConfiguration()`.  
- Delegates to `ExperimentRunner.runRepeated(template, seeds)`.  
- Returns `400 Bad Request` on `IllegalArgumentException`; returns `200 OK` with the aggregate on success.

**ExperimentRunner** ([ExperimentRunner.java](file:///d:/CP1/CHAIN55/PROJECT%20B/Backend/Backend/src/main/java/com/sim/experiment/ExperimentRunner.java)):
- `runRepeated` rejects null/empty seed list before any run (L33–35).
- For each seed, calls `copy(template)` — a deep manual copy that copies all config fields — then sets the seed separately (L41–43). Each run gets its own isolated `SimulationEngine` instance. **Independent execution confirmed.**
- Calls `config.validate()` at the start of each `run()` (L10). Validation covers: `nodeCount > 0`, valid `consensusType`, non-blank `networkTopology`, non-negative latencies, `simulationTicks > 0`, `byzantineRatio in [0,1]`, no blank `authorityIds`. **Input validation confirmed.**
- On `RuntimeException`, sets `status = "FAILED"`, records `errorMessage`, then calls `result.setDurationMillis(...)` in `finally`. The run result is **returned and added** to the aggregate (L43). **Failed runs are retained.**
- `ExperimentAggregate.addRun` (L15–23) unconditionally appends every run to `runs`, increments `successfulRuns` only if `COMPLETED && metrics != null`, otherwise increments `failedRuns`. `recalculate()` only averages successful runs. **Failed runs remain visible in `getRuns()` and `getFailedRuns()`. Summary excludes failed runs from statistics (correct: this is the documented intent).**

**Missing feature:** `ExperimentRunner.copy()` does **not** copy `slotDuration`. This means repeated experiment runs will always use `slotDuration = 0.0` (the default) regardless of what the caller specified. This has no effect on correctness of pure-batch experiment endpoints but is a silent data loss.

**Verdict on Item 2:** ✅ PASS (with one minor omission noted above).

---

## 3. Same-Seed Reproducibility

**Test evidence** — `Phase6MetricsTests.experimentRunsAreSeededAndFailedRunsRemainVisibleInAggregation` (L86–109):
```java
ExperimentRunResult first = runner.run(config);   // seed = 7
ExperimentRunResult second = runner.run(config);  // seed = 7
assertEquals("COMPLETED", first.getStatus());
assertEquals(first.getMetrics().getBlocksProduced(), second.getMetrics().getBlocksProduced());
```
This test ran successfully in `Phase6MetricsTests` as part of the full `mvnw.cmd test` run.

**Engine seeding path** ([SimulationEngine.java](file:///d:/CP1/CHAIN55/PROJECT%20B/Backend/Backend/src/main/java/com/sim/engine/SimulationEngine.java) L20):
```java
Random rng = new Random(config.getRandomSeed() != null ? config.getRandomSeed() : System.currentTimeMillis());
```
A non-null seed produces a deterministic `java.util.Random`. All topology, block proposals, and jitter draw from this single shared RNG passed through `SimulationState`.

**Verdict on Item 3:** ✅ PASS — reproducibility is verified by a real executed test.

---

## 4. Live Metric Trace: Engine → Worker → WebSocket → Frontend

**Path:**
1. `SimulationWorker.runSimulation()` (L38–117): calls `engine.tick()` per loop iteration, reads `engine.getMetricsSnapshot()`, populates a `TickUpdate` with `simulationId`, `currentTick`, `activeForks`, `instantGini`, `blockCount`, and the full `MetricsSnapshot` embedded.
2. Publishes to RabbitMQ exchange `simulation.exchange` with routing key `simulation.ticks.<id>`.
3. `RabbitMQListener.handleTick()` (L33–42): receives from queue `simulation.ticks`, deserializes, then pushes to WebSocket topic `/topic/simulation/<id>`.
4. Frontend subscribes at `/topic/simulation/${simulationId}` (Simulation.jsx L235), appends each tick to `liveTicks`.
5. `latestTick` is always the last element of `liveTicks` (L279). Displayed values come directly from `latestTick.blockCount`, `latestTick.activeForks`, `latestTick.metrics?.messagesDelivered`, etc. — all real engine values.

**Stale-event guard:** The frontend does **not** clear `liveTicks` between ticks; it appends. Between runs, `setLiveTicks([])` is called in `handleStartSimulation` (L265), which correctly resets the list. No stale events from a previous run carry into the next.

**Fabrication check (bottom telemetry bar, L539):**
```jsx
{(1.0 - latestTick.instantGini).toFixed(2)}
```
This is labeled **"MAINCHAIN RATE"** but is computed as `1 - Gini`. `instantGini` is the Gini coefficient of block production distribution (0 = perfectly equal, 1 = perfectly unequal). This is **not** the `mainchainRate` that the `BlockchainState` computes (canonical chain height / total blocks). The label is therefore **misleading/incorrect** — it displays a fabricated proxy, not the actual mainchain rate.

**Verdict on Item 4:** ⚠️ PARTIAL — metric trace is intact and no stale-event leakage, but the bottom bar "MAINCHAIN RATE" label is factually wrong (it displays `1 - Gini`, not the real mainchain rate).

---

## 5. Metric Definitions — Double-Counting, Classification, Cumulative vs. Per-Tick

### `blocksProduced` (MetricsCalculator.java L20)
```java
snapshot.setBlocksProduced((int) state.getAgents().stream().mapToInt(BlockchainAgent::getBlocksProduced).sum());
```
`BlockchainAgent.blocksProduced` is incremented once per `produceBlock()` success (ConsensusStrategy L37). **No double-counting.** This is a **cumulative** counter (total since t=0), reported as-is. The label does not say "per-tick," so this is correct.

### `duplicateMessages` (MetricsCalculator.java L28–29)
```java
snapshot.setDuplicateMessages(state.getNetworkModel().getDuplicateMessages()
    + state.getAgents().stream().mapToInt(BlockchainAgent::getDuplicateMessages).sum());
```
`NetworkModel.duplicateMessages` (NetworkModel.java L146) is incremented when `receiver.receiveMessage(msg)` returns `false`. `BlockchainAgent.duplicateMessages` (BlockchainAgent.java L99,113) is incremented when a `BLOCK` message was **already known** before delivery. There is a **double-counting defect**: when `receiveMessage()` returns `false` because the block is already known, **both** `NetworkModel.duplicateMessages` and `BlockchainAgent.duplicateMessages` are incremented for the same message. The Phase 6 test confirms this behavior:
```java
assertEquals(1, snapshot.getDuplicateMessages());  // passes because only network-level dup is triggered in that test
```
The test only sends a duplicate **block** where the receiver already had the block registered in `knownBlocks`, so `receiveMessage()` returns false (network-level dup incremented) but `knownBefore` is true at the agent level. The agent's `processMessages()` path is not reached (message never enters inbox), so the agent counter is NOT incremented in that test scenario. However, in live simulation, a block delivered twice through the network but accepted on first delivery would: (a) return `false` from `receiveMessage` at network level (network dup++), and (b) when a second BLOCK message reaches `processMessages` after `receiveMessage` returns false, the inbox path is bypassed — so the agent counter is NOT incremented. The two paths are **mutually exclusive by design**: only one of the two counters can fire per duplicate event in the queue-based flow. **No double-count in practice**, but the code is fragile and hard to reason about.

### `blocksAccepted` (MetricsCalculator.java L21)
```java
snapshot.setBlocksAccepted(Math.max(0, state.getBlockchainState().getTotalBlocks() - 1));
```
This is the **global** chain total minus genesis. It is a global/per-chain view, not the per-agent accepted count (`BlockchainAgent.blocksAccepted`). These are two different things and the distinction is intentional.

### `canonicalBlocks` (MetricsCalculator.java L40)
```java
canonicalBlocks += agent.getCanonicalBlockIds().size();
```
This sums canonical chain length **across all agents**. For N agents all converged on the same chain of length K, this produces `N × K`. This is a local-aggregate metric (total canonical awareness across the network), not a global canonical chain count. The label `canonicalBlocks` could mislead readers into thinking it's the global chain length. **Potential confusion but not a calculation error per se.**

### `staleBlocks` and `competingBlocks` (MetricsCalculator.java L41,51)
```java
staleBlocks += (int) agent.getKnownBlocks().keySet().stream().filter(agent::isStale).count();
snapshot.setCompetingBlocks(staleBlocks);
```
`competingBlocks` is **set equal to `staleBlocks`** (same value, different field). This is a redundancy, not an error, but the field distinction is meaningless.

### `blockProductionRate` (MetricsCalculator.java L60)
```java
snapshot.setBlockProductionRate(state.getCurrentTick() == 0 ? 0.0 : (double) snapshot.getBlocksProduced() / state.getCurrentTick());
```
`blocksProduced` is cumulative. Dividing by `currentTick` yields an **average** rate (blocks/tick from t=0). This is not a per-tick rate. Label should say "average" to be precise, but is not incorrect.

### `convergence` claim (MetricsCalculator.java L55)
```java
snapshot.setConverged(!state.getAgents().isEmpty() && agreement == 1.0);
```
`agreement = maxHeads / N`. `agreement == 1.0` means every agent has **the same canonical head**. This is a **strict snapshot check**, not a durable convergence: if one agent momentarily has a different head, `converged` flips to false. `convergenceTick` is set once and never reset (L56–58), so the "first convergence tick" is sticky. This could misreport convergence if the network briefly converges and then forks again. **Minor semantic imprecision but not a bug in the current test regime.**

**Verdict on Item 5:** ⚠️ PARTIAL — `canonicalBlocks` (cross-agent sum, not chain length), `competingBlocks == staleBlocks` (redundant), and the bottom-bar "MAINCHAIN RATE" (1−Gini proxy) are the main definition concerns. No actual arithmetic double-counting confirmed in practice.

---

## 6. Experiment Results — Unavailable Metrics vs. Zero; Failed Run Exclusion

- **FAILED runs:** `ExperimentRunResult.metrics` is `null` when status is `FAILED` (never set). `ExperimentAggregate.recalculate()` filters with `filter(run -> "COMPLETED".equals(run.getStatus()) && run.getMetrics() != null)` — failed runs are **excluded from statistics** but **retained in `getRuns()`**.
- **Null vs. zero:** `MetricsSnapshot` fields default to `0` / `0.0` / `false`. A FAILED run returns `null` for `metrics`, so the caller can distinguish unavailability from zero by checking `result.getMetrics() == null`.
- The API response for `POST /api/simulations/experiment` includes full `runs` array (each with `status`, `errorMessage`, `metrics`). Consumers who inspect the array can distinguish null-metrics (failed) from zero-metrics (succeeded with zero counts). **No silent exclusion.**

**Verdict on Item 6:** ✅ PASS.

---

## 7. Existing Auth, Team, Simulation Controls — Regression Check

**Auth** ([AuthController.java](file:///d:/CP1/CHAIN55/PROJECT%20B/Backend/Backend/src/main/java/com/sim/controller/AuthController.java)):
- `/api/auth/signup`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout` all present.
- Login requires username + password + UID (3-factor). Rate limiting and lockout (>5 attempts → 60 s lockout) in-place.
- Session managed via `HttpSession`.

**Security** ([SecurityConfig.java](file:///d:/CP1/CHAIN55/PROJECT B/Backend/Backend/src/main/java/com/sim/config/SecurityConfig.java)):
- `.anyRequest().permitAll()` — **all routes are effectively open**. This was present before Phase 6 and has not changed. It is an architectural concern (no session enforcement on team/friend routes), but is not a regression introduced by Phase 6.

**Teams/Friends** ([FriendService.java](file:///d:/CP1/CHAIN55/PROJECT%20B/Backend/Backend/src/main/java/com/sim/service/FriendService.java)):
- All CRUD operations (send/accept/decline/cancel request, get friends, pending requests, team lookup) are present and unchanged by Phase 6 diff.

**Simulation controls** ([SimulationController.java](file:///d:/CP1/CHAIN55/PROJECT%20B/Backend/Backend/src/main/java/com/sim/controller/SimulationController.java)):
- `POST /api/simulations/start`, `GET /api/simulations/history`, `GET /api/simulations/{id}/result` — all preserved from prior phases.
- New `POST /api/simulations/experiment` added cleanly without removing or altering existing endpoints.

**Verdict on Item 7:** ✅ PASS — no regression. Pre-existing open-auth posture is unchanged.

---

## 8. Backend Tests & Frontend Build

### Backend Tests (`.\mvnw.cmd test`)

```
[INFO] Tests run: 1,  Failures: 0, Errors: 0, Skipped: 0  -- BackendApplicationTests
[INFO] Tests run: 5,  Failures: 0, Errors: 0, Skipped: 0  -- Phase1AgentTests
[INFO] Tests run: 7,  Failures: 0, Errors: 0, Skipped: 0  -- Phase2NetworkTests
[INFO] Tests run: 6,  Failures: 0, Errors: 0, Skipped: 0  -- Phase3BlockTreeTests
[INFO] Tests run: 7,  Failures: 0, Errors: 0, Skipped: 0  -- Phase4AttestationTests
[INFO] Tests run: 7,  Failures: 0, Errors: 0, Skipped: 0  -- Phase5ConsensusTests
[INFO] Tests run: 5,  Failures: 0, Errors: 0, Skipped: 0  -- Phase6MetricsTests
─────────────────────────────────────────────────────────────
Total: 38 tests | 0 failures | 0 errors | 0 skipped
BUILD SUCCESS — 14.3 s
```

**Coverage:** No JaCoCo/coverage plugin configured in `pom.xml`. Actual line/branch coverage is **unknown**. The test suite exercises the core engine, network model, block tree, attestation, consensus, metrics, and experiment runner, but Spring Boot controllers and RabbitMQ-dependent paths are not integration-tested (they require live MongoDB + RabbitMQ which were available at test time via `BackendApplicationTests`).

**Infrastructure dependencies confirmed at test time:**
- MongoDB at `localhost:27017` — CONNECTED (logged by driver)
- RabbitMQ at `localhost:5672` — CONNECTED (logged by CachingConnectionFactory)

### Frontend Production Build (`npm run build`)

```
vite v8.3.1 building for production...
✓ 2397 modules transformed
dist/index.html          0.47 kB
dist/assets/index.css   33.27 kB (gzip: 7.14 kB)
dist/assets/index.js  1632.57 kB (gzip: 458.96 kB)
✓ built in 1.48 s
WARNING: chunk > 500 kB — recommend code splitting
```

Build succeeds with **zero errors**. The size warning is a performance advisory only; the build is production-valid.

---

## 9. `git diff --check`

```
(no output — exit 0)
```
No whitespace errors in the entire repository.

---

## 10. Defect Summary

| # | Severity | Location | Description |
|---|---|---|---|
| D1 | **Medium** | `Simulation.jsx` L539 | Bottom telemetry bar labels `(1.0 - latestTick.instantGini)` as "MAINCHAIN RATE". This is the complement of the Gini coefficient — a fabricated proxy. The real mainchain rate comes from `BlockchainState.mainchainRate` and is available in `results.mainchainRate` at completion. During live ticks it is not plumbed through `TickUpdate`; the fix requires adding it to `TickUpdate` or displaying a different label. |
| D2 | **Medium** | `Simulation.jsx` L465 | A raw JavaScript statement `const progressPercent = latestTick ? (latestTick.currentTick / Math.max(1, formData.simulationTicks)) * 100 : 0;` is placed inside JSX as a child of `<div className="results-grid">`. React renders this as the string `"const progressPercent = ..."` visible in the DOM. The outer `progressPercent` is correctly defined at L280 but hardcodes the denominator as `10` instead of `formData.simulationTicks`. |
| D3 | **Low** | `ExperimentRunner.java` L48–59 | `copy()` omits `slotDuration`. Experiment runs always use `slotDuration = 0.0` regardless of the template config. |
| D4 | **Low** | `MetricsCalculator.java` L48, L51 | `canonicalBlocks` is a cross-agent sum (N × chain_length) not the global canonical chain length. `competingBlocks` equals `staleBlocks` — a redundant duplicate field. Both are confusing but not arithmetic errors. |
| D5 | **Informational** | `SecurityConfig.java` L43 | `.anyRequest().permitAll()` means no route requires authentication. Session-based auth exists but is not enforced by the filter chain. Pre-existing, not introduced in Phase 6. |

---

## Final Verdict

> **PARTIAL**

**Passed:** Git cleanliness, experiment multi-seed execution, input validation, failed-run retention, same-seed reproducibility (test-verified), live metric pipeline integrity (no stale-event leakage), experiment null-vs-zero distinction, auth/team/simulation-control regression (none), all 38 backend tests, frontend production build.

**Failed / Defective:**
- **D1** (confirmed): Bottom telemetry bar fabricates "MAINCHAIN RATE" as `1 − Gini` — factually wrong label.
- **D2** (confirmed): A raw JS `const` statement rendered as literal text in the JSX results grid. This is a visible rendering bug in section 5.
- **D3** (confirmed): `ExperimentRunner.copy()` silently drops `slotDuration`.
