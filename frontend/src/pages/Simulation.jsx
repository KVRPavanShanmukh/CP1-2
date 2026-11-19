import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client/dist/sockjs';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  simulationApi,
  authApi,
  getStoredUser,
  WS_BASE,
  DEFAULT_SIMULATION_CONFIG
} from '../services/api';

// --- GENERATIVE WEBGL ENGINE ---
function NetworkVisualization({ stateIndex }) {
  const pointsRef = useRef();
  const crystalRef = useRef();
  const numParticles = 8000;
  
  const shapes = useMemo(() => {
    const s = {
      idle: new Float32Array(numParticles * 3),    // 00: Subtle field
      sphere1: new Float32Array(numParticles * 3), // 01: Purple Sphere
      waves: new Float32Array(numParticles * 3),   // 02: Flowing White Waves
      sphere2: new Float32Array(numParticles * 3), // 03: Cyan Sphere
      blob: new Float32Array(numParticles * 3),    // 04: Cyan Blob
    };
    
    for (let i = 0; i < numParticles; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      
      // 00: Idle subtle particles
      s.idle[i * 3] = (Math.random() - 0.5) * 20;
      s.idle[i * 3 + 1] = (Math.random() - 0.5) * 20;
      s.idle[i * 3 + 2] = (Math.random() - 0.5) * 20;

      // 01: Purple Sphere (Huge)
      const r = 5.0 + (Math.random() * 0.8);
      s.sphere1[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      s.sphere1[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      s.sphere1[i * 3 + 2] = r * Math.cos(phi);

      // 02: Flowing White Waves
      const waveX = (Math.random() - 0.5) * 15;
      const waveZ = (Math.random() - 0.5) * 6;
      const waveY = Math.sin(waveX * 1.5) * 2.0 + Math.cos(waveZ * 2.5);
      s.waves[i * 3] = waveX;
      s.waves[i * 3 + 1] = waveY + (Math.random() * 1.5 - 0.75);
      s.waves[i * 3 + 2] = waveZ;

      // 03: Cyan Sphere (Dense)
      const r2 = 4.5 + (Math.random() * 0.4);
      s.sphere2[i * 3] = r2 * Math.sin(phi) * Math.cos(theta);
      s.sphere2[i * 3 + 1] = r2 * Math.sin(phi) * Math.sin(theta);
      s.sphere2[i * 3 + 2] = r2 * Math.cos(phi);

      // 04: Cyan Blob (Topology cluster)
      s.blob[i * 3] = (r2 * 2.0) * Math.sin(phi) * Math.cos(theta) + (Math.random() - 0.5)*2;
      s.blob[i * 3 + 1] = (r2 * 1.0) * Math.sin(phi) * Math.sin(theta) + (Math.random() - 0.5)*2;
      s.blob[i * 3 + 2] = (r2 * 1.5) * Math.cos(phi) + (Math.random() - 0.5)*2;
    }
    return s;
  }, []);

  const positions = useMemo(() => new Float32Array(shapes.idle), [shapes]);
  const currentColors = useMemo(() => new Float32Array(numParticles * 3), []);

  useFrame((stateObj, delta) => {
    if (!pointsRef.current) return;
    
    // Smooth Mouse Interaction
    const targetRotX = (stateObj.pointer.y * Math.PI) / 10;
    const targetRotY = (stateObj.pointer.x * Math.PI) / 10 + (stateObj.clock.elapsedTime * 0.05);
    
    pointsRef.current.rotation.x = THREE.MathUtils.lerp(pointsRef.current.rotation.x, targetRotX, 0.05);
    pointsRef.current.rotation.y = THREE.MathUtils.lerp(pointsRef.current.rotation.y, targetRotY, 0.05);
    if(crystalRef.current) {
      crystalRef.current.rotation.x = THREE.MathUtils.lerp(crystalRef.current.rotation.x, targetRotX + (stateObj.clock.elapsedTime * 0.2), 0.05);
      crystalRef.current.rotation.y = THREE.MathUtils.lerp(crystalRef.current.rotation.y, targetRotY + (stateObj.clock.elapsedTime * 0.3), 0.05);
    }

    const posAttr = pointsRef.current.geometry.attributes.position;
    const colAttr = pointsRef.current.geometry.attributes.color;
    
    // State mapping
    let targetShape = shapes.idle;
    let targetColor = new THREE.Color("#444444"); // 00 Idle
    let targetOpacity = 1.0;

    if (stateIndex === 0) { targetShape = shapes.idle; targetColor = new THREE.Color("#00ffff"); targetColor.multiplyScalar(0.2); } // 00: Cyan dark tint
    else if (stateIndex === 1) { targetShape = shapes.sphere1; targetColor = new THREE.Color("#9b59b6"); targetColor.multiplyScalar(1.5); } // 01: Purple glow
    else if (stateIndex === 2) { targetShape = shapes.waves; targetColor = new THREE.Color("#e6e6fa"); } // 02: Lavender/White
    else if (stateIndex === 3) { targetShape = shapes.sphere2; targetColor = new THREE.Color("#00ffff"); targetColor.multiplyScalar(1.2); } // 03: Cyan glow
    else if (stateIndex === 4) { targetShape = shapes.blob; targetColor = new THREE.Color("#00a8ff"); targetColor.multiplyScalar(1.2); } // 04: Turquoise glow
    else if (stateIndex === 5) { targetShape = shapes.sphere1; targetColor = new THREE.Color("#ff00ff"); targetOpacity = 0.0; } // Fade out particles

    // Interpolation (lerp)
    for (let i = 0; i < numParticles; i++) {
      const idx = i * 3;
      const noise = stateIndex === 2 ? Math.sin(stateObj.clock.elapsedTime * 3 + i) * 0.1 : Math.sin(stateObj.clock.elapsedTime * 1.5 + i) * 0.05;
      
      posAttr.array[idx] = THREE.MathUtils.lerp(posAttr.array[idx], targetShape[idx] + noise, 0.04);
      posAttr.array[idx+1] = THREE.MathUtils.lerp(posAttr.array[idx+1], targetShape[idx+1] + noise, 0.04);
      posAttr.array[idx+2] = THREE.MathUtils.lerp(posAttr.array[idx+2], targetShape[idx+2], 0.04);
      
      // Mix occasional secondary highlights
      let finalColor = targetColor;
      if (stateIndex === 1 && i % 10 === 0) finalColor = new THREE.Color("#00ffff"); // Cyan highlights on Purple
      if (stateIndex === 2 && i % 5 === 0) finalColor = new THREE.Color("#9b59b6"); // Violet highlights on White

      currentColors[idx] = THREE.MathUtils.lerp(currentColors[idx], finalColor.r, 0.05);
      currentColors[idx+1] = THREE.MathUtils.lerp(currentColors[idx+1], finalColor.g, 0.05);
      currentColors[idx+2] = THREE.MathUtils.lerp(currentColors[idx+2], finalColor.b, 0.05);
    }
    
    posAttr.needsUpdate = true;
    if (!colAttr) {
        pointsRef.current.geometry.setAttribute('color', new THREE.BufferAttribute(currentColors, 3));
    } else {
        colAttr.needsUpdate = true;
    }

    if (pointsRef.current.material) {
        pointsRef.current.material.opacity = THREE.MathUtils.lerp(pointsRef.current.material.opacity, targetOpacity, 0.05);
    }

    if (crystalRef.current) {
        // Grow the crystal ONLY in section 5
        crystalRef.current.scale.setScalar(THREE.MathUtils.lerp(crystalRef.current.scale.x, stateIndex === 5 ? 1 : 0.0, 0.05));
    }
  });

  return (
    <group position={[4, 0, 0]}> {/* Shifted right to take up massive center-right area */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={numParticles} array={positions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.04} vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.9} />
      </points>

      {/* Pink Geometric Crystal (Section 5) */}
      <mesh ref={crystalRef} scale={0.001}>
        <octahedronGeometry args={[5, 1]} />
        <meshStandardMaterial color="#ff00ff" wireframe emissive="#ff00ff" emissiveIntensity={3.0} />
      </mesh>
    </group>
  );
}

// --- CONTROLLED EXPERIMENT WORKFLOW ---
const MEASUREMENT_LABELS = {
  DIRECT: 'direct',
  MODELED_TICK_PROXY: 'tick proxy',
  AGENT_LOCAL_OBSERVATION: 'agent-local'
};

function parseSeedList(text) {
  return text
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((raw) => (/^-?\d+$/.test(raw) ? Number(raw) : NaN));
}

/**
 * Mirrors SimulationConfig.validate() plus the controller resource limits so invalid
 * input is rejected locally instead of surfacing as an opaque 400 from the backend.
 */
function validateSimulationConfig(config) {
  const errors = [];
  const isInt = (value) => Number.isInteger(value);
  const inRange = (value, min, max) => Number.isFinite(value) && value >= min && value <= max;

  if (!isInt(config.nodeCount) || !inRange(config.nodeCount, 1, 1000)) {
    errors.push('Nodes must be an integer between 1 and 1000.');
  }
  if (!isInt(config.simulationTicks) || !inRange(config.simulationTicks, 1, 10000)) {
    errors.push('Ticks must be an integer between 1 and 10000.');
  }
  if (!inRange(config.blockGossipLatency, 0, Number.MAX_SAFE_INTEGER)) {
    errors.push('Block gossip latency must be zero or greater.');
  }
  if (!inRange(config.slotDuration, 0, 60)) {
    errors.push('Slot duration must be between 0 and 60 seconds.');
  }
  if (!inRange(config.byzantineRatio, 0, 1)) errors.push('Byzantine ratio must be between 0 and 1.');
  if (!inRange(config.inactiveAgentRatio, 0, 1)) errors.push('Inactive ratio must be between 0 and 1.');
  if (config.byzantineRatio + config.inactiveAgentRatio > 1.000000001) {
    errors.push('Byzantine + inactive ratios cannot exceed 1.0.');
  }
  if (!inRange(config.packetLossRate, 0, 1)) errors.push('Packet loss must be between 0 and 1.');
  if (!inRange(config.partitionRatio, 0, 1)) errors.push('Partition ratio must be between 0 and 1.');
  if (!isInt(config.networkLatencyJitter) || config.networkLatencyJitter < 0) {
    errors.push('Latency jitter must be a non-negative integer.');
  }
  if (config.partitionStartTick >= 0 && config.partitionEndTick >= 0
      && config.partitionEndTick < config.partitionStartTick) {
    errors.push('Partition end tick cannot be before the start tick.');
  }
  if (config.transactionsPerAgentPerTick < 0 || !isInt(config.transactionsPerAgentPerTick)) {
    errors.push('Transactions per agent per tick must be a non-negative integer.');
  }
  if (!isInt(config.mempoolCapacity) || config.mempoolCapacity <= 0) {
    errors.push('Mempool capacity must be a positive integer.');
  }
  if (!isInt(config.maxTransactionsPerBlock) || config.maxTransactionsPerBlock <= 0) {
    errors.push('Max transactions per block must be a positive integer.');
  }
  if (!inRange(config.transactionAmount, 0.000001, Number.MAX_SAFE_INTEGER)) {
    errors.push('Transaction amount must be greater than zero.');
  }
  if (!Number.isInteger(config.randomSeed)) errors.push('Seed must be an integer.');
  return errors;
}

function formatMetric(value, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return 'n/a';
  const fixed = Number(value).toFixed(digits);
  if (!fixed.includes('.')) return fixed;
  return fixed.replace(/0+$/, '').replace(/\.$/, '');
}

function describeExperimentConfig(config) {
  if (!config) return 'no configuration captured';
  const byzantine = config.byzantineBehaviorEnabled
    ? `${config.byzantineRatio}/${config.byzantineAttackMode}`
    : `${config.byzantineRatio}/off`;
  return [
    `nodes=${config.nodeCount}`,
    `consensus=${config.consensusType}`,
    `ticks=${config.simulationTicks}`,
    `latency=${config.blockGossipLatency}`,
    `jitter=${config.networkLatencyJitter}`,
    `loss=${config.packetLossRate}`,
    `partition=${config.partitionStartTick}..${config.partitionEndTick}`,
    `byzantine=${byzantine}`,
    `inactive=${config.inactiveAgentRatio}`
  ].join(' · ');
}

function meanWithDeviation(aggregate, metric) {
  const statistics = aggregate && aggregate.statistics ? aggregate.statistics[metric] : null;
  if (!statistics || !statistics.available) return 'n/a';
  return `${formatMetric(statistics.mean)} ± ${formatMetric(statistics.populationStandardDeviation)}`;
}

function experimentBadge(treatment) {
  if (treatment.controlled) return 'CONTROLLED';
  return treatment.changedFactors.length > 1 ? 'MULTI-FACTOR' : 'NO CHANGE';
}

function ExperimentAggregateLine({ label, aggregate }) {
  const runs = (aggregate && aggregate.runs) || [];
  return (
    <div className="exp-aggregate">
      <div className="exp-line">
        <span>{label}</span>
        <span className="exp-note">
          attempted {aggregate?.attemptedRuns ?? 0} · successful {aggregate?.successfulRuns ?? 0} · failed {aggregate?.failedRuns ?? 0}
        </span>
      </div>
      {runs
        .filter((run) => run.status !== 'COMPLETED' || !run.metrics)
        .map((run, index) => (
          <div className="exp-note exp-warn" key={`${run.randomSeed}-${index}`}>
            failed seed {run.randomSeed ?? 'n/a'}: {run.status}
            {run.errorMessage ? ` — ${run.errorMessage}` : ''}
          </div>
        ))}
    </div>
  );
}

function ExperimentReport({ report }) {
  return (
    <div className="exp-report">
      <div className="exp-line">
        <span>SHARED SEEDS ({report.seeds.length})</span>
        <span className="exp-note">{report.seeds.join(', ')}</span>
      </div>
      <ExperimentAggregateLine label={`BASELINE · ${report.baselineName}`} aggregate={report.baseline} />

      {report.treatments.map((treatment) => (
        <div className="exp-treatment" key={treatment.treatmentName}>
          <div className="exp-line">
            <span>{treatment.treatmentName}</span>
            <span className={`exp-badge ${treatment.controlled ? 'controlled' : 'uncontrolled'}`}>
              {experimentBadge(treatment)}
            </span>
          </div>
          <div className="exp-note">{treatment.statusNote}</div>
          <div className="exp-factors">
            {treatment.changedFactors.length === 0 && (
              <div className="exp-note">no configuration factor changed</div>
            )}
            {treatment.changedFactors.map((factor) => (
              <div className="exp-factor" key={factor.factor}>
                <span className="exp-factor-label">{factor.label}</span>
                {factor.fieldChanges.map((change) => (
                  <span className="exp-factor-change" key={change.field}>
                    {change.field}: {change.baselineValue} → {change.treatmentValue}
                  </span>
                ))}
              </div>
            ))}
          </div>
          <ExperimentAggregateLine label="TREATMENT" aggregate={treatment.treatment} />

          <div className="exp-table-wrap">
            <table className="exp-table">
              <thead>
                <tr>
                  <th>METRIC</th>
                  <th>BASE μ±σ</th>
                  <th>TREAT μ±σ</th>
                  <th>Δ</th>
                  <th>Δ%</th>
                </tr>
              </thead>
              <tbody>
                {treatment.comparisons.map((comparison) => (
                  <tr
                    key={comparison.metric}
                    title={comparison.unavailableReason || comparison.definition}
                  >
                    <td>
                      {comparison.metric} <span className="exp-kind">{MEASUREMENT_LABELS[comparison.measurement] || comparison.measurement}</span>
                    </td>
                    <td>{meanWithDeviation(report.baseline, comparison.metric)}</td>
                    <td>{meanWithDeviation(treatment.treatment, comparison.metric)}</td>
                    <td>{comparison.available ? formatMetric(comparison.absoluteDelta) : '—'}</td>
                    <td>
                      {comparison.relativeDelta !== null && comparison.relativeDelta !== undefined
                        ? `${(comparison.relativeDelta * 100).toFixed(1)}%`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {treatment.comparisons.some((comparison) => !comparison.available) && (
            <div className="exp-note exp-warn">
              unavailable:{' '}
              {treatment.comparisons
                .filter((comparison) => !comparison.available)
                .map((comparison) => comparison.metric)
                .join(', ')}
            </div>
          )}
          <div className="exp-note">
            μ = mean of successful runs · σ = population standard deviation · “—” means no value is reported
            (zero baseline or no successful observation; hover a row for the reason) · deltas are descriptive,
            not causal unless the comparison is marked CONTROLLED.
          </div>
        </div>
      ))}

      <div className="exp-block">
        <div className="exp-label">UNSUPPORTED MEASUREMENTS</div>
        {Object.entries(report.unsupportedMeasurements || {}).map(([metric, reason]) => (
          <div className="exp-note" key={metric}>
            <strong>{metric}</strong>: {reason}
          </div>
        ))}
      </div>
    </div>
  );
}

function ExperimentPanel({ currentConfig }) {
  const [seedsText, setSeedsText] = useState('1,2,3');
  const [baseline, setBaseline] = useState(null);
  const [treatments, setTreatments] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const seeds = parseSeedList(seedsText);
  const seedsValid = seeds.length > 0 && seeds.length <= 50 && seeds.every((seed) => Number.isInteger(seed));

  const captureBaseline = () => {
    setBaseline({ name: 'baseline', configuration: { ...currentConfig } });
    setResult(null);
    setError('');
  };

  const addTreatment = () => {
    setTreatments((previous) => [
      ...previous,
      { name: `treatment-${previous.length + 1}`, configuration: { ...currentConfig } }
    ]);
    setResult(null);
  };

  const renameTreatment = (index, name) => {
    setTreatments((previous) => previous.map((entry, position) => (position === index ? { ...entry, name } : entry)));
  };

  const removeTreatment = (index) => {
    setTreatments((previous) => previous.filter((entry, position) => position !== index));
    setResult(null);
  };

  const runComparison = async () => {
    setError('');
    setResult(null);
    setBusy(true);
    try {
      const report = await simulationApi.compareExperiment({ baseline, treatments, seeds });
      setResult(report);
    } catch (requestError) {
      setError(requestError.message || 'Comparison failed.');
    } finally {
      setBusy(false);
    }
  };

  const canRun = Boolean(baseline) && treatments.length > 0 && seedsValid && !busy;

  return (
    <div className="experiment-panel" onWheel={(event) => event.stopPropagation()}>
      <div className="exp-head">
        <span className="meta-label" style={{ marginBottom: 0 }}>EXPERIMENT WORKFLOW</span>
        <span className="exp-note">capability only — results exist only after you run a comparison</span>
      </div>

      <div className="exp-label">SHARED SEEDS (comma separated, max 50)</div>
      <input
        className="exp-input"
        value={seedsText}
        onChange={(event) => setSeedsText(event.target.value)}
        aria-label="Shared experiment seeds"
      />
      {!seedsValid && <div className="exp-error">Enter between 1 and 50 integer seeds.</div>}

      <div className="exp-actions">
        <button type="button" className="exp-btn" onClick={captureBaseline}>
          CAPTURE BASELINE
        </button>
        <button type="button" className="exp-btn" onClick={addTreatment} disabled={!baseline}>
          ADD TREATMENT
        </button>
        <button type="button" className="exp-btn exp-btn-primary" onClick={runComparison} disabled={!canRun}>
          {busy ? 'RUNNING…' : 'RUN COMPARISON'}
        </button>
      </div>

      {!baseline && (
        <div className="exp-note">
          Capture the current configuration as the baseline, change a parameter, then add it as a treatment.
          The seed list is applied to every run so differences are not seed noise.
        </div>
      )}

      {baseline && (
        <div className="exp-block">
          <div className="exp-line">
            <span>BASELINE · {baseline.name}</span>
            <span className="exp-note">captured configuration</span>
          </div>
          <div className="exp-config">{describeExperimentConfig(baseline.configuration)}</div>
        </div>
      )}

      {treatments.map((treatment, index) => (
        <div className="exp-block" key={`treatment-${index}`}>
          <div className="exp-line">
            <input
              className="exp-input exp-input-inline"
              value={treatment.name}
              onChange={(event) => renameTreatment(index, event.target.value)}
              aria-label={`Treatment ${index + 1} name`}
            />
            <button type="button" className="exp-x" onClick={() => removeTreatment(index)}>
              REMOVE
            </button>
          </div>
          <div className="exp-config">{describeExperimentConfig(treatment.configuration)}</div>
        </div>
      ))}

      {error && <div className="exp-error">{error}</div>}
      {result ? (
        <ExperimentReport report={result} />
      ) : (
        <div className="exp-note">
          No comparison has been executed in this session. Counts, means, deviations, and deltas are never
          prefilled.
        </div>
      )}
    </div>
  );
}

// --- LIVE TELEMETRY & ARCHIVE COMPONENTS ---
const TREND_FIELDS = [
  { key: 'canonicalHeadAgreement', label: 'HEAD AGREEMENT', color: '#00ffff' },
  { key: 'giniCoefficient', label: 'GINI', color: '#ff00ff' },
  { key: 'transactionSuccessRate', label: 'TX SUCCESS', color: '#9b59b6' }
];

function TrendChart({ ticks }) {
  const width = 300;
  const height = 96;
  const padding = 8;
  const maxTick = Math.max(1, ...ticks.map((tick) => Number(tick.currentTick) || 0));
  const toPoint = (tick, value) => {
    const x = padding + (Math.max(0, Number(tick.currentTick) || 0) / maxTick) * (width - padding * 2);
    const y = height - padding - Math.min(1, Math.max(0, value)) * (height - padding * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  };
  const series = TREND_FIELDS.map((field) => ({
    ...field,
    points: ticks
      .map((tick) => ({ tick, value: Number(tick.metrics?.[field.key]) }))
      .filter((entry) => Number.isFinite(entry.value))
      .map((entry) => ({ ...entry, point: toPoint(entry.tick, entry.value) }))
  }));
  const hasData = series.some((entry) => entry.points.length > 0);

  return (
    <div className="trend-chart">
      <div className="exp-line">
        <span className="meta-label" style={{ marginBottom: 0 }}>LIVE TREND (0—1)</span>
        <span className="exp-note">{ticks.length} ticks</span>
      </div>
      {hasData ? (
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Live consensus metric trends">
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.15)" />
          <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="rgba(255,255,255,0.15)" />
          {series.map((entry) => (
            <polyline
              key={entry.key}
              fill="none"
              stroke={entry.color}
              strokeWidth="1.6"
              points={entry.points.map((point) => point.point).join(' ')}
            />
          ))}
        </svg>
      ) : (
        <div className="exp-note">Waiting for the first tick…</div>
      )}
      <div className="trend-legend">
        {series.map((entry) => {
          const last = entry.points[entry.points.length - 1];
          return (
            <span key={entry.key} style={{ color: entry.color }}>
              {entry.label} {last ? last.value.toFixed(3) : '—'}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function formatTimestamp(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

function HistoryPanel({ onClose, onOpenRun }) {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    simulationApi.history()
      .then((data) => { if (!cancelled) setRows(Array.isArray(data) ? data : []); })
      .catch((requestError) => { if (!cancelled) setError(requestError.message || 'History unavailable.'); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="data-drawer" role="dialog" aria-label="Simulation history">
      <div className="drawer-head">
        <div>
          <span className="meta-label" style={{ marginBottom: 0 }}>SIMULATION HISTORY</span>
          <div className="exp-note">Persisted runs from MongoDB, newest first</div>
        </div>
        <button type="button" className="drawer-close" onClick={onClose}>CLOSE ✕</button>
      </div>
      <div className="drawer-body">
        {busy && <div className="exp-note">Loading runs…</div>}
        {error && <div className="exp-error">{error}</div>}
        {!busy && !error && rows.length === 0 && (
          <div className="exp-note">No simulation has been started yet.</div>
        )}
        {rows.length > 0 && (
          <table className="history-table">
            <thead>
              <tr>
                <th>STATUS</th>
                <th>CONSENSUS</th>
                <th>NODES</th>
                <th>TICKS</th>
                <th>SEED</th>
                <th>CREATED</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td><span className={`status-pill ${String(row.status || '').toLowerCase()}`}>{row.status || 'UNKNOWN'}</span></td>
                  <td>{row.consensusType || '—'}</td>
                  <td>{row.nodeCount ?? '—'}</td>
                  <td>{row.simulationTicks ?? '—'}</td>
                  <td>{row.randomSeed ?? '—'}</td>
                  <td className="exp-note">{formatTimestamp(row.createdAt)}</td>
                  <td>
                    <button type="button" className="exp-btn" onClick={() => onOpenRun(row.id)}>OPEN</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ResearchPanel({ onClose }) {
  const [catalog, setCatalog] = useState([]);
  const [directory, setDirectory] = useState('');
  const [selected, setSelected] = useState('');
  const [document, setDocument] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    simulationApi.researchList()
      .then((data) => {
        if (cancelled) return;
        const experiments = data?.experiments || [];
        setCatalog(experiments);
        setDirectory(data?.resultsDirectory || '');
        if (experiments.length > 0) setSelected(experiments[0].file);
      })
      .catch((requestError) => { if (!cancelled) setError(requestError.message || 'Archived datasets unavailable.'); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selected) return undefined;
    let cancelled = false;
    setDocument(null);
    simulationApi.researchDocument(selected)
      .then((data) => { if (!cancelled) setDocument(data); })
      .catch((requestError) => { if (!cancelled) setError(requestError.message || 'Dataset unavailable.'); });
    return () => { cancelled = true; };
  }, [selected]);

  return (
    <div className="data-drawer" role="dialog" aria-label="Archived research experiments">
      <div className="drawer-head">
        <div>
          <span className="meta-label" style={{ marginBottom: 0 }}>ARCHIVED EXPERIMENTS (EXP1—EXP6)</span>
          <div className="exp-note">{directory || 'docs/research-results'}</div>
        </div>
        <button type="button" className="drawer-close" onClick={onClose}>CLOSE ✕</button>
      </div>
      <div className="drawer-body">
        {busy && <div className="exp-note">Loading archive…</div>}
        {error && <div className="exp-error">{error}</div>}
        {!busy && catalog.length === 0 && !error && (
          <div className="exp-note">
            No archived datasets found. Run <code>mvnw test -Dtest=Phase13ResearchExperiments</code> to
            regenerate docs/research-results.
          </div>
        )}
        {catalog.length > 0 && (
          <>
            <div className="exp-label">DATASET</div>
            <select className="exp-input" value={selected} onChange={(event) => setSelected(event.target.value)}>
              {catalog.map((entry) => (
                <option key={entry.file} value={entry.file}>{entry.title}</option>
              ))}
            </select>
            {document ? <ExperimentReport report={document} /> : <div className="exp-note">Loading dataset…</div>}
          </>
        )}
      </div>
    </div>
  );
}

// --- MAIN APPLICATION COMPONENT ---
export default function Simulation() {
  const [activeSection, setActiveSection] = useState(0); 
  const [scrollLocked, setScrollLocked] = useState(false);
  const [simulationStarted, setSimulationStarted] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  const sections = [
    { id: 0, title: "CONFIGURATION", desc: "Select network parameters to synthesize the engine." },
    { id: 1, title: "NETWORK FORMATION", desc: "Instantiating peer-to-peer topology and allocating distributed nodes." },
    { id: 2, title: "BLOCK PROPAGATION", desc: "Simulating high-frequency block gossip across the network fabric." },
    { id: 3, title: "CONSENSUS FLOW", desc: "Nodes are converging on a singular canonical chain state." },
    { id: 4, title: "NETWORK ANALYSIS", desc: "Processing topological entropy and branching ratios." },
    { id: 5, title: "SIMULATION COMPLETE", desc: "Execution finalized. Review metrics below." }
  ];

  const accentColors = [
    '#00ffff', // 00: Cyan
    '#9b59b6', // 01: Violet
    '#e6e6fa', // 02: Lavender
    '#00ffff', // 03: Cyan
    '#00a8ff', // 04: Turquoise
    '#ff00ff'  // 05: Magenta
  ];
  const currentAccent = accentColors[activeSection];
  
  const [formData, setFormData] = useState({ ...DEFAULT_SIMULATION_CONFIG });
  const [authorityIdsText, setAuthorityIdsText] = useState('');

  const [loading, setLoading] = useState(false);
  const [liveTicks, setLiveTicks] = useState([]);
  const [results, setResults] = useState(null);
  const [simulationId, setSimulationId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);
  const [wsStatus, setWsStatus] = useState('idle');
  const [drawer, setDrawer] = useState(null);
  const [user, setUser] = useState(getStoredUser());
  const stompClientRef = useRef(null);
  const pollTimerRef = useRef(null);

  // Deep link from the dashboard: /simulation with state.openDrawer === 'history'.
  useEffect(() => {
    if (location.state?.openDrawer === 'history') {
      setDrawer('history');
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  useEffect(() => {
    let cancelled = false;
    authApi.getMe()
      .then((response) => {
        if (cancelled) return;
        if (response?.authenticated && response.user) {
          setUser(response.user);
        } else {
          setUser(null);
        }
      })
      .catch(() => { if (!cancelled) setUser(getStoredUser()); });
    return () => { cancelled = true; };
  }, []);

  // Wheel Scroll Navigation
  useEffect(() => {
    const handleWheel = (e) => {
      if (scrollLocked) return;
      if (e.target && typeof e.target.closest === 'function' && e.target.closest('.experiment-panel')) return;
      
      if (!simulationStarted) {
        if (e.deltaY > 50) {
          setScrollLocked(true);
          // Return to Network Architecture
          navigate('/dashboard'); 
          setTimeout(() => setScrollLocked(false), 1000);
        }
        return;
      }

      // Block manual scroll during auto simulation
      if (activeSection > 0 && activeSection < 5) return;
      
      if (e.deltaY > 50 && activeSection < 5) {
        setScrollLocked(true);
        setActiveSection(prev => prev + 1);
        setTimeout(() => setScrollLocked(false), 1000);
      } else if (e.deltaY < -50 && activeSection > 0) {
        setScrollLocked(true);
        setActiveSection(prev => prev - 1);
        setTimeout(() => setScrollLocked(false), 1000);
      }
    };
    window.addEventListener('wheel', handleWheel);
    return () => window.removeEventListener('wheel', handleWheel);
  }, [activeSection, scrollLocked, simulationStarted, navigate]);

  const stopResultPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const applyResult = (result) => {
    setResults(result);
    setActiveSection(5);
    setLoading(false);
    setWsStatus('closed');
    stopResultPolling();
  };

  // Fallback when the STOMP result frame is missed (e.g. a reconnect during the run):
  // poll the persisted status until the worker has stored a final result.
  const startResultPolling = (id) => {
    stopResultPolling();
    pollTimerRef.current = setInterval(async () => {
      try {
        const payload = await simulationApi.get(id);
        if (payload?.result) {
          applyResult(payload.result);
        } else if (payload?.status === 'FAILED') {
          applyResult({
            configId: id,
            status: 'FAILED',
            errorMessage: 'The worker reported a failed run.',
            consensusType: payload.configuration?.consensusType,
            simulationTicks: payload.configuration?.simulationTicks
          });
        }
      } catch (pollError) {
        // Keep polling; a transient network error should not abort the run view.
        console.warn('Result poll failed:', pollError.message);
      }
    }, 3000);
  };

  const connectWebSocket = (id) => {
    if (stompClientRef.current) stompClientRef.current.deactivate();
    setWsStatus('connecting');
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_BASE),
      reconnectDelay: 4000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000
    });
    client.onConnect = () => {
      setWsStatus('connected');
      client.subscribe(`/topic/simulation/${id}`, (message) => {
        try {
          const tick = JSON.parse(message.body);
          setLiveTicks((previous) => [...previous, tick]);
          const total = Math.max(1, Number(tick.totalTicks) || Number(formData.simulationTicks) || 1);
          const completed = Number(tick.currentTick) || 0;
          // Advance the narrative sections proportionally to run progress.
          if (completed / total >= 0.15 && completed > 0) setActiveSection((current) => (current < 2 ? 2 : current));
          if (completed / total >= 0.45) setActiveSection((current) => (current < 3 ? 3 : current));
          if (completed / total >= 0.75) setActiveSection((current) => (current < 4 ? 4 : current));
        } catch (parseError) {
          console.warn('Ignoring malformed tick frame:', parseError.message);
        }
      });
      client.subscribe(`/topic/simulation/${id}/result`, (message) => {
        try {
          applyResult(JSON.parse(message.body));
        } catch (parseError) {
          console.warn('Ignoring malformed result frame:', parseError.message);
        }
      });
    };
    client.onStompError = () => setWsStatus('error');
    client.onWebSocketClose = () => setWsStatus((current) => (current === 'connected' ? 'reconnecting' : current));
    client.onWebSocketError = () => setWsStatus('error');
    client.activate();
    stompClientRef.current = client;
  };

  useEffect(() => {
    return () => {
      if (stompClientRef.current) stompClientRef.current.deactivate();
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const buildPayload = () => ({
    ...formData,
    authorityIds: authorityIdsText
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
    partitionGroupA: [],
    partitionGroupB: []
  });

  const handleStartSimulation = async (e) => {
    if (e) e.preventDefault();
    const payload = buildPayload();
    const errors = validateSimulationConfig(payload);
    setValidationErrors(errors);
    if (errors.length > 0) {
      setErrorMessage('Fix the highlighted configuration values before starting a run.');
      return;
    }
    if (!user) {
      setErrorMessage('Authentication required — sign in again before starting a simulation.');
      return;
    }

    setErrorMessage('');
    setSimulationStarted(true);
    setLoading(true);
    setLiveTicks([]);
    setResults(null);
    setActiveSection(1);

    try {
      const startedConfig = await simulationApi.start(payload);
      setSimulationId(startedConfig.id);
      sessionStorage.setItem('activeSimulationId', startedConfig.id);
      connectWebSocket(startedConfig.id);
      startResultPolling(startedConfig.id);
      // Auto-open 3D AGENT tab as requested in Step 2B
      navigate(`/agent?simId=${startedConfig.id}`, { state: { simulationId: startedConfig.id, config: payload } });
    } catch (error) {
      setErrorMessage(error.message || 'Failed to start simulation.');
      setLoading(false);
      setSimulationStarted(false);
      setActiveSection(0);
    }
  };

  const openHistoryRun = async (id) => {
    setDrawer(null);
    setErrorMessage('');
    try {
      const payload = await simulationApi.get(id);
      if (payload?.result) {
        setSimulationId(id);
        applyResult(payload.result);
        return;
      }
      setSimulationId(id);
      setResults({
        configId: id,
        status: payload?.status || 'UNKNOWN',
        consensusType: payload?.configuration?.consensusType,
        simulationTicks: payload?.configuration?.simulationTicks,
        randomSeed: payload?.configuration?.randomSeed,
        errorMessage: payload?.status === 'RUNNING'
          ? 'This run is still in progress. Live ticks are only streamed while the page is open.'
          : 'No stored result exists for this run.'
      });
      setActiveSection(5);
    } catch (error) {
      setErrorMessage(error.message || 'Could not open the selected run.');
    }
  };

  const latestTick = liveTicks.length > 0 ? liveTicks[liveTicks.length - 1] : null;
  const progressPercent = latestTick
    ? Math.min(100, Number.isFinite(Number(latestTick.progress))
      ? Number(latestTick.progress) * 100
      : (Number(latestTick.currentTick) / Math.max(1, formData.simulationTicks)) * 100)
    : 0;

  const connectionLabel = ['connecting', 'connected'].includes(wsStatus)
    ? wsStatus.toUpperCase()
    : wsStatus === 'reconnecting' ? 'RECONNECTING' : wsStatus === 'error' ? 'ERROR' : 'IDLE';



  return (
    <div className="immersive-shell" style={{ '--dynamic-accent': currentAccent }}>
      {/* 3D WEBGL ENGINE */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1 }}>
        <Canvas camera={{ position: [0, 0, 15], fov: 50 }} dpr={[1, 2]}>
          <color attach="background" args={['#020204']} />
          <ambientLight intensity={0.5} />
          <NetworkVisualization stateIndex={activeSection} />
          <EffectComposer>
            <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} height={300} intensity={1.5} />
            <Noise opacity={0.03} />
          </EffectComposer>
        </Canvas>
      </div>

      {/* MAIN LAYOUT */}
      <main className="main-content">
        
        {/* LEFT COMPOSITION */}
        <div className="left-panel">
          <AnimatePresence mode="wait">
            <motion.div 
              key={activeSection}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="meta-label">/0{activeSection} {sections[activeSection].title}</span>
              
              <h1 className="huge-title">
                {activeSection === 0 && <>NETWORK<br/>DYNAMICS.</>}
                {activeSection === 1 && <>TOPOLOGY<br/>MATRIX.</>}
                {activeSection === 2 && <>BLOCK<br/>PROPAGATION.</>}
                {activeSection === 3 && <>CONSENSUS<br/>FLOW.</>}
                {activeSection === 4 && <>NETWORK<br/>ANALYSIS.</>}
                {activeSection === 5 && <>SIMULATION<br/>COMPLETE.</>}
              </h1>
              
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#D8D8D8', marginBottom: '24px', maxWidth: '520px', lineHeight: '1.6' }}>
                {sections[activeSection].desc}
              </p>

              {/* SECTION CONTROLS / CONTENT */}
              {activeSection === 0 && (
                <>
                  {errorMessage && <div className="exp-error">{errorMessage}</div>}
                  {validationErrors.length > 0 && (
                    <ul className="validation-list">
                      {validationErrors.map((message) => <li key={message}>{message}</li>)}
                    </ul>
                  )}
                  {!user && (
                    <div className="exp-note exp-warn">
                      Session not detected.{' '}
                      <button type="button" className="inline-link" onClick={() => navigate('/login')}>SIGN IN</button>{' '}
                      to start a simulation.
                    </div>
                  )}
                  <form onSubmit={handleStartSimulation}>
                    <div className="config-grid">
                      <div className="config-section-title">NETWORK & ENGINE CORE</div>

                      <label className="config-field">
                        <span className="meta-label">CONSENSUS</span>
                        <select
                          className="form-control"
                          value={formData.consensusType}
                          onChange={(e) => setFormData({ ...formData, consensusType: e.target.value })}
                        >
                          <option value="PoW">Proof of Work (PoW)</option>
                          <option value="PoS">Proof of Stake (PoS)</option>
                          <option value="DPoS">Delegated Proof of Stake (DPoS)</option>
                          <option value="PoA">Proof of Authority (PoA)</option>
                          <option value="PoL">Proof of Location (PoL)</option>
                        </select>
                      </label>
                      <label className="config-field">
                        <span className="meta-label">TOPOLOGY</span>
                        <select
                          className="form-control"
                          value={formData.networkTopology}
                          onChange={(e) => setFormData({ ...formData, networkTopology: e.target.value })}
                        >
                          <option value="Erdos-Renyi">Erdős–Rényi</option>
                          <option value="Small-World">Small-World (Watts–Strogatz)</option>
                          <option value="Scale-Free">Scale-Free (Barabási–Albert)</option>
                        </select>
                      </label>

                      <label className="config-field">
                        <span className="meta-label">NODES</span>
                        <input type="number" className="form-control" value={formData.nodeCount} min="1" max="1000"
                          onChange={(e) => setFormData({ ...formData, nodeCount: e.target.value === '' ? NaN : Number(e.target.value) })} />
                      </label>
                      <label className="config-field">
                        <span className="meta-label">TICKS</span>
                        <input type="number" className="form-control" value={formData.simulationTicks} min="1" max="10000"
                          onChange={(e) => setFormData({ ...formData, simulationTicks: e.target.value === '' ? NaN : Number(e.target.value) })} />
                      </label>
                      <label className="config-field">
                        <span className="meta-label">SEED</span>
                        <input type="number" className="form-control" value={formData.randomSeed}
                          onChange={(e) => setFormData({ ...formData, randomSeed: e.target.value === '' ? NaN : Number(e.target.value) })} />
                      </label>

                      <label className="config-field">
                        <span className="meta-label">GOSSIP LATENCY (s)</span>
                        <input type="number" className="form-control" value={formData.blockGossipLatency} min="0" step="0.1"
                          onChange={(e) => setFormData({ ...formData, blockGossipLatency: Number(e.target.value) })} />
                      </label>
                      <label className="config-field">
                        <span className="meta-label">SLOT DURATION (s)</span>
                        <input type="number" className="form-control" value={formData.slotDuration} min="0" max="60" step="0.1"
                          onChange={(e) => setFormData({ ...formData, slotDuration: Number(e.target.value) })} />
                      </label>
                      <label className="config-field">
                        <span className="meta-label">LATENCY JITTER (ticks)</span>
                        <input type="number" className="form-control" value={formData.networkLatencyJitter} min="0" max="10"
                          onChange={(e) => setFormData({ ...formData, networkLatencyJitter: e.target.value === '' ? NaN : Number(e.target.value) })} />
                      </label>

                      <div className="config-section-title">BYZANTINE & NETWORK ADVERSITY</div>

                      <div className="config-field config-field-wide">
                        <label className="config-check">
                          <input
                            type="checkbox"
                            checked={formData.byzantineBehaviorEnabled}
                            onChange={(e) => setFormData({ ...formData, byzantineBehaviorEnabled: e.target.checked })}
                          />
                          <span className="meta-label" style={{ marginBottom: 0 }}>ENABLE BYZANTINE BEHAVIOUR</span>
                        </label>
                      </div>
                      <label className="config-field">
                        <span className="meta-label">BYZANTINE RATIO (0–1)</span>
                        <input type="number" className="form-control" value={formData.byzantineRatio} min="0" max="1" step="0.05"
                          onChange={(e) => setFormData({ ...formData, byzantineRatio: Number(e.target.value) })} />
                      </label>
                      <label className="config-field">
                        <span className="meta-label">INACTIVE RATIO (0–1)</span>
                        <input type="number" className="form-control" value={formData.inactiveAgentRatio} min="0" max="1" step="0.05"
                          onChange={(e) => setFormData({ ...formData, inactiveAgentRatio: Number(e.target.value) })} />
                      </label>
                      <label className="config-field config-field-wide">
                        <span className="meta-label">ATTACK MODE</span>
                        <select
                          className="form-control"
                          value={formData.byzantineAttackMode}
                          onChange={(e) => setFormData({ ...formData, byzantineAttackMode: e.target.value })}
                        >
                          <option value="EQUIVOCATION">Equivocation (attestation)</option>
                          <option value="BLOCK_WITHHOLDING">Block withholding</option>
                          <option value="INVALID_BLOCK">Invalid block proposal</option>
                          <option value="ALL">All attacks</option>
                          <option value="NONE">None (honest)</option>
                        </select>
                      </label>

                      <label className="config-field">
                        <span className="meta-label">PACKET LOSS (0–1)</span>
                        <input type="number" className="form-control" value={formData.packetLossRate} min="0" max="1" step="0.05"
                          onChange={(e) => setFormData({ ...formData, packetLossRate: Number(e.target.value) })} />
                      </label>
                      <label className="config-field">
                        <span className="meta-label">PARTITION RATIO (0–1)</span>
                        <input type="number" className="form-control" value={formData.partitionRatio} min="0" max="1" step="0.05"
                          onChange={(e) => setFormData({ ...formData, partitionRatio: Number(e.target.value) })} />
                      </label>
                      <label className="config-field">
                        <span className="meta-label">PARTITION START TICK (-1 off)</span>
                        <input type="number" className="form-control" value={formData.partitionStartTick} min="-1"
                          onChange={(e) => setFormData({ ...formData, partitionStartTick: e.target.value === '' ? NaN : Number(e.target.value) })} />
                      </label>
                      <label className="config-field">
                        <span className="meta-label">PARTITION END TICK (-1 off)</span>
                        <input type="number" className="form-control" value={formData.partitionEndTick} min="-1"
                          onChange={(e) => setFormData({ ...formData, partitionEndTick: e.target.value === '' ? NaN : Number(e.target.value) })} />
                      </label>

                      <div className="config-section-title">TRANSACTIONS & WORKLOAD</div>

                      <label className="config-field">
                        <span className="meta-label">TX / AGENT / TICK</span>
                        <input type="number" className="form-control" value={formData.transactionsPerAgentPerTick} min="0"
                          onChange={(e) => setFormData({ ...formData, transactionsPerAgentPerTick: e.target.value === '' ? NaN : Number(e.target.value) })} />
                      </label>
                      <label className="config-field">
                        <span className="meta-label">MEMPOOL CAPACITY</span>
                        <input type="number" className="form-control" value={formData.mempoolCapacity} min="1"
                          onChange={(e) => setFormData({ ...formData, mempoolCapacity: e.target.value === '' ? NaN : Number(e.target.value) })} />
                      </label>
                      <label className="config-field config-field-wide">
                        <span className="meta-label">MAX TX / BLOCK</span>
                        <input type="number" className="form-control" value={formData.maxTransactionsPerBlock} min="1"
                          onChange={(e) => setFormData({ ...formData, maxTransactionsPerBlock: e.target.value === '' ? NaN : Number(e.target.value) })} />
                      </label>
                      <label className="config-field">
                        <span className="meta-label">TX AMOUNT</span>
                        <input type="number" className="form-control" value={formData.transactionAmount} min="0.000001" step="0.5"
                          onChange={(e) => setFormData({ ...formData, transactionAmount: Number(e.target.value) })} />
                      </label>

                      <label className="config-field config-field-wide">
                        <span className="meta-label">AUTHORITY AGENT IDS (PoA, comma separated)</span>
                        <input type="text" className="form-control" value={authorityIdsText}
                          placeholder="e.g. Agent-0, Agent-1"
                          onChange={(e) => setAuthorityIdsText(e.target.value)} />
                      </label>
                    </div>

                    <div className="config-actions">
                      <button type="submit" className="exp-btn exp-btn-primary" disabled={loading || !user}>
                        {loading ? 'RUNNING…' : 'START SIMULATION ↗'}
                      </button>
                      <button type="button" className="exp-btn" onClick={() => setDrawer('history')}>RUN HISTORY</button>
                      <button type="button" className="exp-btn" onClick={() => setDrawer('research')}>ARCHIVED EXPERIMENTS</button>
                    </div>
                  </form>
                  <ExperimentPanel currentConfig={buildPayload()} />
                </>
              )}

              {/* DYNAMIC SCENE RESULTS MAP */}
              {activeSection === 1 && (
                <div className="results-grid" style={{ marginTop: '2rem' }}>
                  <div className="result-item">
                    <span className="meta-label">REQUESTED NODES</span>
                    <div className="value">{formData.nodeCount}</div>
                  </div>
                  <div className="result-item">
                    <span className="meta-label">TOPOLOGY / CONSENSUS</span>
                    <div className="value value-small">{formData.networkTopology} / {formData.consensusType}</div>
                  </div>
                  <div className="result-item">
                    <span className="meta-label">NETWORK STATE</span>
                    <div className="value value-small">{latestTick ? `TICK ${latestTick.currentTick} / ${latestTick.totalTicks ?? formData.simulationTicks}` : (loading ? 'INITIALIZING…' : 'IDLE')}</div>
                  </div>
                  <div className="result-item">
                    <span className="meta-label">STREAM</span>
                    <div className="value value-small">{connectionLabel}</div>
                  </div>
                </div>
              )}

              {activeSection === 2 && latestTick && (
                <>
                  <div className="results-grid" style={{ marginTop: '2rem' }}>
                    <div className="result-item">
                      <span className="meta-label">LIVE BLOCKS</span>
                      <div className="value">{latestTick.blockCount}</div>
                    </div>
                    <div className="result-item">
                      <span className="meta-label">ACTIVE FORKS</span>
                      <div className="value">{latestTick.activeForks}</div>
                    </div>
                    <div className="result-item">
                      <span className="meta-label">MESSAGES</span>
                      <div className="value">{latestTick.metrics?.messagesDelivered ?? 'N/A'}</div>
                    </div>
                    <div className="result-item">
                      <span className="meta-label">MAINCHAIN RATE</span>
                      <div className="value">{latestTick.metrics ? `${(latestTick.metrics.mainchainRate * 100).toFixed(1)}%` : 'N/A'}</div>
                    </div>
                  </div>
                  <TrendChart ticks={liveTicks} />
                </>
              )}

              {activeSection === 3 && latestTick && (
                <>
                  <div className="results-grid" style={{ marginTop: '2rem' }}>
                    <div className="result-item">
                      <span className="meta-label">ACTIVE FORKS</span>
                      <div className="value">{latestTick.activeForks}</div>
                    </div>
                    <div className="result-item">
                      <span className="meta-label">INSTANT GINI</span>
                      <div className="value">{Number(latestTick.metrics?.giniCoefficient ?? latestTick.instantGini ?? 0).toFixed(3)}</div>
                    </div>
                    <div className="result-item">
                      <span className="meta-label">HEAD AGREEMENT</span>
                      <div className="value">{latestTick.metrics ? `${(latestTick.metrics.canonicalHeadAgreement * 100).toFixed(1)}%` : 'N/A'}</div>
                    </div>
                  </div>
                  <TrendChart ticks={liveTicks} />
                </>
              )}

              {activeSection === 4 && latestTick && (
                <>
                  <div className="results-grid" style={{ marginTop: '2rem' }}>
                    <div className="result-item">
                      <span className="meta-label">MAINCHAIN RATE</span>
                      <div className="value">{latestTick.metrics ? `${(latestTick.metrics.mainchainRate * 100).toFixed(1)}%` : 'N/A'}</div>
                    </div>
                    <div className="result-item">
                      <span className="meta-label">HEAD AGREEMENT</span>
                      <div className="value">{latestTick.metrics ? `${(latestTick.metrics.canonicalHeadAgreement * 100).toFixed(1)}%` : 'N/A'}</div>
                    </div>
                    <div className="result-item">
                      <span className="meta-label">BRANCHING RATIO F</span>
                      <div className="value">{latestTick.metrics ? latestTick.metrics.branchingRatio.toFixed(3) : 'N/A'}</div>
                    </div>
                    <div className="result-item">
                      <span className="meta-label">PROPAGATION DELAY</span>
                      <div className="value">{latestTick.metrics ? `${latestTick.metrics.averagePropagationDelayTicks.toFixed(1)} ticks` : 'N/A'}</div>
                    </div>
                    <div className="result-item">
                      <span className="meta-label">ACTIVE / INACT / BYZ</span>
                      <div className="value">
                        {latestTick.metrics?.activeAgents ?? 'N/A'} / {latestTick.metrics?.inactiveAgents ?? 0} / {latestTick.metrics?.byzantineAgents ?? 0}
                      </div>
                    </div>
                    {(latestTick.metrics?.maliciousActionsAttempted ?? 0) > 0 && (
                      <div className="result-item">
                        <span className="meta-label">MALICIOUS ACTIONS</span>
                        <div className="value">{latestTick.metrics.maliciousActionsAttempted}</div>
                      </div>
                    )}
                    <div className="result-item">
                      <span className="meta-label">TXS CREATED / INCLUDED</span>
                      <div className="value">
                        {latestTick.metrics
                          ? latestTick.metrics.transactionsCreated > 0
                            ? `${latestTick.metrics.transactionsCreated} / ${latestTick.metrics.transactionsIncluded}`
                            : '0 / 0'
                          : 'N/A'}
                      </div>
                    </div>
                    <div className="result-item">
                      <span className="meta-label">TX SUCCESS RATE</span>
                      <div className="value">
                        {latestTick.metrics
                          ? latestTick.metrics.transactionsCreated > 0
                          ? `${(latestTick.metrics.transactionSuccessRate * 100).toFixed(1)}%`
                            : 'N/A'
                          : 'N/A'}
                      </div>
                    </div>
                    <div className="result-item">
                      <span className="meta-label">MSGS (SENT/DELIV/DROP)</span>
                      <div className="value">
                        {latestTick.metrics ? `${latestTick.metrics.messagesSent} / ${latestTick.metrics.messagesDelivered} / ${latestTick.metrics.messagesDropped}` : 'N/A'}
                      </div>
                    </div>
                    <div className="result-item">
                      <span className="meta-label">PARTITION STATUS</span>
                      <div className="value">
                        {latestTick.metrics?.networkPartitionActive ? 'ACTIVE' : 'NORMAL'}
                      </div>
                    </div>
                  </div>
                  <TrendChart ticks={liveTicks} />
                </>
              )}

              {activeSection === 5 && results && (
                <div>
                  {results.errorMessage && <div className="exp-error">{results.errorMessage}</div>}
                  <div className="results-grid">
                    <div className="result-item">
                      <span className="meta-label">STATUS / CONSENSUS</span>
                      <div className="value value-small">{results.status || 'COMPLETED'} / {results.consensusType || formData.consensusType}</div>
                    </div>
                    <div className="result-item">
                      <span className="meta-label">SEED / TICKS</span>
                      <div className="value">{results.randomSeed ?? formData.randomSeed} / {results.simulationTicks ?? formData.simulationTicks}</div>
                    </div>
                    <div className="result-item">
                      <span className="meta-label">MAINCHAIN RATE μ</span>
                      <div className="value">{results.mainchainRate != null ? `${(results.mainchainRate * 100).toFixed(1)}%` : '—'}</div>
                    </div>
                    <div className="result-item">
                      <span className="meta-label">BRANCHING RATIO F</span>
                      <div className="value">{results.branchingRatio != null ? results.branchingRatio.toFixed(3) : '—'}</div>
                    </div>
                    <div className="result-item">
                      <span className="meta-label">GINI COEFFICIENT</span>
                      <div className="value">{results.finalGiniCoefficient != null ? results.finalGiniCoefficient.toFixed(3) : '—'}</div>
                    </div>
                    <div className="result-item">
                      <span className="meta-label">DURATION</span>
                      <div className="value">{results.durationMillis != null ? `${results.durationMillis} ms` : '—'}</div>
                    </div>
                    {results.metrics && <>
                      <div className="result-item">
                        <span className="meta-label">ACCEPTED / REJECTED</span>
                        <div className="value">{results.metrics.blocksAccepted} / {results.metrics.blocksRejected}</div>
                      </div>
                      <div className="result-item">
                        <span className="meta-label">STALE / ORPHAN</span>
                        <div className="value">{results.metrics.staleBlocks} / {results.metrics.orphanBlocks}</div>
                      </div>
                      <div className="result-item">
                        <span className="meta-label">CANONICAL HEAD AGREEMENT</span>
                        <div className="value">{(results.metrics.canonicalHeadAgreement * 100).toFixed(1)}%</div>
                      </div>
                      <div className="result-item">
                        <span className="meta-label">AGENTS (ACT/INACT/BYZ)</span>
                        <div className="value">
                          {results.metrics.activeAgents} / {results.metrics.inactiveAgents} / {results.metrics.byzantineAgents}
                        </div>
                      </div>
                      {(results.metrics.maliciousActionsAttempted ?? 0) > 0 && (
                        <div className="result-item">
                          <span className="meta-label">MALICIOUS ACTIONS</span>
                          <div className="value">{results.metrics.maliciousActionsAttempted}</div>
                        </div>
                      )}
                      <div className="result-item">
                        <span className="meta-label">TXS CREATED / INCLUDED</span>
                        <div className="value">
                          {results.metrics.transactionsCreated > 0
                            ? `${results.metrics.transactionsCreated} / ${results.metrics.transactionsIncluded}`
                            : '0 / 0 (none generated)'}
                        </div>
                      </div>
                      <div className="result-item">
                        <span className="meta-label">TX SUCCESS RATE</span>
                        <div className="value">
                          {results.metrics.transactionsCreated > 0
                            ? `${(results.metrics.transactionSuccessRate * 100).toFixed(1)}%`
                            : 'N/A'}
                        </div>
                      </div>
                      <div className="result-item">
                        <span className="meta-label">TX / SIM TICK</span>
                        <div className="value">
                          {results.metrics.transactionsCreated > 0
                            ? results.metrics.transactionsPerSimulationTick.toFixed(2)
                            : 'N/A'}
                        </div>
                      </div>
                      <div className="result-item">
                        <span className="meta-label">MSGS (SENT/DELIV/DROP/QUEUED)</span>
                        <div className="value">
                          {results.metrics.messagesSent} / {results.metrics.messagesDelivered} / {results.metrics.messagesDropped} / {results.metrics.queuedMessages}
                        </div>
                      </div>
                      <div className="result-item">
                        <span className="meta-label">PROPAGATION / BLOCK DELAY</span>
                        <div className="value">
                          {results.metrics.averagePropagationDelayTicks.toFixed(1)} / {results.metrics.blockPropagationDelay.toFixed(1)} ticks
                        </div>
                      </div>
                    </>}
                  </div>
                  {liveTicks.length > 0 && <TrendChart ticks={liveTicks} />}
                  <button onClick={() => { setActiveSection(0); setSimulationStarted(false); setLiveTicks([]); setResults(null); setSimulationId(null); setWsStatus('idle'); }} className="primary-btn" style={{ marginTop: '3rem', opacity: 1, padding: '16px 24px', background: 'transparent', border: '1px solid #ff00ff', color: '#ff00ff', cursor: 'pointer' }}>
                    NEW SEQUENCE ↺
                  </button>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

        {/* RIGHT NAVIGATION */}
        <div className="right-panel">
          {sections.map(sec => (
            <div 
              key={sec.id}
              className={`nav-indicator ${activeSection === sec.id ? 'active' : ''}`} 
              data-label={`/0${sec.id}`}
              onClick={() => setActiveSection(sec.id)}
              style={{ cursor: 'pointer' }}
            ></div>
          ))}
        </div>
      </main>

      {/* FLOATING START SIMULATION BUTTON (OVER WEBGL) */}
      {activeSection === 0 && (
        <div style={{ position: 'absolute', top: '50%', right: '12%', transform: 'translate(0, -50%)', zIndex: 10 }}>
          <button 
            onClick={handleStartSimulation} 
            disabled={loading || !user}
            title={!user ? 'Sign in required' : 'Start a real simulation run'}
            style={{
              background: '#0a0a0c',
              border: '1px solid #00ffff',
              color: '#00ffff',
              padding: '1.25rem 2.5rem',
              fontSize: '0.9rem',
              fontWeight: 600,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              boxShadow: '0 0 20px rgba(0,255,255,0.2), inset 0 0 10px rgba(0,255,255,0.1)',
              cursor: loading || !user ? 'not-allowed' : 'pointer',
              opacity: loading || !user ? 0.45 : 1,
              transition: 'all 0.3s ease',
              borderRadius: '4px',
              fontFamily: 'var(--font-mono)'
            }}
            onMouseOver={(e) => { 
              e.currentTarget.style.boxShadow = '0 0 30px rgba(0,255,255,0.4), inset 0 0 15px rgba(0,255,255,0.2)'; 
              e.currentTarget.style.transform = 'scale(1.02) translateY(-2px)'; 
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.borderColor = '#ffffff';
            }}
            onMouseOut={(e) => { 
              e.currentTarget.style.boxShadow = '0 0 20px rgba(0,255,255,0.2), inset 0 0 10px rgba(0,255,255,0.1)'; 
              e.currentTarget.style.transform = 'scale(1) translateY(0)'; 
              e.currentTarget.style.color = '#00ffff';
              e.currentTarget.style.borderColor = '#00ffff';
            }}
          >
            START SIMULATION ↗
          </button>
        </div>
      )}



      {/* ARCHIVE / HISTORY OVERLAYS */}
      {drawer === 'history' && (
        <HistoryPanel onClose={() => setDrawer(null)} onOpenRun={openHistoryRun} />
      )}
      {drawer === 'research' && (
        <ResearchPanel onClose={() => setDrawer(null)} />
      )}

      {/* BOTTOM TELEMETRY BAR */}
      <footer className="bottom-bar">
        <div className="bottom-stats">
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <span>NODES: <span style={{ color: '#FFFFFF' }}>{formData.nodeCount}</span></span>
            <span>TOPOLOGY: <span style={{ color: '#FFFFFF' }}>{formData.networkTopology}</span></span>
            {latestTick && <span>TICK: <span style={{ color: '#FFFFFF' }}>{latestTick.currentTick}/{latestTick.totalTicks ?? formData.simulationTicks}</span></span>}
            {latestTick && <span>BLOCKS: <span style={{ color: '#FFFFFF' }}>{latestTick.blockCount}</span></span>}
            {latestTick && <span>FORKS: <span style={{ color: '#FFFFFF' }}>{latestTick.activeForks}</span></span>}
            {latestTick && <span>MAINCHAIN: <span style={{ color: '#FFFFFF' }}>{latestTick.metrics?.mainchainRate != null ? (latestTick.metrics.mainchainRate * 100).toFixed(1) + '%' : 'N/A'}</span></span>}
            {simulationId && <span>RUN: <span style={{ color: '#FFFFFF' }}>{simulationId.slice(0, 8)}</span></span>}
          </div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <span>STREAM: <span style={{ color: '#FFFFFF' }}>{connectionLabel}</span></span>
            <span>● ENGINE STATUS: <span style={{ color: '#FFFFFF' }}>{results ? (results.status || 'COMPLETED') : loading ? 'RUNNING' : 'IDLE'}</span></span>
          </div>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${results ? 100 : (activeSection > 0 ? progressPercent : 0)}%` }}></div>
        </div>
      </footer>
    </div>
  );
}
