import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function fmtNum(value, digits = 3) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return 'N/A';
  return Number(value).toFixed(digits);
}

function fmtPct(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return 'N/A';
  return `${(Number(value) * 100).toFixed(1)}%`;
}

function fmtInt(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return 'N/A';
  return String(Math.round(Number(value)));
}

function buildAgentCommunicationSummary(result, config, metrics) {
  const active = metrics?.activeAgents ?? Math.max(0, (config?.nodeCount ?? 0) - (metrics?.inactiveAgents ?? 0) - (metrics?.byzantineAgents ?? 0));
  const inactive = metrics?.inactiveAgents ?? 0;
  const byzantine = metrics?.byzantineAgents ?? 0;
  const totalNodes = config?.nodeCount ?? (active + inactive + byzantine);
  const attackMode = config?.byzantineAttackMode || 'NONE';

  const honestText = [
    `${active} of ${totalNodes} nodes operated as active honest agents under ${result?.consensusType || config?.consensusType || 'the configured'} consensus.`,
    `Honest proposers created ${fmtInt(metrics?.blockProposals ?? metrics?.blocksProduced)} block proposals (${fmtInt(metrics?.blocksProduced)} blocks produced, ${fmtInt(metrics?.blocksAccepted)} accepted) and ${fmtInt(metrics?.attestationsProduced)} attestations (${fmtInt(metrics?.attestationsReceived)} received across peers).`,
    `Peer-to-peer gossip dispatched ${fmtInt(metrics?.messagesSent)} messages with ${fmtInt(metrics?.messagesDelivered)} deliveries (${fmtInt(metrics?.duplicateMessages)} duplicates) over ${config?.networkTopology || 'the configured'} topology, averaging ${fmtNum(metrics?.averagePropagationDelayTicks, 2)} ticks propagation delay.`
  ].join(' ');

  const inactiveText = inactive > 0
    ? `${inactive} agent(s) remained inactive/offline (ratio ${fmtNum(config?.inactiveAgentRatio, 2)}). Inactive nodes received inbound gossip without proposing blocks, generating transactions, or casting attestations, lowering active quorum participation.`
    : 'All participating nodes remained online (0 inactive agents), preserving full validator responsiveness across simulation slots.';

  const byzantineText = byzantine > 0
    ? `${byzantine} Byzantine agent(s) operated with attack mode ${attackMode} (ratio ${fmtNum(config?.byzantineRatio, 2)}), attempting ${fmtInt(metrics?.maliciousActionsAttempted)} malicious action(s), withholding ${fmtInt(metrics?.blocksWithheld)} block(s), and emitting ${fmtInt(metrics?.conflictingAttestations)} conflicting attestation(s). Peers rejected ${fmtInt(metrics?.blocksRejected)} invalid/non-canonical block(s).`
    : 'No Byzantine adversaries were active in this run (0 malicious actions, 0 withheld blocks, 0 conflicting attestations).';

  const partitionText = (config?.partitionRatio ?? 0) > 0 && (config?.partitionStartTick ?? -1) >= 0
    ? `A network partition (ratio ${fmtNum(config.partitionRatio, 2)}) was configured for ticks ${config.partitionStartTick} to ${config.partitionEndTick}; packet loss rate was ${fmtPct(metrics?.packetLossRate ?? config?.packetLossRate ?? 0)} with ${fmtInt(metrics?.messagesDropped)} dropped message(s).`
    : `No network partition window was active; packet loss rate was ${fmtPct(metrics?.packetLossRate ?? config?.packetLossRate ?? 0)} with ${fmtInt(metrics?.messagesDropped)} dropped message(s) and ${fmtInt(metrics?.queuedMessages)} queued message(s) at run end.`;

  return { honestText, inactiveText, byzantineText, partitionText };
}

function buildStabilityConclusion(result, metrics) {
  const mu = result?.mainchainRate ?? metrics?.mainchainRate;
  const f = result?.branchingRatio ?? metrics?.branchingRatio;
  const gini = result?.finalGiniCoefficient ?? metrics?.giniCoefficient;
  const agreement = metrics?.canonicalHeadAgreement;

  const lines = [];
  if (Number.isFinite(Number(mu))) {
    if (Number(mu) >= 0.85) {
      lines.push(`High canonical efficiency: Mainchain Rate reached ${fmtPct(mu)}, indicating minimal orphan waste.`);
    } else if (Number(mu) >= 0.65) {
      lines.push(`Moderate chain divergence: Mainchain Rate settled at ${fmtPct(mu)} with noticeable off-chain branching.`);
    } else {
      lines.push(`Degraded canonical convergence: Mainchain Rate fell to ${fmtPct(mu)} due to competing branches or faults.`);
    }
  }
  if (Number.isFinite(Number(f))) {
    lines.push(`Branching Ratio F = ${fmtNum(f, 3)} (${fmtInt(metrics?.activeForks)} active fork(s), ${fmtInt(metrics?.staleBlocks)} stale block(s), ${fmtInt(metrics?.orphanBlocks)} orphan block(s)).`);
  }
  if (Number.isFinite(Number(gini))) {
    const level = Number(gini) < 0.3 ? 'decentralized' : Number(gini) < 0.6 ? 'moderately concentrated' : 'highly concentrated';
    lines.push(`Block-production Gini Coefficient G = ${fmtNum(gini, 3)}, indicating ${level} reward/proposal distribution.`);
  }
  if (Number.isFinite(Number(agreement))) {
    const convText = metrics?.converged
      ? `Network converged at tick ${metrics.convergenceTick >= 0 ? metrics.convergenceTick : 'final'} with ${fmtPct(agreement)} canonical head agreement.`
      : `Final canonical head agreement across agents was ${fmtPct(agreement)}.`;
    lines.push(convText);
  }
  return lines.join(' ');
}

/**
 * Generates and downloads a structured multi-section PDF simulation report.
 */
export function downloadSimulationPdfReport({ result, config = {}, runMeta = {} }) {
  if (!result) return false;

  const metrics = result.metrics || {};
  const runId = result.configId || config.id || runMeta.id || result.id || 'unknown';
  const consensus = result.consensusType || config.consensusType || 'Unknown';
  const topology = config.networkTopology || 'Erdos-Renyi';
  const ticks = result.simulationTicks ?? config.simulationTicks ?? metrics.tick ?? 'N/A';
  const seed = result.randomSeed ?? config.randomSeed ?? 'N/A';
  const generatedAt = new Date().toLocaleString();

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;
  const contentWidth = pageWidth - marginX * 2;

  // Header Banner
  doc.setFillColor(8, 14, 28);
  doc.rect(0, 0, pageWidth, 82, 'F');
  doc.setTextColor(0, 229, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('CHAIN55 — SIMULATION EXECUTION REPORT', marginX, 34);

  doc.setTextColor(226, 232, 240);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Run ID: ${runId}   |   Status: ${result.status || 'COMPLETED'}   |   Generated: ${generatedAt}`, marginX, 54);
  doc.text(`Consensus: ${consensus}   |   Topology: ${topology}   |   Seed: ${seed}   |   Duration: ${result.durationMillis ?? 'N/A'} ms`, marginX, 68);

  let y = 104;

  // Section 1: Run Overview & Configuration
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('1. Run Overview & Configuration', marginX, y);
  y += 8;

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [0, 229, 255], fontSize: 8.5 },
    styles: { fontSize: 8.5, cellPadding: 4.5, textColor: [30, 41, 59] },
    head: [['Parameter', 'Value', 'Parameter', 'Value']],
    body: [
      ['Consensus Protocol', String(consensus), 'Network Topology', String(topology)],
      ['Total Nodes', fmtInt(config.nodeCount ?? ((metrics.activeAgents ?? 0) + (metrics.inactiveAgents ?? 0) + (metrics.byzantineAgents ?? 0))), 'Simulation Ticks', String(ticks)],
      ['Random Seed', String(seed), 'Execution Duration', `${result.durationMillis ?? 'N/A'} ms`],
      ['Block Gossip Latency', `${config.blockGossipLatency ?? 'N/A'} s`, 'Slot Duration', `${config.slotDuration ?? 'N/A'} s`],
      ['Latency Jitter', `${config.networkLatencyJitter ?? 'N/A'} ticks`, 'Packet Loss Rate', fmtPct(metrics.packetLossRate ?? config.packetLossRate ?? 0)],
      ['Byzantine Ratio / Mode', `${fmtNum(config.byzantineRatio ?? 0, 2)} / ${config.byzantineBehaviorEnabled ? (config.byzantineAttackMode || 'ON') : 'OFF'}`, 'Inactive Agent Ratio', fmtNum(config.inactiveAgentRatio ?? 0, 2)],
      ['Partition Ratio / Window', `${fmtNum(config.partitionRatio ?? 0, 2)} (${config.partitionStartTick ?? -1}..${config.partitionEndTick ?? -1})`, 'Tx / Agent / Tick', String(config.transactionsPerAgentPerTick ?? 0)],
      ['Mempool Capacity', String(config.mempoolCapacity ?? 'N/A'), 'Max Tx / Block', String(config.maxTransactionsPerBlock ?? 'N/A')]
    ]
  });

  y = doc.lastAutoTable.finalY + 20;

  // Section 2: Simulation Execution & Agent Communication Breakdown
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Simulation Execution & Agent Communication Breakdown', marginX, y);
  y += 14;

  const narrative = buildAgentCommunicationSummary(result, config, metrics);
  const blocks = [
    ['Honest / Active Agents:', narrative.honestText],
    ['Inactive Agents:', narrative.inactiveText],
    ['Byzantine / Malicious Agents:', narrative.byzantineText],
    ['Network & Partition Dynamics:', narrative.partitionText]
  ];

  doc.setFontSize(9);
  blocks.forEach(([title, text]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(title, marginX, y);
    y += 12;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const wrapped = doc.splitTextToSize(text, contentWidth);
    doc.text(wrapped, marginX, y);
    y += wrapped.length * 11 + 8;
  });

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], textColor: [0, 229, 255], fontSize: 8.5 },
    styles: { fontSize: 8.5, cellPadding: 4.5, textColor: [30, 41, 59] },
    head: [['Agent / Network Dimension', 'Observed Count / Measure']],
    body: [
      ['Active Honest Agents / Inactive / Byzantine', `${fmtInt(metrics.activeAgents)} / ${fmtInt(metrics.inactiveAgents)} / ${fmtInt(metrics.byzantineAgents)}`],
      ['Block Proposals / Blocks Produced / Accepted / Rejected', `${fmtInt(metrics.blockProposals)} / ${fmtInt(metrics.blocksProduced)} / ${fmtInt(metrics.blocksAccepted)} / ${fmtInt(metrics.blocksRejected)}`],
      ['Attestations Produced / Received', `${fmtInt(metrics.attestationsProduced)} / ${fmtInt(metrics.attestationsReceived)}`],
      ['Byzantine Actions / Blocks Withheld / Conflicting Attestations', `${fmtInt(metrics.maliciousActionsAttempted)} / ${fmtInt(metrics.blocksWithheld)} / ${fmtInt(metrics.conflictingAttestations)}`],
      ['Gossip Messages Sent / Delivered / Dropped / Duplicates', `${fmtInt(metrics.messagesSent)} / ${fmtInt(metrics.messagesDelivered)} / ${fmtInt(metrics.messagesDropped)} / ${fmtInt(metrics.duplicateMessages)}`],
      ['Average Propagation Delay / Block Propagation Delay', `${fmtNum(metrics.averagePropagationDelayTicks, 2)} ticks / ${fmtNum(metrics.blockPropagationDelay, 2)} ticks`]
    ]
  });

  // Page check before Section 3
  y = doc.lastAutoTable.finalY + 20;
  if (y > 680) {
    doc.addPage();
    y = 48;
  }

  // Section 3: Final Metrics & Stability Analysis
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('3. Final Metrics & Stability Analysis', marginX, y);
  y += 8;

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [0, 229, 255], fontSize: 8.5 },
    styles: { fontSize: 8.5, cellPadding: 4.5, textColor: [30, 41, 59] },
    head: [['Metric', 'Value', 'Metric', 'Value']],
    body: [
      ['Mainchain Rate (mu)', fmtPct(result.mainchainRate ?? metrics.mainchainRate), 'Branching Ratio (F)', fmtNum(result.branchingRatio ?? metrics.branchingRatio, 3)],
      ['Gini Coefficient (G)', fmtNum(result.finalGiniCoefficient ?? metrics.giniCoefficient, 3), 'Canonical Head Agreement', fmtPct(metrics.canonicalHeadAgreement)],
      ['Converged / Convergence Tick', `${metrics.converged ? 'Yes' : 'No'} (${metrics.convergenceTick >= 0 ? metrics.convergenceTick : 'N/A'})`, 'Active Forks', fmtInt(metrics.activeForks)],
      ['Canonical / Stale / Orphan Blocks', `${fmtInt(metrics.canonicalBlocks)} / ${fmtInt(metrics.staleBlocks)} / ${fmtInt(metrics.orphanBlocks)}`, 'Block Production Rate', fmtNum(metrics.blockProductionRate, 3)],
      ['Transactions Created / Included', `${fmtInt(metrics.transactionsCreated)} / ${fmtInt(metrics.transactionsIncluded)}`, 'Transaction Success Rate', (metrics.transactionsCreated ?? 0) > 0 ? fmtPct(metrics.transactionSuccessRate) : 'N/A'],
      ['Transactions / Simulation Tick', (metrics.transactionsCreated ?? 0) > 0 ? fmtNum(metrics.transactionsPerSimulationTick, 2) : 'N/A', 'Message Throughput', fmtNum(metrics.messageThroughput, 2)]
    ]
  });

  y = doc.lastAutoTable.finalY + 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Stability Conclusion', marginX, y);
  y += 12;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const conclusion = buildStabilityConclusion(result, metrics) || 'Simulation completed with recorded metrics above.';
  doc.text(doc.splitTextToSize(conclusion, contentWidth), marginX, y);

  doc.save('CHAIN55_Simulation.pdf');
  return true;
}
