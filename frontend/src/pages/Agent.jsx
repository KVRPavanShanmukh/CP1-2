import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client/dist/sockjs';
import { simulationApi, WS_BASE } from '../services/api';
import { downloadSimulationPdfReport } from '../utils/simulationPdfReport';
import './Agent.css';

// ═══════════════════════════════════════════════════════════════
// PROCEDURAL COSMIC GALAXY PALETTES & CANVAS TEXTURE GENERATORS
// ═══════════════════════════════════════════════════════════════
const GALAXY_PALETTES = {
  HONEST: {
    coreStops: ['rgba(255, 255, 255, 1)', 'rgba(56, 189, 248, 0.95)', 'rgba(29, 78, 216, 0.45)', 'rgba(29, 78, 216, 0.12)'],
    haloStops: ['rgba(56, 189, 248, 0.45)', 'rgba(29, 78, 216, 0.22)', 'rgba(15, 23, 42, 0.04)'],
    armInner: '#f0f9ff',
    armMid: '#38bdf8',
    armOuter: '#1d4ed8',
    nebulaColor: '#1d4ed8',
    particleCount: 400,
    nebulaCount: 110,
    arms: 2,
    radius: 1.42,
    particleSize: 0.145,
    particleOpacity: 0.94,
    coreScale: 1.45,
    haloScale: 3.1,
    haloOpacity: 0.34,
    spinSpeed: 0.52
  },
  PROPOSER: {
    coreStops: ['rgba(255, 255, 255, 1)', 'rgba(250, 204, 21, 0.98)', 'rgba(245, 158, 11, 0.5)', 'rgba(217, 119, 6, 0.14)'],
    haloStops: ['rgba(250, 204, 21, 0.5)', 'rgba(245, 158, 11, 0.24)', 'rgba(120, 53, 15, 0.04)'],
    armInner: '#fefce8',
    armMid: '#facc15',
    armOuter: '#f59e0b',
    nebulaColor: '#f59e0b',
    particleCount: 500,
    nebulaCount: 135,
    arms: 3,
    radius: 1.72,
    particleSize: 0.165,
    particleOpacity: 0.98,
    coreScale: 1.85,
    haloScale: 3.6,
    haloOpacity: 0.44,
    spinSpeed: 0.95
  },
  BYZANTINE: {
    coreStops: ['rgba(255, 228, 230, 0.96)', 'rgba(239, 68, 68, 0.95)', 'rgba(168, 85, 247, 0.48)', 'rgba(88, 28, 135, 0.14)'],
    haloStops: ['rgba(239, 68, 68, 0.45)', 'rgba(168, 85, 247, 0.25)', 'rgba(59, 7, 100, 0.05)'],
    armInner: '#ef4444',
    armMid: '#dc2626',
    armOuter: '#a855f7',
    nebulaColor: '#a855f7',
    particleCount: 440,
    nebulaCount: 125,
    arms: 3,
    radius: 1.54,
    particleSize: 0.155,
    particleOpacity: 0.96,
    coreScale: 1.6,
    haloScale: 3.3,
    haloOpacity: 0.38,
    spinSpeed: 0.78
  },
  INACTIVE: {
    coreStops: ['rgba(248, 250, 252, 0.72)', 'rgba(203, 213, 225, 0.48)', 'rgba(148, 163, 184, 0.18)', 'rgba(71, 85, 105, 0.04)'],
    haloStops: ['rgba(203, 213, 225, 0.2)', 'rgba(148, 163, 184, 0.1)', 'rgba(30, 41, 59, 0.02)'],
    armInner: '#f8fafc',
    armMid: '#cbd5e1',
    armOuter: '#94a3b8',
    nebulaColor: '#cbd5e1',
    particleCount: 220,
    nebulaCount: 70,
    arms: 2,
    radius: 1.18,
    particleSize: 0.11,
    particleOpacity: 0.56,
    coreScale: 0.95,
    haloScale: 2.3,
    haloOpacity: 0.16,
    spinSpeed: 0.14
  }
};

const EDGE_SEGMENTS = 36;
const WAVE_PULSE_SEGMENTS = 18;
const MAX_ACTIVE_WAVE_PULSES = 80;

const getStarParticleTexture = (() => {
  let texture = null;
  return () => {
    if (texture) return texture;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(0.28, 'rgba(255, 255, 255, 0.85)');
    g.addColorStop(0.62, 'rgba(255, 255, 255, 0.22)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    texture = new THREE.CanvasTexture(canvas);
    return texture;
  };
})();

const coreTextureCache = {};
const getGalaxyCoreTexture = (visualType) => {
  if (coreTextureCache[visualType]) return coreTextureCache[visualType];
  const palette = GALAXY_PALETTES[visualType] || GALAXY_PALETTES.HONEST;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, palette.coreStops[0]);
  g.addColorStop(0.2, palette.coreStops[1]);
  g.addColorStop(0.5, palette.coreStops[2]);
  g.addColorStop(0.82, palette.coreStops[3]);
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  coreTextureCache[visualType] = texture;
  return texture;
};

const haloTextureCache = {};
const getNebulaHaloTexture = (visualType) => {
  if (haloTextureCache[visualType]) return haloTextureCache[visualType];
  const palette = GALAXY_PALETTES[visualType] || GALAXY_PALETTES.HONEST;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  g.addColorStop(0, palette.haloStops[0]);
  g.addColorStop(0.42, palette.haloStops[1]);
  g.addColorStop(0.78, palette.haloStops[2]);
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  haloTextureCache[visualType] = texture;
  return texture;
};

function hashString(str) {
  let h = 2166136261;
  const text = String(str || '');
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function getNodeId(node) {
  return node?.id || node?.nodeId || node?.agentId || null;
}

function resolveNodeVisualType(nodeData) {
  const role = String(nodeData?.role || '').toUpperCase();
  const isByzantine = role === 'BYZANTINE' || Boolean(nodeData?.byzantine ?? nodeData?.isByzantine);
  if (isByzantine) return 'BYZANTINE';

  const isInactive = role === 'INACTIVE' || role === 'OFFLINE' || Boolean(nodeData?.inactive ?? nodeData?.isInactive);
  if (isInactive) return 'INACTIVE';

  const isProposer = Boolean(nodeData?.proposer ?? nodeData?.isProposer);
  if (isProposer) return 'PROPOSER';

  return 'HONEST';
}

function computeEdgeBasis(p1, p2) {
  const dir = new THREE.Vector3().subVectors(p2, p1);
  if (dir.lengthSq() < 1e-6) {
    return { normal: new THREE.Vector3(0, 1, 0), binormal: new THREE.Vector3(0, 0, 1) };
  }
  dir.normalize();
  const up = Math.abs(dir.y) > 0.88 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const normal = new THREE.Vector3().crossVectors(dir, up).normalize();
  const binormal = new THREE.Vector3().crossVectors(dir, normal).normalize();
  return { normal, binormal };
}

function sampleWavePoint(p1, p2, normal, binormal, t, time, phaseOffset, amp, freq, outVec) {
  outVec.lerpVectors(p1, p2, t);
  const envelope = Math.sin(t * Math.PI);
  const wavePhase = t * Math.PI * freq - time * 2.4 + phaseOffset;
  const offsetN = Math.sin(wavePhase) * amp * envelope;
  const offsetB = Math.cos(wavePhase * 0.78 + 0.7) * amp * 0.45 * envelope;
  outVec.addScaledVector(normal, offsetN);
  outVec.addScaledVector(binormal, offsetB);
  return outVec;
}

function disposeObjectTree(root) {
  if (!root) return;
  root.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
      else obj.material.dispose();
    }
  });
}

function getEventColorHex(eventType) {
  if (eventType === 'BLOCK_PROPOSAL' || eventType === 'BLOCK_GOSSIP') return 0xfacc15;
  if (eventType === 'ATTESTATION') return 0x34d399;
  if (eventType === 'BYZANTINE_ATTACK') return 0xef4444;
  if (eventType === 'TX_PROPAGATION') return 0xa855f7;
  if (eventType === 'PACKET_DROPPED') return 0xf43f5e;
  return 0x38bdf8;
}

export default function Agent() {
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const initialSimId = queryParams.get('simId') || location.state?.simulationId || sessionStorage.getItem('activeSimulationId');

  const [simulationId, setSimulationId] = useState(initialSimId);
  const [simulationStatus, setSimulationStatus] = useState('IDLE');
  const [simulationConfig, setSimulationConfig] = useState(location.state?.config || null);
  const [finalResult, setFinalResult] = useState(null);
  const [latestTick, setLatestTick] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [autoOrbit, setAutoOrbit] = useState(true);
  const [wsStatus, setWsStatus] = useState('idle');

  // Three.js refs
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const autoOrbitRef = useRef(autoOrbit);
  const nodeEntriesRef = useRef(new Map());
  const edgeEntriesRef = useRef(new Map());
  const packetsRef = useRef([]);
  const nodePositionsRef = useRef(new Map());
  const layoutSignatureRef = useRef('');
  const stompClientRef = useRef(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

  useEffect(() => {
    autoOrbitRef.current = autoOrbit;
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoOrbit;
    }
  }, [autoOrbit]);

  const clearSceneGraph = useCallback(() => {
    const scene = sceneRef.current;
    if (scene) {
      nodeEntriesRef.current.forEach((entry) => {
        scene.remove(entry.group);
        disposeObjectTree(entry.group);
      });
      edgeEntriesRef.current.forEach((edge) => {
        scene.remove(edge.line);
        disposeObjectTree(edge.line);
      });
      packetsRef.current.forEach((p) => {
        scene.remove(p.line);
        scene.remove(p.headSprite);
        disposeObjectTree(p.line);
        disposeObjectTree(p.headSprite);
      });
    }
    nodeEntriesRef.current.clear();
    edgeEntriesRef.current.clear();
    nodePositionsRef.current.clear();
    packetsRef.current = [];
    layoutSignatureRef.current = '';
  }, []);

  // --- 1. RESOLVE OR LOAD LATEST SIMULATION IF NONE ACTIVE ---
  useEffect(() => {
    let cancelled = false;

    async function resolveSim() {
      if (simulationId) {
        try {
          const data = await simulationApi.get(simulationId);
          if (!cancelled && data) {
            setSimulationConfig(data.configuration);
            setSimulationStatus(data.status || 'RUNNING');
            if (data.result) {
              setFinalResult(data.result);
              setLatestTick({
                currentTick: data.result.simulationTicks,
                totalTicks: data.result.simulationTicks,
                progress: 1.0,
                metrics: data.result.metrics,
                mainchainRate: data.result.mainchainRate,
                instantGini: data.result.finalGiniCoefficient
              });
            }
          }
        } catch (e) {
          console.warn('Could not load specified simulation:', e);
        }
      } else {
        try {
          const history = await simulationApi.history();
          if (!cancelled && history && history.length > 0) {
            const latest = history[0];
            setSimulationId(latest.id);
            setSimulationConfig(latest);
            setSimulationStatus(latest.status || 'COMPLETED');
            sessionStorage.setItem('activeSimulationId', latest.id);
          }
        } catch (err) {
          console.warn('Could not fetch simulation history:', err);
        }
      }
    }

    clearSceneGraph();
    setFinalResult(null);
    setSelectedNode(null);
    setActivityLogs([]);
    resolveSim();
    return () => { cancelled = true; };
  }, [simulationId, clearSceneGraph]);

  // Lightweight fallback poll ONLY while a live simulation is running and result has not yet arrived
  useEffect(() => {
    if (!simulationId || finalResult || simulationStatus !== 'RUNNING') return undefined;
    let active = true;
    const timer = setInterval(async () => {
      try {
        const data = await simulationApi.get(simulationId);
        if (!active || !data) return;
        if (data.configuration) setSimulationConfig(data.configuration);
        if (data.result) {
          setFinalResult(data.result);
          setSimulationStatus(data.result.status || data.status || 'COMPLETED');
          setLatestTick((prev) => ({
            ...(prev || {}),
            metrics: data.result.metrics || prev?.metrics,
            mainchainRate: data.result.mainchainRate,
            instantGini: data.result.finalGiniCoefficient
          }));
        } else if (data.status === 'FAILED') {
          setSimulationStatus('FAILED');
        }
      } catch {
        // Ignore transient polling failures while STOMP handles streaming
      }
    }, 3000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [simulationId, simulationStatus, finalResult]);

  // --- 2. PROCEDURAL 3D COSMIC SPIRAL GALAXY BUILDER ---
  const createGalaxyObject = useCallback((node, visualType) => {
    const palette = GALAXY_PALETTES[visualType] || GALAXY_PALETTES.HONEST;
    const nodeId = getNodeId(node) || 'Agent-0';
    const seedVal = hashString(nodeId);
    const seedVal2 = hashString(`${nodeId}-tilt`);

    const group = new THREE.Group();
    group.frustumCulled = false;

    // Deterministic cosmic orbital inclination so galaxy roles keep their orientation
    const tiltX = 0.42 + seedVal * 0.55;
    const tiltZ = (seedVal2 - 0.5) * 0.9;
    group.rotation.set(tiltX, 0, tiltZ);

    const spiralGroup = new THREE.Group();
    spiralGroup.frustumCulled = false;
    group.add(spiralGroup);

    // Safe scaling formula guaranteeing visibility across PoW / high Gini
    const rawVal = Number(node?.stake ?? node?.balance ?? node?.hashPower ?? 100);
    const rawScale = Number.isFinite(rawVal) && rawVal > 0 ? 1.0 + rawVal / 2800 : 1.0;
    const safeScale = Number.isFinite(rawScale) ? Math.max(0.95, Math.min(1.45, rawScale)) : 1.0;
    const radius = palette.radius * safeScale;

    const starTexture = getStarParticleTexture();

    // 1. Dense multi-arm logarithmic spiral particle cloud
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(palette.particleCount * 3);
    const colors = new Float32Array(palette.particleCount * 3);

    const cInner = new THREE.Color(palette.armInner);
    const cMid = new THREE.Color(palette.armMid);
    const cOuter = new THREE.Color(palette.armOuter);
    const tmpColor = new THREE.Color();

    for (let i = 0; i < palette.particleCount; i += 1) {
      const armIdx = i % palette.arms;
      const baseAngle = (armIdx * 2 * Math.PI) / palette.arms;
      const u = Math.pow(Math.random(), 1.45); // Dense galactic bulge + sweeping arms
      const r = (0.04 + u * 0.96) * radius;
      const scatter = (Math.random() - 0.5) * (0.16 + 0.52 * u);
      const logSpiralAngle = baseAngle + 2.85 * Math.log(1 + r * 3.1) + scatter;

      const px = r * Math.cos(logSpiralAngle);
      const pz = r * Math.sin(logSpiralAngle);
      // True 3D bulge height near core, tapering toward spiral disc edge
      const bulgeThickness = 0.44 * Math.exp(-u * 2.5) + 0.11;
      const py = (Math.random() - 0.5) * bulgeThickness * safeScale;

      positions[i * 3] = px;
      positions[i * 3 + 1] = py;
      positions[i * 3 + 2] = pz;

      if (u < 0.28) {
        tmpColor.copy(cInner).lerp(cMid, u / 0.28);
      } else {
        tmpColor.copy(cMid).lerp(cOuter, (u - 0.28) / 0.72);
      }
      const brightness = 0.8 + Math.random() * 0.35;
      colors[i * 3] = Math.min(1, tmpColor.r * brightness);
      colors[i * 3 + 1] = Math.min(1, tmpColor.g * brightness);
      colors[i * 3 + 2] = Math.min(1, tmpColor.b * brightness);
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const pMat = new THREE.PointsMaterial({
      size: palette.particleSize * safeScale,
      map: starTexture,
      vertexColors: true,
      transparent: true,
      opacity: palette.particleOpacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const galaxyPoints = new THREE.Points(geo, pMat);
    galaxyPoints.frustumCulled = false;
    spiralGroup.add(galaxyPoints);

    // 2. Outer 3D cosmic nebula dust cloud
    const nebGeo = new THREE.BufferGeometry();
    const nebPos = new Float32Array(palette.nebulaCount * 3);
    const nebCol = new Float32Array(palette.nebulaCount * 3);
    const nebBaseColor = new THREE.Color(palette.nebulaColor);

    for (let i = 0; i < palette.nebulaCount; i += 1) {
      const r = (0.35 + Math.random() * 0.95) * radius;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI * 0.45;
      nebPos[i * 3] = r * Math.cos(phi) * Math.cos(theta);
      nebPos[i * 3 + 1] = r * Math.sin(phi) * 0.55;
      nebPos[i * 3 + 2] = r * Math.cos(phi) * Math.sin(theta);

      tmpColor.copy(cMid).lerp(nebBaseColor, 0.35 + Math.random() * 0.65);
      nebCol[i * 3] = tmpColor.r;
      nebCol[i * 3 + 1] = tmpColor.g;
      nebCol[i * 3 + 2] = tmpColor.b;
    }

    nebGeo.setAttribute('position', new THREE.BufferAttribute(nebPos, 3));
    nebGeo.setAttribute('color', new THREE.BufferAttribute(nebCol, 3));

    const nebMat = new THREE.PointsMaterial({
      size: 0.34 * safeScale,
      map: starTexture,
      vertexColors: true,
      transparent: true,
      opacity: visualType === 'INACTIVE' ? 0.14 : 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const nebulaPoints = new THREE.Points(nebGeo, nebMat);
    nebulaPoints.frustumCulled = false;
    spiralGroup.add(nebulaPoints);

    // 3. Soft outer nebula halo sprite
    const haloMat = new THREE.SpriteMaterial({
      map: getNebulaHaloTexture(visualType),
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: palette.haloOpacity,
      depthWrite: false
    });
    const haloSprite = new THREE.Sprite(haloMat);
    const haloSize = palette.haloScale * safeScale;
    haloSprite.scale.set(haloSize, haloSize, 1);
    haloSprite.frustumCulled = false;
    group.add(haloSprite);

    // 4. Glowing soft radial galactic core sprite (no flat opaque circle)
    const coreMat = new THREE.SpriteMaterial({
      map: getGalaxyCoreTexture(visualType),
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: visualType === 'INACTIVE' ? 0.62 : 0.98,
      depthWrite: false
    });
    const coreSprite = new THREE.Sprite(coreMat);
    const coreSize = palette.coreScale * safeScale;
    coreSprite.scale.set(coreSize, coreSize, 1);
    coreSprite.frustumCulled = false;
    group.add(coreSprite);

    return {
      group,
      spiralGroup,
      galaxyPoints,
      nebulaPoints,
      haloSprite,
      coreSprite,
      baseCoreSize: coreSize,
      baseHaloSize: haloSize,
      spinSpeed: palette.spinSpeed,
      phaseSeed: seedVal * Math.PI * 2
    };
  }, []);

  // --- 3. 3D GRAPH BUILDER & WAVE EDGE TOPOLOGY ---
  const update3DGraph = useCallback((rawNodes = [], rawEdges = []) => {
    const scene = sceneRef.current;
    if (!scene) return;

    const positions = nodePositionsRef.current;
    const nodeEntries = nodeEntriesRef.current;
    const edgeEntries = edgeEntriesRef.current;

    // 1. Gather union of all node IDs across nodes, edges, and previously tracked nodes
    const allNodeIds = new Set();
    const nodeMap = new Map();

    (rawNodes || []).forEach((n) => {
      const id = getNodeId(n);
      if (id) {
        const normalized = { ...n, id };
        allNodeIds.add(id);
        nodeMap.set(id, normalized);
      }
    });

    (rawEdges || []).forEach((e) => {
      const f = e?.from || e?.source || e?.fromId;
      const t = e?.to || e?.target || e?.toId;
      if (f) allNodeIds.add(f);
      if (t) allNodeIds.add(t);
    });

    nodeEntries.forEach((_, id) => allNodeIds.add(id));
    positions.forEach((_, id) => allNodeIds.add(id));

    if (allNodeIds.size === 0) return;

    const sortedNodeIds = Array.from(allNodeIds).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
    const totalCount = sortedNodeIds.length;
    const hasPartition = (rawNodes || []).some((n) => (n.partitionId || 0) > 0);
    const layoutSignature = `${sortedNodeIds.join('|')}::${hasPartition ? 'P' : 'N'}`;
    const shouldRelayout = layoutSignatureRef.current !== layoutSignature;

    // 2. Compute deterministic spherical Fibonacci (or partition) coordinates for every node
    if (shouldRelayout) {
      layoutSignatureRef.current = layoutSignature;
      sortedNodeIds.forEach((nodeId, i) => {
        const node = nodeMap.get(nodeId) || nodeEntries.get(nodeId)?.data;
        let x;
        let y;
        let z;
        if (hasPartition) {
          const isGroupB = (node?.partitionId || 0) === 1;
          const clusterCenterX = isGroupB ? 7.2 : -7.2;
          const halfCount = Math.max(1, totalCount / 2);
          const angle = (i / halfCount) * Math.PI * 2;
          const radius = 3.6 + (i % 3) * 0.65;
          x = clusterCenterX + Math.cos(angle) * radius;
          y = Math.sin(angle) * radius * 0.72 + Math.sin(i) * 1.4;
          z = Math.sin(angle * 1.5) * 2.5 + Math.cos(i) * 1.4;
        } else {
          const phi = Math.acos(1 - (2 * (i + 0.5)) / totalCount);
          const theta = Math.PI * (1 + 5 ** 0.5) * (i + 0.5);
          const r = 8.4;
          x = r * Math.sin(phi) * Math.cos(theta);
          y = r * Math.sin(phi) * Math.sin(theta);
          z = r * Math.cos(phi);
        }
        positions.set(nodeId, new THREE.Vector3(x, y, z));
      });
    }

    // 3. Instantiate or update EVERY single node galaxy in the active scene
    sortedNodeIds.forEach((nodeId) => {
      let nodeData = nodeMap.get(nodeId);
      if (!nodeData) {
        const prevEntry = nodeEntries.get(nodeId);
        nodeData = prevEntry?.data || {
          id: nodeId,
          role: 'HONEST',
          proposer: false,
          stake: 100,
          hashPower: 50,
          headBlockId: 'GENESIS',
          mempoolSize: 0,
          partitionId: 0,
          peers: []
        };
      }

      const pos = positions.get(nodeId);
      let entry = nodeEntries.get(nodeId);
      const currentVisualType = resolveNodeVisualType(nodeData);

      if (!entry || entry.visualType !== currentVisualType) {
        if (entry) {
          scene.remove(entry.group);
          disposeObjectTree(entry.group);
        }

        const visualObj = createGalaxyObject(nodeData, currentVisualType);

        // Invisible hit-sphere for reliable raycaster click-to-inspect
        const hitGeo = new THREE.SphereGeometry(1.35, 10, 10);
        const hitMat = new THREE.MeshBasicMaterial({ visible: false });
        const hitMesh = new THREE.Mesh(hitGeo, hitMat);
        hitMesh.userData = { nodeId };
        hitMesh.frustumCulled = false;
        visualObj.group.add(hitMesh);

        visualObj.group.position.copy(pos);
        visualObj.group.visible = true;
        scene.add(visualObj.group);

        entry = {
          ...visualObj,
          hitMesh,
          data: nodeData,
          visualType: currentVisualType,
          isAttacking: false
        };
        nodeEntries.set(nodeId, entry);
      } else {
        entry.data = nodeData;
        if (entry.group.parent !== scene) {
          scene.add(entry.group);
        }
        entry.group.visible = true;
        entry.group.position.copy(pos);
      }
    });

    // Update inspected node drawer live with newest telemetry snapshot
    if (nodeMap.size > 0) {
      setSelectedNode((prev) => {
        if (!prev?.id) return prev;
        return nodeMap.get(prev.id) || prev;
      });
    }

    // 4. Build or update subtle wave-modulated P2P edge filaments
    const edgesToRender = rawEdges || [];
    if (edgesToRender.length > 0) {
      edgesToRender.forEach((edge) => {
        const fromId = edge?.from || edge?.source || edge?.fromId;
        const toId = edge?.to || edge?.target || edge?.toId;
        if (!fromId || !toId || fromId === toId) return;

        const p1 = positions.get(fromId);
        const p2 = positions.get(toId);
        if (!p1 || !p2) return;

        const edgeKey = fromId < toId ? `${fromId}__${toId}` : `${toId}__${fromId}`;
        let edgeEntry = edgeEntries.get(edgeKey);

        if (!edgeEntry) {
          const vertexCount = EDGE_SEGMENTS + 1;
          const linePositions = new Float32Array(vertexCount * 3);
          const { normal, binormal } = computeEdgeBasis(p1, p2);
          const phaseOffset = hashString(edgeKey) * Math.PI * 2;
          const tmp = new THREE.Vector3();

          for (let j = 0; j < vertexCount; j += 1) {
            const t = j / EDGE_SEGMENTS;
            sampleWavePoint(p1, p2, normal, binormal, t, 0, phaseOffset, 0.24, 3.0, tmp);
            linePositions[j * 3] = tmp.x;
            linePositions[j * 3 + 1] = tmp.y;
            linePositions[j * 3 + 2] = tmp.z;
          }

          const lineGeo = new THREE.BufferGeometry();
          lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));

          const baseColor = new THREE.Color(0x38bdf8);
          const lineMat = new THREE.LineBasicMaterial({
            color: baseColor.clone(),
            transparent: true,
            opacity: 0.36,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          });

          const line = new THREE.Line(lineGeo, lineMat);
          line.frustumCulled = false;
          scene.add(line);

          edgeEntry = {
            line,
            p1: p1.clone(),
            p2: p2.clone(),
            normal,
            binormal,
            phaseOffset,
            baseColor,
            flashColor: new THREE.Color(0x38bdf8),
            flashTimer: 0,
            from: fromId,
            to: toId
          };
          edgeEntries.set(edgeKey, edgeEntry);
        } else {
          if (edgeEntry.line.parent !== scene) {
            scene.add(edgeEntry.line);
          }
          if (!edgeEntry.p1.equals(p1) || !edgeEntry.p2.equals(p2)) {
            edgeEntry.p1.copy(p1);
            edgeEntry.p2.copy(p2);
            const basis = computeEdgeBasis(p1, p2);
            edgeEntry.normal.copy(basis.normal);
            edgeEntry.binormal.copy(basis.binormal);
          }
        }
      });
    }
  }, [createGalaxyObject]);

  // --- 4. FLASH WAVE EDGE ON CONSENSUS / NETWORK EVENT ---
  const flashEventEdge = useCallback((event) => {
    if (!event) return;
    const fromId = event.fromId || event.from || event.source;
    const toId = event.toId || event.to || event.target;
    const flashColor = new THREE.Color(getEventColorHex(event.type));

    if (event.type === 'BYZANTINE_ATTACK' && fromId) {
      const nodeEntry = nodeEntriesRef.current.get(fromId);
      if (nodeEntry) {
        nodeEntry.isAttacking = true;
        setTimeout(() => {
          if (nodeEntry) nodeEntry.isAttacking = false;
        }, 850);
      }
    }

    edgeEntriesRef.current.forEach((edge) => {
      const match =
        (edge.from === fromId && edge.to === toId) ||
        (edge.from === toId && edge.to === fromId) ||
        (!toId && fromId && (edge.from === fromId || edge.to === fromId));

      if (match) {
        edge.flashColor.copy(flashColor);
        edge.flashTimer = 1.0;
      }
    });
  }, []);

  // --- 5. DYNAMIC MESSAGE WAVE ANIMATION SPAWNER (GALAXY A -> GALAXY B) ---
  const spawnWavePulseBetween = useCallback((fromId, toId, colorHex) => {
    const scene = sceneRef.current;
    const positions = nodePositionsRef.current;
    if (!scene || !fromId || !toId || fromId === toId) return;

    const fromPos = positions.get(fromId);
    const toPos = positions.get(toId);
    if (!fromPos || !toPos) return;

    // Recycle oldest pulse cleanly if exceeding concurrent budget
    while (packetsRef.current.length >= MAX_ACTIVE_WAVE_PULSES) {
      const oldest = packetsRef.current.shift();
      if (oldest) {
        scene.remove(oldest.line);
        scene.remove(oldest.headSprite);
        disposeObjectTree(oldest.line);
        disposeObjectTree(oldest.headSprite);
      }
    }

    const edgeKey = fromId < toId ? `${fromId}__${toId}` : `${toId}__${fromId}`;
    const existingEdge = edgeEntriesRef.current.get(edgeKey);
    const basis = computeEdgeBasis(fromPos, toPos);
    const phaseOffset = existingEdge ? existingEdge.phaseOffset : hashString(edgeKey) * Math.PI * 2;

    const vertexCount = WAVE_PULSE_SEGMENTS + 1;
    const pulsePositions = new Float32Array(vertexCount * 3);
    const pulseColors = new Float32Array(vertexCount * 3);
    const cBase = new THREE.Color(colorHex);
    const cHead = new THREE.Color(0xffffff).lerp(cBase, 0.35);
    const tmpCol = new THREE.Color();

    for (let j = 0; j < vertexCount; j += 1) {
      const ratio = j / WAVE_PULSE_SEGMENTS;
      const intensity = Math.pow(ratio, 1.5);
      tmpCol.copy(cBase).lerp(cHead, ratio * 0.8).multiplyScalar(intensity);
      pulseColors[j * 3] = tmpCol.r;
      pulseColors[j * 3 + 1] = tmpCol.g;
      pulseColors[j * 3 + 2] = tmpCol.b;
      pulsePositions[j * 3] = fromPos.x;
      pulsePositions[j * 3 + 1] = fromPos.y;
      pulsePositions[j * 3 + 2] = fromPos.z;
    }

    const pulseGeo = new THREE.BufferGeometry();
    pulseGeo.setAttribute('position', new THREE.BufferAttribute(pulsePositions, 3));
    pulseGeo.setAttribute('color', new THREE.BufferAttribute(pulseColors, 3));

    const pulseMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const line = new THREE.Line(pulseGeo, pulseMat);
    line.frustumCulled = false;
    scene.add(line);

    const headMat = new THREE.SpriteMaterial({
      map: getStarParticleTexture(),
      color: colorHex,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const headSprite = new THREE.Sprite(headMat);
    headSprite.position.copy(fromPos);
    headSprite.scale.set(0.62, 0.62, 1);
    headSprite.frustumCulled = false;
    scene.add(headSprite);

    packetsRef.current.push({
      line,
      headSprite,
      startPos: fromPos.clone(),
      endPos: toPos.clone(),
      normal: basis.normal,
      binormal: basis.binormal,
      phaseOffset,
      progress: 0
    });
  }, []);

  const spawnActivityPacket = useCallback((event) => {
    if (!event) return;
    const fromId = event.fromId || event.from || event.source;
    if (!fromId) return;

    let toId = event.toId || event.to || event.target || null;
    if (!toId && event.detail) {
      const targetMatch = String(event.detail).match(/(?:->|→)\s*(Agent-\d+)/i);
      if (targetMatch) toId = targetMatch[1];
    }

    const colorHex = getEventColorHex(event.type);

    if (toId) {
      spawnWavePulseBetween(fromId, toId, colorHex);
      return;
    }

    // Broadcast events ripple outward along real peer edges from sender galaxy
    const peers = nodeEntriesRef.current.get(fromId)?.data?.peers || [];
    if (peers.length > 0) {
      peers.slice(0, 3).forEach((peerId) => {
        spawnWavePulseBetween(fromId, peerId, colorHex);
      });
      return;
    }

    const connectedTargets = [];
    edgeEntriesRef.current.forEach((edge) => {
      if (edge.from === fromId) connectedTargets.push(edge.to);
      else if (edge.to === fromId) connectedTargets.push(edge.from);
    });
    connectedTargets.slice(0, 3).forEach((targetId) => {
      spawnWavePulseBetween(fromId, targetId, colorHex);
    });
  }, [spawnWavePulseBetween]);

  // --- 6. THREE.JS INITIALIZATION (REACT STRICTMODE SAFE) ---
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020307);
    scene.fog = new THREE.FogExp2(0x020307, 0.02);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      1000
    );
    camera.position.set(0, 10, 24);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = autoOrbitRef.current;
    controls.autoRotateSpeed = 0.65;
    controls.maxDistance = 60;
    controls.minDistance = 3;
    controlsRef.current = controls;

    // Cosmic lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 1.1);
    scene.add(hemiLight);

    // Subtle cosmic grid floor
    const gridHelper = new THREE.GridHelper(44, 44, 0x0ea5e9, 0x0f172a);
    gridHelper.position.y = -7.8;
    gridHelper.material.opacity = 0.16;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);

    // Background deep-space starfield
    const starCount = 1200;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i += 1) {
      starPositions[i * 3] = (Math.random() - 0.5) * 84;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 64;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 84;

      const pick = Math.random();
      if (pick < 0.6) {
        starColors[i * 3] = 0.72; starColors[i * 3 + 1] = 0.9; starColors[i * 3 + 2] = 1.0;
      } else if (pick < 0.85) {
        starColors[i * 3] = 0.25; starColors[i * 3 + 1] = 0.82; starColors[i * 3 + 2] = 1.0;
      } else {
        starColors[i * 3] = 1.0; starColors[i * 3 + 1] = 0.86; starColors[i * 3 + 2] = 0.35;
      }
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.48,
      map: getStarParticleTexture(),
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const starMesh = new THREE.Points(starGeo, starMat);
    starMesh.frustumCulled = false;
    scene.add(starMesh);

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      camera.aspect = container.clientWidth / Math.max(1, container.clientHeight);
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    let animId;
    const clock = new THREE.Clock();
    const tmpPoint = new THREE.Vector3();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.05);
      const time = clock.getElapsedTime();

      if (controlsRef.current) {
        controlsRef.current.autoRotate = autoOrbitRef.current;
        controlsRef.current.update();
      }

      starMesh.rotation.y = time * 0.01;

      // Animate all 3D Spiral Galaxies smoothly in 3D space
      nodeEntriesRef.current.forEach((entry) => {
        if (entry.spiralGroup) {
          entry.spiralGroup.rotation.y += entry.spinSpeed * delta;
        }
        if (entry.coreSprite) {
          const pulse = 1.0 + Math.sin(time * 2.2 + entry.phaseSeed) * (entry.visualType === 'PROPOSER' ? 0.14 : 0.06);
          const coreS = entry.baseCoreSize * pulse;
          entry.coreSprite.scale.set(coreS, coreS, 1);
        }
        if (entry.haloSprite) {
          const haloPulse = 1.0 + Math.cos(time * 1.5 + entry.phaseSeed) * 0.05;
          const haloS = entry.baseHaloSize * haloPulse;
          entry.haloSprite.scale.set(haloS, haloS, 1);
        }
        if (entry.isAttacking && entry.spiralGroup) {
          entry.spiralGroup.position.x = Math.sin(time * 36) * 0.09;
          entry.spiralGroup.position.y = Math.cos(time * 31) * 0.06;
        } else if (entry.spiralGroup) {
          entry.spiralGroup.position.set(0, 0, 0);
        }
      });

      // Animate subtle glowing wave-modulated P2P edges
      edgeEntriesRef.current.forEach((edge) => {
        if (edge.flashTimer > 0) {
          edge.flashTimer = Math.max(0, edge.flashTimer - delta * 1.45);
        }
        const tFlash = edge.flashTimer;
        const amp = 0.22 + tFlash * 0.28;
        const posAttr = edge.line.geometry.attributes.position;
        for (let j = 0; j <= EDGE_SEGMENTS; j += 1) {
          const t = j / EDGE_SEGMENTS;
          sampleWavePoint(edge.p1, edge.p2, edge.normal, edge.binormal, t, time, edge.phaseOffset, amp, 3.0, tmpPoint);
          posAttr.setXYZ(j, tmpPoint.x, tmpPoint.y, tmpPoint.z);
        }
        posAttr.needsUpdate = true;

        edge.line.material.color.copy(edge.baseColor).lerp(edge.flashColor, tFlash);
        edge.line.material.opacity = THREE.MathUtils.lerp(0.34, 0.92, tFlash);
      });

      // Animate traveling message wave pulses from sender galaxy -> receiver galaxy
      const activePulses = packetsRef.current;
      const tailSpan = 0.22;
      for (let i = activePulses.length - 1; i >= 0; i -= 1) {
        const p = activePulses[i];
        p.progress += delta * 1.45;
        if (p.progress >= 1.0) {
          scene.remove(p.line);
          scene.remove(p.headSprite);
          disposeObjectTree(p.line);
          disposeObjectTree(p.headSprite);
          activePulses.splice(i, 1);
        } else {
          const fadeIn = Math.min(1.0, p.progress / 0.12);
          const fadeOut = p.progress > 0.78 ? Math.max(0, (1.0 - p.progress) / 0.22) : 1.0;
          const intensity = fadeIn * fadeOut;

          const pulsePosAttr = p.line.geometry.attributes.position;
          const waveAmp = 0.36 * intensity;
          for (let j = 0; j <= WAVE_PULSE_SEGMENTS; j += 1) {
            const frac = j / WAVE_PULSE_SEGMENTS;
            const sampleT = Math.max(0, Math.min(1, p.progress - tailSpan * (1 - frac)));
            sampleWavePoint(
              p.startPos,
              p.endPos,
              p.normal,
              p.binormal,
              sampleT,
              time * 1.35,
              p.phaseOffset,
              waveAmp,
              3.0,
              tmpPoint
            );
            // Smooth elevated arc crest peaking cleanly at mid-flight
            tmpPoint.y += Math.sin(sampleT * Math.PI) * 0.45 * intensity;
            pulsePosAttr.setXYZ(j, tmpPoint.x, tmpPoint.y, tmpPoint.z);
          }
          pulsePosAttr.needsUpdate = true;
          p.line.material.opacity = 0.95 * intensity;

          // Position glowing crest sprite at leading wave front
          p.headSprite.position.copy(tmpPoint);
          const headScale = (0.48 + 0.24 * Math.sin(p.progress * Math.PI)) * Math.max(0.25, intensity);
          p.headSprite.scale.set(headScale, headScale, 1);
          p.headSprite.material.opacity = intensity;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      clearSceneGraph();
      sceneRef.current = null;
      if (container && renderer.domElement && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [clearSceneGraph]);

  // --- 7. WEBSOCKET / STOMP LIVE STREAM ---
  useEffect(() => {
    if (!simulationId) return undefined;

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_BASE),
      reconnectDelay: 4000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: () => {}
    });

    client.onConnect = () => {
      setWsStatus('connected');

      client.subscribe(`/topic/simulation/${simulationId}`, (message) => {
        try {
          const tickData = JSON.parse(message.body);
          if (tickData) {
            setLatestTick(tickData);
            setSimulationStatus('RUNNING');

            if (tickData.events && tickData.events.length > 0) {
              setActivityLogs((prev) => [
                ...tickData.events.map((ev, i) => ({
                  ...ev,
                  key: `${tickData.currentTick}-${i}-${Date.now()}`,
                  tick: tickData.currentTick
                })),
                ...prev
              ].slice(0, 120));

              tickData.events.forEach((ev) => {
                spawnActivityPacket(ev);
                flashEventEdge(ev);
              });
            }

            if ((tickData.nodes && tickData.nodes.length > 0) || (tickData.edges && tickData.edges.length > 0)) {
              update3DGraph(tickData.nodes || [], tickData.edges || []);
            }
          }
        } catch (err) {
          console.warn('Tick parsing error:', err);
        }
      });

      client.subscribe(`/topic/simulation/${simulationId}/result`, (message) => {
        try {
          const result = JSON.parse(message.body);
          if (result) {
            setFinalResult(result);
            setSimulationStatus(result.status || 'COMPLETED');
            setLatestTick((prev) => ({
              ...(prev || {}),
              metrics: result.metrics || prev?.metrics,
              mainchainRate: result.mainchainRate,
              instantGini: result.finalGiniCoefficient
            }));
          }
        } catch (err) {
          console.warn('Result parsing error:', err);
        }
      });
    };

    client.onStompError = () => setWsStatus('error');
    client.onWebSocketClose = () => setWsStatus('closed');

    client.activate();
    stompClientRef.current = client;

    return () => {
      client.deactivate();
    };
  }, [simulationId, spawnActivityPacket, flashEventEdge, update3DGraph]);

  // Seed initial 3D topology from simulationConfig so completed/historical or starting runs render all N nodes immediately
  useEffect(() => {
    if (!simulationConfig || !sceneRef.current) return;
    if (nodeEntriesRef.current.size === 0) {
      const cfg = simulationConfig;
      const numNodes = Math.max(2, Math.min(50, Number(cfg.nodeCount || cfg.numAgents || cfg.totalNodes || 10)));
      const byzRatio = typeof cfg.byzantineRatio === 'number'
        ? cfg.byzantineRatio
        : (cfg.byzantineBehaviorEnabled ? 0.2 : 0.0);
      const inactiveRatio = typeof cfg.inactiveAgentRatio === 'number' ? cfg.inactiveAgentRatio : 0.0;
      const byzCount = Math.round(numNodes * byzRatio);
      const inactiveCount = Math.min(numNodes - byzCount, Math.round(numNodes * inactiveRatio));

      const initNodes = [];
      for (let i = 0; i < numNodes; i += 1) {
        let role = 'HONEST';
        if (i >= numNodes - byzCount) {
          role = 'BYZANTINE';
        } else if (i >= numNodes - byzCount - inactiveCount) {
          role = 'INACTIVE';
        }
        initNodes.push({
          id: `Agent-${i}`,
          role,
          proposer: i === 0 && role === 'HONEST',
          stake: 120 + i * 35,
          hashPower: 65.0,
          headBlockId: 'BLOCK-00000000',
          mempoolSize: 12,
          partitionId: 0,
          peers: [`Agent-${(i + 1) % numNodes}`, `Agent-${(i + 2) % numNodes}`]
        });
      }

      const initEdges = [];
      for (let i = 0; i < numNodes; i += 1) {
        initEdges.push({ from: `Agent-${i}`, to: `Agent-${(i + 1) % numNodes}` });
        if (numNodes > 3) {
          initEdges.push({ from: `Agent-${i}`, to: `Agent-${(i + 2) % numNodes}` });
        }
      }

      update3DGraph(initNodes, initEdges);
    }
  }, [simulationConfig, update3DGraph]);

  // --- 8. RAYCASTER CLICK TO INSPECT AGENT ---
  const handleCanvasClick = (e) => {
    const container = mountRef.current;
    const camera = cameraRef.current;
    if (!container || !camera) return;

    const rect = container.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / container.clientWidth) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / container.clientHeight) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, camera);

    const hitMeshes = [];
    nodeEntriesRef.current.forEach((entry) => {
      if (entry.hitMesh) hitMeshes.push(entry.hitMesh);
    });

    const intersects = raycasterRef.current.intersectObjects(hitMeshes, false);

    if (intersects.length > 0) {
      const hitObj = intersects[0].object;
      const nodeId = hitObj.userData.nodeId;
      const nodeEntry = nodeEntriesRef.current.get(nodeId);
      if (nodeEntry) {
        setSelectedNode(nodeEntry.data);
      }
    }
  };

  const resetCamera = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(0, 10, 24);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  const progressPercent = latestTick
    ? Math.min(
        100,
        Number(latestTick.progress || 0) * 100 ||
          (Number(latestTick.currentTick || 0) / Math.max(1, simulationConfig?.simulationTicks || 10)) * 100
      )
    : 0;

  const selectedVisualType = selectedNode ? resolveNodeVisualType(selectedNode) : 'HONEST';

  return (
    <div className="agent-viewport-container">
      {/* 3D WEBGL STAGE CANVAS */}
      <div
        className="agent-canvas"
        ref={mountRef}
        onClick={handleCanvasClick}
        title="Click on any cosmic galaxy to inspect the agent"
      />

      {/* TOP TELEMETRY HUD STRIP */}
      <header className="agent-top-hud">
        <div className="hud-group">
          <div className="hud-metric">
            <span className="hud-label">SIMULATION ID</span>
            <span className="hud-value highlight">
              {simulationId ? simulationId.slice(0, 8) : 'STANDBY'}
            </span>
          </div>

          <div className="hud-metric">
            <span className="hud-label">CONSENSUS</span>
            <span className="hud-value">{simulationConfig?.consensusType || 'PoW'}</span>
          </div>

          <div className="hud-metric">
            <span className="hud-label">TOPOLOGY</span>
            <span className="hud-value">{simulationConfig?.networkTopology || 'Erdos-Renyi'}</span>
          </div>

          <div className="hud-progress-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.52rem', color: 'rgba(0,255,255,0.7)' }}>
              <span>PROGRESS</span>
              <span>
                {latestTick ? `TICK ${latestTick.currentTick}/${latestTick.totalTicks || simulationConfig?.simulationTicks || 10}` : 'STANDBY'}
              </span>
            </div>
            <div className="hud-progress-bar">
              <div className="hud-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>

        <div className="hud-group">
          <div className="hud-metric">
            <span className="hud-label">MAINCHAIN RATE (μ)</span>
            <span className="hud-value">
              {latestTick?.mainchainRate != null ? `${(latestTick.mainchainRate * 100).toFixed(1)}%` : '100%'}
            </span>
          </div>

          <div className="hud-metric">
            <span className="hud-label">BRANCHING (F)</span>
            <span className="hud-value">
              {latestTick?.metrics?.branchingRatio != null ? latestTick.metrics.branchingRatio.toFixed(3) : '0.000'}
            </span>
          </div>

          <div className="hud-metric">
            <span className="hud-label">GINI INDEX</span>
            <span className="hud-value">
              {latestTick?.instantGini != null ? latestTick.instantGini.toFixed(3) : '0.000'}
            </span>
          </div>

          <div className="hud-metric">
            <span className="hud-label">STATUS</span>
            <span className={`hud-value ${simulationStatus === 'FAILED' ? 'warning' : 'highlight'}`}>
              ● {simulationStatus}
            </span>
          </div>
        </div>
      </header>

      {/* RIGHT ACTIVITY NARRATIVE STREAM */}
      <aside className="agent-activity-panel">
        <div className="panel-header">
          <span className="panel-title">LIVE AGENT TELEMETRY</span>
          <span className="panel-badge">{wsStatus.toUpperCase()}</span>
        </div>

        <div className="activity-list">
          {activityLogs.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.58rem' }}>
              Waiting for live telemetry stream...<br />
              Packets, block proposals and attacks stream in real time.
            </div>
          ) : (
            activityLogs.map((log) => (
              <div key={log.key} className={`activity-item type-${log.type}`}>
                <div className="activity-meta">
                  <span className="activity-tag">TICK {log.tick}</span>
                  <span>•</span>
                  <span>{log.fromId}</span>
                  {log.toId && <span>→ {log.toId}</span>}
                </div>
                <div>{log.detail || log.type}</div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* NODE INSPECTOR CARD (LEFT OVERLAY ON CLICK) */}
      {selectedNode && (
        <div className="node-inspector-card">
          <div className="inspector-header">
            <div className="inspector-title">
              <span>{selectedNode.id}</span>
              <span className={`inspector-role-badge ${selectedVisualType}`}>
                {selectedVisualType === 'BYZANTINE'
                  ? 'CRIMSON GALAXY • BYZANTINE'
                  : selectedVisualType === 'INACTIVE'
                    ? 'SILVER GALAXY • INACTIVE'
                    : selectedVisualType === 'PROPOSER'
                      ? 'GOLDEN GALAXY • PROPOSER'
                      : 'COSMIC GALAXY • HONEST'}
              </span>
            </div>
            <button type="button" className="inspector-close" onClick={() => setSelectedNode(null)}>✕</button>
          </div>

          <div className="inspector-body">
            <div className="inspector-row">
              <span className="inspector-label">CURRENT ACTIVITY</span>
              <span
                className="inspector-val"
                style={{
                  color: selectedVisualType === 'PROPOSER'
                    ? '#facc15'
                    : selectedVisualType === 'BYZANTINE'
                      ? '#ef4444'
                      : selectedVisualType === 'INACTIVE'
                        ? '#cbd5e1'
                        : '#38bdf8'
                }}
              >
                {selectedVisualType === 'PROPOSER' ? 'PROPOSING BLOCK (SLOT PROPOSER)' : (selectedNode.currentAction || 'VALIDATING')}
              </span>
            </div>

            <div className="inspector-row">
              <span className="inspector-label">STAKE / BALANCE</span>
              <span className="inspector-val">{(selectedNode.stake || 0).toFixed(2)} CHN</span>
            </div>

            <div className="inspector-row">
              <span className="inspector-label">HASH POWER</span>
              <span className="inspector-val">{(selectedNode.hashPower || 0).toFixed(1)} MH/s</span>
            </div>

            <div className="inspector-row">
              <span className="inspector-label">CANONICAL HEAD</span>
              <span className="inspector-val">{selectedNode.headBlockId || 'GENESIS'}</span>
            </div>

            <div className="inspector-row">
              <span className="inspector-label">MEMPOOL SIZE</span>
              <span className="inspector-val">{selectedNode.mempoolSize ?? 0} txs</span>
            </div>

            <div className="inspector-row">
              <span className="inspector-label">PARTITION ID</span>
              <span className="inspector-val">Group {selectedNode.partitionId ?? 0}</span>
            </div>

            <div className="inspector-peers">
              <span className="inspector-label">CONNECTED PEERS ({selectedNode.peers?.length || 0}):</span>
              <div className="peers-tag-cloud">
                {selectedNode.peers && selectedNode.peers.length > 0 ? (
                  selectedNode.peers.map((peer) => (
                    <span key={peer} className="peer-chip">{peer}</span>
                  ))
                ) : (
                  <span style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.4)' }}>No peer connections</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM LEFT STANDALONE PDF DOWNLOAD BUTTON + BOTTOM LEGEND & CONTROLS */}
      <div className="agent-bottom-stack">
        {finalResult && simulationStatus === 'COMPLETED' && (
          <button
            type="button"
            className="agent-pdf-download-btn"
            onClick={() => downloadSimulationPdfReport({
              result: finalResult,
              config: simulationConfig,
              runMeta: { id: simulationId }
            })}
            title="Download detailed PDF report (CHAIN55_Simulation.pdf)"
          >
            Download PDF
          </button>
        )}

        <footer className="agent-bottom-hud">
          <div className="legend-bar">
            <div className="legend-item" title="Deep Cosmic Blue spiral galaxy">
              <span className="legend-galaxy-icon honest" />
              <span>Honest Agent (Cosmic Blue Galaxy)</span>
            </div>
            <div className="legend-item" title="Radiant Yellow/Gold spiral galaxy">
              <span className="legend-galaxy-icon proposer" />
              <span>Slot Proposer (Golden Galaxy)</span>
            </div>
            <div className="legend-item" title="Intense Crimson Red / Violet-Purple spiral galaxy">
              <span className="legend-galaxy-icon byzantine" />
              <span>Byzantine Node (Crimson-Violet Galaxy)</span>
            </div>
            <div className="legend-item" title="Pale White / Silver dimmed spiral galaxy">
              <span className="legend-galaxy-icon inactive" />
              <span>Inactive / Offline (Silver Galaxy)</span>
            </div>
            <div className="legend-item" title="Wave-modulated P2P link carrying animated message pulses">
              <span className="legend-edge-icon" />
              <span>P2P Wave Link</span>
            </div>
          </div>

          <div className="hud-actions">
            <button
              type="button"
              className="hud-btn"
              onClick={() => setAutoOrbit(!autoOrbit)}
              title="Toggle subtle automatic camera orbit"
            >
              ORBIT: {autoOrbit ? 'ON' : 'OFF'}
            </button>

            <button
              type="button"
              className="hud-btn"
              onClick={resetCamera}
              title="Reset 3D camera to default position"
            >
              RESET VIEW
            </button>

            <button
              type="button"
              className="hud-btn"
              onClick={() => navigate('/simulation')}
              title="Configure and run another simulation"
            >
              ← SIMULATION
            </button>

            <button
              type="button"
              className="hud-btn primary"
              onClick={() => navigate('/dashboard')}
              title="Jump to Dashboard full analytics"
            >
              DASHBOARD ↗
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
