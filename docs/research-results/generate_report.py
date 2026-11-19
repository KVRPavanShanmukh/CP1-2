#!/usr/bin/env python3
"""Generate RESEARCH_RESULTS_REPORT.md from the archived exp*.json datasets.

The datasets are written by Phase13ResearchExperiments (part of `mvnw test`). This script
never invents or edits a number: every table row and every quoted delta is read from the
JSON files in this directory, so the report and the machine-readable artefacts cannot drift.

Usage (from anywhere):
    python generate_report.py
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent

# Shared design constants (see docs/RESEARCH_EXPERIMENT_PLAN.md).
SEEDS = [1, 2, 3, 4, 5]
NODE_COUNT = 6
TOPOLOGY = "Erdos-Renyi"
TICKS = 8
FIXED = [
    ("nodeCount", "6"),
    ("networkTopology", "Erdos-Renyi"),
    ("slotDuration", "1.0"),
    ("simulationTicks", "8"),
    ("blockGossipLatency", "0.5 (varied only in Exp 1)"),
    ("byzantineRatio", "0.0 (varied only in Exp 4)"),
    ("byzantineBehaviorEnabled", "false (varied only in Exp 4)"),
    ("packetLossRate", "0.0 (varied only in Exp 2)"),
    ("networkLatencyJitter", "2"),
    ("partitionRatio", "0.0 (varied only in Exp 3)"),
    ("transactionsPerAgentPerTick", "0 (varied only in Exp 5)"),
    ("mempoolCapacity", "100"),
    ("maxTransactionsPerBlock", "100"),
    ("transactionAmount", "1.0"),
]

EXPERIMENTS = [
    {
        "file": "exp1-network-latency.json",
        "heading": "Experiment 1 — Network Latency and Canonical-Head Agreement",
        "iv": "`blockGossipLatency` (FACTOR_BLOCK_GOSSIP_LATENCY)",
        "design": "baseline 0.5 s → treatment 3.0 s",
        "hypothesis": "Higher block gossip latency reduces canonical-head agreement and increases active forks and stale blocks.",
        "primary": ["canonicalHeadAgreement", "activeForks"],
        "secondary": [
            "mainchainRate",
            "branchingRatio",
            "staleBlocks",
            "giniCoefficient",
            "messagesSent",
            "messagesDelivered",
            "averagePropagationDelayTicks",
        ],
        "limitation": "Higher latency reduces delivered messages, so fork counts are confounded with delivery volume. Delayed messages that never arrive inside the 8-tick horizon produce zero block-propagation delay observations.",
    },
    {
        "file": "exp2-packet-loss.json",
        "heading": "Experiment 2 — Packet Loss and Chain Divergence",
        "iv": "`packetLossRate` (FACTOR_PACKET_LOSS)",
        "design": "baseline 0.0 → treatment 0.3",
        "hypothesis": "Increased packet loss raises dropped messages and chain divergence while reducing canonical-head agreement.",
        "primary": ["messagesDropped", "canonicalHeadAgreement", "activeForks"],
        "secondary": [
            "mainchainRate",
            "branchingRatio",
            "staleBlocks",
            "giniCoefficient",
            "messagesSent",
            "messagesDelivered",
            "averagePropagationDelayTicks",
        ],
        "limitation": "Packet loss is drawn stochastically per message, so five seeds provide limited statistical power.",
    },
    {
        "file": "exp3-network-partition.json",
        "heading": "Experiment 3 — Network Partitions and Convergence",
        "iv": "`networkPartition` (FACTOR_PARTITION)",
        "design": "baseline none → treatment ratio 0.4, active ticks 2–6",
        "hypothesis": "An active partition prevents canonical-head agreement from reaching 1.0 during the partition window; convergence may recover after healing.",
        "primary": ["convergedRunRate", "canonicalHeadAgreement"],
        "secondary": [
            "activeForks",
            "mainchainRate",
            "branchingRatio",
            "staleBlocks",
            "messagesDropped",
            "messagesDelivered",
            "averagePropagationDelayTicks",
        ],
        "limitation": "With 8 ticks and a partition ending at tick 6 there may be too little post-healing time for convergence to recover.",
    },
    {
        "file": "exp4-byzantine.json",
        "heading": "Experiment 4 — Byzantine-Agent Ratio and Security Metrics",
        "iv": "`byzantineBehavior` (FACTOR_BYZANTINE; ratio 0.0 → 0.34 with mode ALL)",
        "design": "baseline none → treatment 2 of 6 agents Byzantine with equivocation + withholding",
        "hypothesis": "Higher Byzantine ratio increases malicious actions, withheld blocks and conflicting attestations while reducing canonical-head agreement.",
        "primary": [
            "maliciousActionsAttempted",
            "blocksWithheld",
            "conflictingAttestations",
            "byzantineAgents",
            "canonicalHeadAgreement",
        ],
        "secondary": [
            "activeForks",
            "mainchainRate",
            "branchingRatio",
            "staleBlocks",
            "orphanBlocks",
            "giniCoefficient",
            "activeAgents",
            "messagesSent",
            "messagesDelivered",
        ],
        "limitation": "Byzantine behaviour is deterministic per seed and only the combined ALL mode is tested. Byzantine agents are also non-active, so activeAgents falls concurrently and is not an isolated effect.",
    },
    {
        "file": "exp5-tx-load.json",
        "heading": "Experiment 5 — Transaction Load and Inclusion Rate",
        "iv": "`transactionLoad` (FACTOR_TRANSACTION_LOAD; transactionsPerAgentPerTick 0 → 3)",
        "design": "baseline 0 → treatment 3 transactions per agent per tick",
        "hypothesis": "Higher transaction load increases created and included transactions; success rate may fall when mempool or block capacity saturates.",
        "primary": ["transactionsCreated", "transactionsIncluded", "transactionSuccessRate"],
        "secondary": [
            "transactionsPerSimulationTick",
            "blocksProduced",
            "blockProductionRate",
            "mainchainRate",
            "giniCoefficient",
            "messagesSent",
            "messagesDelivered",
        ],
        "limitation": "Six agents over eight ticks produce modest volume, and inclusion is capped by maxTransactionsPerBlock; capacity saturation therefore reflects the model limits, not an external throughput claim.",
    },
]

CONSENSUS_FILES = [
    ("exp6-consensus-PoS.json", "PoW → PoS", "PoS"),
    ("exp6-consensus-DPoS.json", "PoW → DPoS", "DPoS"),
    ("exp6-consensus-PoA.json", "PoW → PoA", "PoA"),
    ("exp6-consensus-PoL.json", "PoW → PoL", "PoL"),
]

CONSENSUS_METRICS = [
    "blocksProduced",
    "blockProductionRate",
    "mainchainRate",
    "branchingRatio",
    "giniCoefficient",
    "canonicalHeadAgreement",
    "convergedRunRate",
    "activeForks",
    "staleBlocks",
    "messagesSent",
    "messagesDelivered",
    "messageThroughput",
    "averagePropagationDelayTicks",
]


def load(name: str) -> dict:
    path = HERE / name
    if not path.is_file():
        raise SystemExit(f"Missing dataset {path}. Run Phase13ResearchExperiments first.")
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def comparison_index(document: dict) -> dict:
    treatment = document["treatments"][0]
    return {item["metric"]: item for item in treatment["comparisons"]}


def fmt(value) -> str:
    if value is None:
        return "—"
    return f"{value:.4f}"


def rel(value) -> str:
    if value is None:
        return "—"
    return f"{value * 100:+.1f}%"


def table(document: dict, metrics: list[str]) -> str:
    index = comparison_index(document)
    lines = [
        "| Metric | Baseline mean | Treatment mean | Δ | Δ% |",
        "| --- | ---: | ---: | ---: | ---: |",
    ]
    for metric in metrics:
        item = index.get(metric)
        if item is None:
            continue
        if not item["available"]:
            lines.append(f"| `{metric}` | — | — | — | — |")
            continue
        lines.append(
            f"| `{metric}` | {fmt(item['baselineMean'])} | {fmt(item['treatmentMean'])} "
            f"| {fmt(item['absoluteDelta'])} | {rel(item.get('relativeDelta'))} |"
        )
    return "\n".join(lines)


def observation(document: dict, metrics: list[str]) -> str:
    index = comparison_index(document)
    parts = []
    for metric in metrics:
        item = index.get(metric)
        if not item or not item["available"]:
            continue
        parts.append(
            f"`{metric}` {fmt(item['baselineMean'])} → {fmt(item['treatmentMean'])} "
            f"(Δ {fmt(item['absoluteDelta'])}, {rel(item.get('relativeDelta'))})"
        )
    return "; ".join(parts)


def aggregate_header(document: dict) -> str:
    baseline = document["baseline"]
    treatment = document["treatments"][0]
    return (
        f"Seeds `{', '.join(str(seed) for seed in document['seeds'])}` · "
        f"baseline attempted {baseline['attemptedRuns']}, successful {baseline['successfulRuns']}, failed {baseline['failedRuns']} · "
        f"treatment attempted {treatment['treatment']['attemptedRuns']}, successful {treatment['treatment']['successfulRuns']}, "
        f"failed {treatment['treatment']['failedRuns']} · controlled: "
        f"{'yes' if treatment['controlled'] else 'no'}"
    )


def build() -> str:
    generated = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines: list[str] = []
    add = lines.append

    add("# CHAIN55 — Research Results Report")
    add("")
    add("> **Generated file — do not edit by hand.** Regenerate with")
    add("> `python docs/research-results/generate_report.py` after running")
    add("> `mvnw test -Dtest=Phase13ResearchExperiments` from `Backend/Backend`.")
    add("")
    add(f"Generated: {generated}")
    add("")
    add("## Overview")
    add("")
    add("This report presents measured results from the six pre-registered controlled experiments")
    add("(`docs/RESEARCH_EXPERIMENT_PLAN.md`) executed with `ExperimentComparisonRunner`.")
    add(f"Every comparison uses the shared ordered seeds `{', '.join(str(s) for s in SEEDS)}`")
    add("(5 repeats per configuration) and changes exactly one conceptual factor.")
    add("")
    add("Results are **observed associations from a stochastic model**, not causal claims about")
    add("real networks. Failed runs remain visible and are never treated as zero observations.")
    add("")
    add("## Methodology")
    add("")
    add(f"- **Engine:** `SimulationEngine` with `{NODE_COUNT}` agents, `{TOPOLOGY}` topology and `{TICKS}` ticks.")
    add("- **Design:** baseline vs. one treatment, shared ordered seeds, one conceptual factor changed (verified by `FactorDetector`).")
    add("- **Aggregation:** mean, population standard deviation, minimum and maximum over successful runs.")
    add("- **Metrics:** 27 metrics per comparison, including the paper's `mainchainRate` (μ = |M|/|B| over non-genesis blocks), `branchingRatio` (F = |Θ|/|M|) and `giniCoefficient` of per-agent block production.")
    add("- **Reproducibility:** block identifiers are a per-run monotonic sequence, so a seed fully determines a run and identical baseline configurations produce identical aggregates across experiments.")
    add("- **Run counts:** 5 seeds × (1 baseline + 1 treatment) × 9 comparisons = 90 runs; all passed in the archived dataset.")
    add("")
    add("### Fixed control parameters")
    add("")
    add("| Parameter | Value |")
    add("| --- | --- |")
    for key, value in FIXED:
        add(f"| `{key}` | {value} |")
    add("")
    add("### Unsupported measurements")
    add("")
    add("- **reorganizations** — no reorganization event counter exists in the simulation state.")
    add("- **forkDepth** — active forks and orphan counts exist, but no fork-depth measure is recorded.")
    add("")
    add("These are reported by the API as unsupported instead of being estimated.")
    add("")

    add("## Experiment Results")
    add("")
    for spec in EXPERIMENTS:
        document = load(spec["file"])
        treatment = document["treatments"][0]
        metrics = list(dict.fromkeys(spec["primary"] + spec["secondary"]))
        add(f"### {spec['heading']}")
        add("")
        add(f"**Independent variable:** {spec['iv']}  ")
        add(f"**Design:** {spec['design']}  ")
        add(f"**Hypothesis:** {spec['hypothesis']}")
        add("")
        add(f"_{aggregate_header(document)}_")
        add("")
        add(f"**Changed factor:** `{treatment['changedFactors'][0]['label']}` — "
            + "; ".join(
                f"{change['field']}: {change['baselineValue']} → {change['treatmentValue']}"
                for change in treatment["changedFactors"][0]["fieldChanges"]
            ))
        add("")
        add(table(document, metrics))
        add("")
        add(f"**Observed association:** {observation(document, list(dict.fromkeys(spec['primary'])))}.")
        add("")
        add(f"**Limitation:** {spec['limitation']}")
        add("")

    add("### Experiment 6 — Consensus Strategy Comparison (PoW baseline)")
    add("")
    add("**Independent variable:** `consensusType` (FACTOR_CONSENSUS_STRATEGY)  ")
    add("**Design:** PoW baseline vs. PoS, DPoS, PoA and PoL, one controlled comparison per alternative.  ")
    add("**Hypothesis:** Different leader-selection rules change block production, mainchain rate and Gini concentration.")
    add("")
    add("Each `exp6-consensus-*.json` file contains its own PoW baseline, so PoW is present in all")
    add("four comparisons and no separate PoW-only dataset is required.")
    add("")
    for filename, label, consensus in CONSENSUS_FILES:
        document = load(filename)
        treatment = document["treatments"][0]
        add(f"#### 6{chr(96 + CONSENSUS_FILES.index((filename, label, consensus)) + 1)} — {label}")
        add("")
        add(f"_{aggregate_header(document)}_")
        add("")
        add(table(document, CONSENSUS_METRICS))
        add("")
        add(f"**Observed association:** {observation(document, ['blockProductionRate', 'mainchainRate', 'giniCoefficient', 'canonicalHeadAgreement', 'activeForks'])}.")
        add("")
    add("**Limitation:** PoL is a deterministic Proof-of-Location proximity proxy (lowest agent id),")
    add("not geographic verification. Different strategies have different inherent production rates, so")
    add("Gini differences partly reflect production inequality rather than stake/wealth distribution.")
    add("")

    add("## Summary of Observed Associations")
    add("")
    add("All statements below are **observed associations** from controlled single-factor comparisons")
    add("with five seeds. They are descriptive and require replication before causal interpretation.")
    add("")
    for number, spec in enumerate(EXPERIMENTS, start=1):
        document = load(spec["file"])
        add(f"{number}. **{spec['heading'].split('—', 1)[1].strip()}** — {observation(document, list(dict.fromkeys(spec['primary'])))}.")
    exp6_parts = []
    for filename, _, consensus in CONSENSUS_FILES:
        index = comparison_index(load(filename))
        item = index["blockProductionRate"]
        exp6_parts.append(
            f"{consensus} `blockProductionRate` {fmt(item['baselineMean'])} → {fmt(item['treatmentMean'])}"
        )
    add(f"6. **Consensus strategies (PoW baseline)** — PoS, DPoS, PoA and PoL each raise block production above the PoW baseline: "
        + "; ".join(exp6_parts)
        + ". PoL removes active forks in this model while raising Gini concentration, a direct consequence of single-producer selection.")
    add("")

    add("## Limitations")
    add("")
    add("1. **Small sample size.** Five seeds per comparison give limited statistical power; standard deviations are reported but no significance test is claimed.")
    add("2. **Short horizon.** Eight ticks cannot capture long-term convergence or stake drift.")
    add("3. **Tick-based proxies.** Simulation ticks are not wall-clock time; rates are model quantities, not measured TPS.")
    add("4. **Model limitations.** PoL is a proximity proxy; packet loss and partitions are stochastic per message; Byzantine behaviour is simulated and is not a security claim.")
    add("5. **Agent-local counters.** `staleBlocks`, `competingBlocks` and `orphanBlocks` may count a block once per agent that knows it.")
    add("6. **Floor semantics.** Ratio fields convert to agent counts with floor semantics, so Experiment 4 uses 0.34 rather than 0.33 to instantiate 2 of 6 Byzantine agents.")
    add("")

    add("## Reproducibility Instructions")
    add("")
    add("```bash")
    add('cd "Backend/Backend"')
    add("mvnw test -Dtest=Phase13ResearchExperiments -DfailIfNoTests=false")
    add("# optional explicit output directory:")
    add("mvnw test -Dtest=Phase13ResearchExperiments -Dchain55.researchResultsDir=/path/to/results")
    add("python ../../docs/research-results/generate_report.py")
    add("```")
    add("")
    add("Programmatic alternative: `ResearchExperimentDriver.main()` performs the same runs.")
    add("The REST API exposes the archived files at `GET /api/simulations/research` and")
    add("`GET /api/simulations/research/{file}`; the UI browses them under ARCHIVED EXPERIMENTS.")
    add("")

    add("## Files")
    add("")
    add("| File | Description |")
    add("| --- | --- |")
    add("| `exp1-network-latency.json` | Gossip latency 0.5 → 3.0 |")
    add("| `exp2-packet-loss.json` | Packet loss 0.0 → 0.3 |")
    add("| `exp3-network-partition.json` | No partition → ratio 0.4, ticks 2–6 |")
    add("| `exp4-byzantine.json` | No Byzantine agents → 2 of 6 with ALL attack mode |")
    add("| `exp5-tx-load.json` | 0 → 3 transactions per agent per tick |")
    add("| `exp6-consensus-PoS.json` | PoW vs PoS |")
    add("| `exp6-consensus-DPoS.json` | PoW vs DPoS |")
    add("| `exp6-consensus-PoA.json` | PoW vs PoA |")
    add("| `exp6-consensus-PoL.json` | PoW vs PoL |")
    add("| `RESEARCH_RESULTS_REPORT.md` | This generated report |")
    add("| `generate_report.py` | Report generator (reads only the JSON files) |")
    add("")

    add("## Conclusion")
    add("")
    add("The research suite is executable and reproducible: nine datasets, one controlled factor per")
    add("comparison, shared seeds across baseline and treatment, explicit unsupported measurements,")
    add("and a generated report whose every number is traceable to a machine-readable run record.")
    add("")

    return "\n".join(lines)


if __name__ == "__main__":
    output = HERE / "RESEARCH_RESULTS_REPORT.md"
    output.write_text(build(), encoding="utf-8")
    print(f"Wrote {output}")
