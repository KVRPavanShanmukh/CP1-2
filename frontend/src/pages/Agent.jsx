import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client/dist/sockjs';
import { simulationApi, WS_BASE } from '../services/api';
import {
  downloadSimulationPdfReport,
  triggerAutoPdfDownloadOnce
} from '../utils/simulationPdfReport';
import './Agent.css';

// ═══════════════════════════════════════════════════════════════
// PROCEDURAL CANVAS TEXTURE GENERATORS (SINGLETON CACHES)
// ═══════════════════════════════════════════════════════════════
const getGalacticCoreTexture = (() => {
  let texture = null;
  return () => {
    if (texture) return texture;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(0.2, 'rgba(56, 189, 248, 0.95)');
    g.addColorStop(0.55, 'rgba(14, 165, 233, 0.4)');
    g.addColorStop(0.85, 'rgba(99, 102, 241, 0.15)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    texture = new THREE.CanvasTexture(canvas);
    return texture;
  };
})();

const getQuasarCoreTexture = (() => {
  let texture = null;
  return () => {
    if (texture) return texture;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(0.25, 'rgba(255, 215, 0, 0.98)');
    g.addColorStop(0.55, 'rgba(245, 158, 11, 0.5)');
    g.addColorStop(0.85, 'rgba(234, 88, 12, 0.2)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    texture = new THREE.CanvasTexture(canvas);
    return texture;
  };
})();

const getDormantCoreTexture = (() => {
  let texture = null;
  return () => {
    if (texture) return texture;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(203, 213, 225, 0.8)');
    g.addColorStop(0.3, 'rgba(100, 116, 139, 0.45)');
    g.addColorStop(0.7, 'rgba(51, 65, 85, 0.15)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    texture = new THREE.CanvasTexture(canvas);
    return texture;
  };
})();

const getByzantineCoreTexture = (() => {
  let texture = null;
  return () => {
    if (texture) return texture;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(0.2, 'rgba(255, 34, 51, 0.95)');
    g.addColorStop(0.55, 'rgba(220, 38, 38, 0.55)');
    g.addColorStop(0.85, 'rgba(153, 27, 27, 0.25)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    texture = new THREE.CanvasTexture(canvas);
    return texture;
  };
})();

export default function Agent() {
  const navigate = useNavigate();
  const location = useLocation();

  // Route / state parameters
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
  const nodeEntriesRef = useRef(new Map()); // Map<nodeId, NodeEntry>
  const edgeEntriesRef = useRef(new Map()); // Map<edgeKey, EdgeEntry>
  const packetsRef = useRef([]); // Active traveling 3D packets
  const nodePositionsRef = useRef(new Map());
  const stompClientRef = useRef(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

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
              if (sessionStorage.getItem('autoPdfPendingRunId') === simulationId) {
                triggerAutoPdfDownloadOnce({
                  result: data.result,
                  config: data.configuration || simulationConfig
                });
              }
            }
          }
        } catch (e) {
          console.warn('Could not load specified simulation:', e);
        }
      } else {
        // Fetch newest run from history so the 3D scene is never blank
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

    resolveSim();
    return () => { cancelled = true; };
  }, [simulationId]);

  // --- 2. WEBSOCKET / STOMP LIVE STREAM ---
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

      // Subscribe to real-time ticks
      client.subscribe(`/topic/simulation/${simulationId}`, (message) => {
        try {
          const tickData = JSON.parse(message.body);
          if (tickData) {
            setLatestTick(tickData);
            setSimulationStatus('RUNNING');

            // Append events to activity logs
            if (tickData.events && tickData.events.length > 0) {
              setActivityLogs((prev) => [
                ...tickData.events.map((ev, i) => ({
                  ...ev,
                  key: `${tickData.currentTick}-${i}-${Date.now()}`,
                  tick: tickData.currentTick
                })),
                ...prev
              ].slice(0, 120));

              // Spawn 3D edge traveling packets and flash active edges
              tickData.events.forEach((ev) => {
                spawnActivityPacket(ev);
                flashEventEdge(ev);
              });
            }

            // Update or generate 3D node positions & meshes (ensures endpoints always have nodes)
            if ((tickData.nodes && tickData.nodes.length > 0) || (tickData.edges && tickData.edges.length > 0)) {
              update3DGraph(tickData.nodes || [], tickData.edges || []);
            }
          }
        } catch (err) {
          console.warn('Tick parsing error:', err);
        }
      });

      // Subscribe to final completion result
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
            if (sessionStorage.getItem('autoPdfPendingRunId') === simulationId) {
              triggerAutoPdfDownloadOnce({
                result,
                config: simulationConfig
              });
            }
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
  }, [simulationId]);

  // --- 3. THREE.JS INITIALIZATION (VANILLA THREE — REACT 19 COMPATIBLE) ---
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // SCENE
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020307);
    scene.fog = new THREE.FogExp2(0x020307, 0.022);
    sceneRef.current = scene;

    // CAMERA
    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 10, 24);
    cameraRef.current = camera;

    // RENDERER
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // CONTROLS
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = autoOrbit;
    controls.autoRotateSpeed = 0.7;
    controls.maxDistance = 60;
    controls.minDistance = 3;
    controlsRef.current = controls;

    // LIGHTING: Cosmic stellar ambience (bright and clear from all camera angles)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.6);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 1.1);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(20, 30, 20);
    scene.add(dirLight);

    const cyanPoint = new THREE.PointLight(0x00e5ff, 4.0, 70);
    cyanPoint.position.set(-18, 14, 12);
    scene.add(cyanPoint);

    const goldPoint = new THREE.PointLight(0xffd700, 3.2, 70);
    goldPoint.position.set(18, -12, 12);
    scene.add(goldPoint);

    const magentaPoint = new THREE.PointLight(0xc084fc, 2.8, 60);
    magentaPoint.position.set(0, 18, -18);
    scene.add(magentaPoint);

    // BACKGROUND CYBER-GRID & STELLAR FIELD
    const gridHelper = new THREE.GridHelper(44, 44, 0x0ea5e9, 0x0f172a);
    gridHelper.position.y = -7.5;
    gridHelper.material.opacity = 0.18;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);

    // Rich cosmic star dust field with circular soft-glow texture (no square artifacts)
    const starCount = 1200;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 80;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 60;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 80;

      // Color tints: blue-white, cyan, gold
      const pick = Math.random();
      if (pick < 0.6) {
        starColors[i * 3] = 0.7; starColors[i * 3 + 1] = 0.9; starColors[i * 3 + 2] = 1.0;
      } else if (pick < 0.85) {
        starColors[i * 3] = 0.2; starColors[i * 3 + 1] = 0.85; starColors[i * 3 + 2] = 1.0;
      } else {
        starColors[i * 3] = 1.0; starColors[i * 3 + 1] = 0.85; starColors[i * 3 + 2] = 0.3;
      }
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.55,
      map: getGalacticCoreTexture(),
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const starMesh = new THREE.Points(starGeo, starMat);
    scene.add(starMesh);

    // RESIZE LISTENER
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // ANIMATION LOOP (60 FPS OPTIMIZED)
    let animId;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Update camera orbit
      if (controlsRef.current) {
        controlsRef.current.autoRotate = autoOrbit;
        controlsRef.current.update();
      }

      // Rotate cosmic starry field
      starMesh.rotation.y = time * 0.012;

      // ANIMATE AGENT VISUALS (Galaxies, Quasars, Asteroids)
      nodeEntriesRef.current.forEach((entry) => {
        // Swirling spiral galaxies (Milky Ways & Quasars)
        if (entry.galaxyPoints) {
          entry.galaxyPoints.rotation.y += entry.spinSpeed * delta;
        }

        // Quasar shockwave ring expansion
        if (entry.pulseRing) {
          entry.pulseRing.rotation.z += delta * 1.8;
          const cycle = (time * 1.6) % 1.0; // 0 -> 1
          const scale = 1.0 + cycle * 0.9;
          entry.pulseRing.scale.set(scale, scale, scale);
          if (entry.pulseRing.material) {
            entry.pulseRing.material.opacity = Math.max(0, (1.0 - cycle) * 0.9);
          }
        }

        // Byzantine Meteoroid / Asteroid tumbling & molten crack glow
        if (entry.asteroidMesh) {
          entry.asteroidMesh.rotation.x += delta * 1.3;
          entry.asteroidMesh.rotation.y += delta * 1.1;
          entry.asteroidMesh.rotation.z += delta * 0.8;

          // Jitter/pulse if under attack
          if (entry.isAttacking) {
            const jitter = Math.sin(time * 30) * 0.08;
            entry.asteroidMesh.position.x = jitter;
            if (entry.asteroidMesh.material) {
              entry.asteroidMesh.material.emissiveIntensity = 1.5 + Math.sin(time * 15) * 0.8;
            }
          }
        }

        // Byzantine floating embers
        if (entry.embersPoints) {
          entry.embersPoints.rotation.y -= delta * 0.8;
        }
      });

      // ANIMATE THICK P2P CONNECTIONS (Flash decay)
      edgeEntriesRef.current.forEach((edge) => {
        if (edge.flashTimer > 0) {
          edge.flashTimer -= delta * 1.8;
          const t = Math.max(0, edge.flashTimer);
          // Lerp emissive color back to base electric cyan
          edge.mesh.material.emissive.copy(edge.baseEmissive).lerp(edge.flashEmissive, t);
          edge.mesh.material.emissiveIntensity = THREE.MathUtils.lerp(0.8, 2.2, t);
          edge.mesh.material.opacity = THREE.MathUtils.lerp(0.65, 0.95, t);
        }
      });

      // ANIMATE ACTIVE TRAVELING PACKETS
      const activePackets = packetsRef.current;
      for (let i = activePackets.length - 1; i >= 0; i--) {
        const p = activePackets[i];
        p.progress += delta * 1.8; // ~0.55s flight time
        if (p.progress >= 1.0) {
          scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          p.mesh.material.dispose();
          activePackets.splice(i, 1);
        } else {
          // Lerp along edge from startPos to endPos
          p.mesh.position.lerpVectors(p.startPos, p.endPos, p.progress);
          // Beautiful parabolic 3D arc above the plane
          p.mesh.position.y += Math.sin(p.progress * Math.PI) * 1.0;
          p.mesh.material.opacity = Math.sin(p.progress * Math.PI);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // CLEANUP
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update auto-orbit setting dynamically
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoOrbit;
    }
  }, [autoOrbit]);

  // Ensure 3D scene always renders nodes & topology even for completed/historical simulations
  useEffect(() => {
    if (!simulationConfig || !sceneRef.current) return;
    if (nodeEntriesRef.current.size === 0) {
      const cfg = simulationConfig;
      const numNodes = Math.max(4, Math.min(50, cfg.nodeCount || cfg.numAgents || cfg.totalNodes || 10));
      const byzRatio = typeof cfg.byzantineRatio === 'number' ? cfg.byzantineRatio : (cfg.byzantineBehaviorEnabled ? 0.2 : 0.0);
      const byzCount = Math.round(numNodes * byzRatio);

      const initNodes = [];
      for (let i = 0; i < numNodes; i++) {
        const isByz = i >= (numNodes - byzCount);
        initNodes.push({
          id: `Agent-${i}`,
          role: isByz ? 'BYZANTINE' : 'HONEST',
          isProposer: i === 0,
          stake: 120 + i * 35,
          hashPower: 65.0,
          headBlockId: 'BLOCK-00000000',
          mempoolSize: 12,
          partitionId: 0,
          peers: [`Agent-${(i + 1) % numNodes}`, `Agent-${(i + 2) % numNodes}`]
        });
      }

      const initEdges = [];
      for (let i = 0; i < numNodes; i++) {
        initEdges.push({ from: `Agent-${i}`, to: `Agent-${(i + 1) % numNodes}` });
        if (numNodes > 3) {
          initEdges.push({ from: `Agent-${i}`, to: `Agent-${(i + 2) % numNodes}` });
        }
      }

      update3DGraph(initNodes, initEdges);
    }
  }, [simulationConfig]);

  // --- 4. PROCEDURAL GALAXY MESH BUILDER (TASK 1B & CORE GLOW UPGRADE) ---
  const createGalaxyObject = useCallback((node, isProposer, isInactive) => {
    const group = new THREE.Group();

    // Tilt galaxy slightly on a unique cosmic orbital plane
    const tiltX = (Math.random() - 0.5) * 0.8 + 0.4;
    const tiltZ = (Math.random() - 0.5) * 0.8;
    group.rotation.set(tiltX, 0, tiltZ);

    const particleCount = isProposer ? 320 : (isInactive ? 120 : 220);
    const arms = isProposer ? 3 : 2;

    // Safe scaling formula to guarantee visibility under PoW / high Gini
    const rawVal = Number(node?.stake ?? node?.balance ?? node?.hashPower ?? 100);
    const rawScale = Number.isFinite(rawVal) && rawVal > 0 ? 1.0 + (rawVal / 2500) : 1.0;
    const safeScale = Number.isFinite(rawScale) ? Math.max(0.95, Math.min(1.65, rawScale)) : 1.0;
    const radius = (isProposer ? 1.4 : 1.1) * safeScale;

    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const armIdx = i % arms;
      const baseAngle = (armIdx * 2 * Math.PI) / arms;
      const distRatio = Math.pow(Math.random(), 1.35); // Concentrate towards core
      const r = distRatio * radius;
      const spiralAngle = baseAngle + r * 2.7 + (Math.random() - 0.5) * 0.35;

      const px = r * Math.cos(spiralAngle);
      const pz = r * Math.sin(spiralAngle);
      const py = (Math.random() - 0.5) * 0.16 * (1.1 - distRatio);

      positions[i * 3] = px;
      positions[i * 3 + 1] = py;
      positions[i * 3 + 2] = pz;

      // Color spectrum
      if (isProposer) {
        // Golden Quasar: White core -> Gold -> Bright Amber -> Orange
        const c1 = new THREE.Color(0xffffff);
        const c2 = new THREE.Color(0xfbbf24);
        const c3 = new THREE.Color(0xf59e0b);
        const finalColor = distRatio < 0.3 ? c1.lerp(c2, distRatio / 0.3) : c2.lerp(c3, (distRatio - 0.3) / 0.7);
        colors[i * 3] = finalColor.r;
        colors[i * 3 + 1] = finalColor.g;
        colors[i * 3 + 2] = finalColor.b;
      } else if (isInactive) {
        // Inactive / Offline Node: cool silver-lavender / slate-blue
        const c1 = new THREE.Color(0xcbd5e1);
        const c2 = new THREE.Color(0x94a3b8);
        const finalColor = c1.lerp(c2, distRatio);
        colors[i * 3] = finalColor.r;
        colors[i * 3 + 1] = finalColor.g;
        colors[i * 3 + 2] = finalColor.b;
      } else {
        // Honest Galaxy: Hot White/Cyan Core -> Electric Ice-Cyan -> Cosmic Violet
        const c1 = new THREE.Color(0xffffff);
        const c2 = new THREE.Color(0x38bdf8);
        const c3 = new THREE.Color(0x818cf8);
        const finalColor = distRatio < 0.25 ? c1.lerp(c2, distRatio / 0.25) : c2.lerp(c3, (distRatio - 0.25) / 0.75);
        colors[i * 3] = finalColor.r;
        colors[i * 3 + 1] = finalColor.g;
        colors[i * 3 + 2] = finalColor.b;
      }
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const pMat = new THREE.PointsMaterial({
      size: isProposer ? 0.14 : (isInactive ? 0.10 : 0.12),
      vertexColors: true,
      transparent: true,
      opacity: isInactive ? 0.75 : 0.92, // Visible dim spiral arms for inactive >= 0.75
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const galaxyPoints = new THREE.Points(geo, pMat);
    group.add(galaxyPoints);

    // Glowing Solid Core Mesh (CRITICAL: prevents edge-on disappearing, radius >= 0.50)
    const coreRadius = Math.max(0.50, (isProposer ? 0.60 : (isInactive ? 0.50 : 0.52)) * safeScale);
    const coreGeo = new THREE.SphereGeometry(coreRadius, 16, 16);
    let coreColor = 0x38bdf8;
    let coreOpacity = 0.98;
    if (isProposer) {
      coreColor = 0xfbbf24; // Bright golden core
    } else if (isInactive) {
      coreColor = 0xcbd5e1; // Bright cool silver-lavender
      coreOpacity = 0.78;
    }
    const solidCoreMat = new THREE.MeshBasicMaterial({
      color: coreColor,
      transparent: true,
      opacity: coreOpacity
    });
    const solidCoreMesh = new THREE.Mesh(coreGeo, solidCoreMat);
    group.add(solidCoreMesh);

    // Soft Radial Glow Sprite
    const coreMat = new THREE.SpriteMaterial({
      map: isProposer ? getQuasarCoreTexture() : (isInactive ? getDormantCoreTexture() : getGalacticCoreTexture()),
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: isInactive ? 0.75 : 0.98
    });
    const coreSprite = new THREE.Sprite(coreMat);
    const spriteSize = (isProposer ? 1.8 : (isInactive ? 0.9 : 1.25)) * safeScale;
    coreSprite.scale.set(spriteSize, spriteSize, 1);
    group.add(coreSprite);

    // Current Slot Proposer: Expanding Golden Shockwave Pulse Ring
    let pulseRing = null;
    if (isProposer) {
      const ringGeo = new THREE.RingGeometry(0.85, 1.15, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending
      });
      pulseRing = new THREE.Mesh(ringGeo, ringMat);
      pulseRing.rotation.x = Math.PI / 2;
      group.add(pulseRing);
    }

    return { group, galaxyPoints, solidCoreMesh, coreSprite, pulseRing, spinSpeed: isProposer ? 0.9 : (isInactive ? 0.15 : 0.5) };
  }, []);

  // --- 5. PROCEDURAL CRAGGY METEOROID / ASTEROID BUILDER (TASK 1B & HIGH-CONTRAST BYZANTINE) ---
  const createAsteroidObject = useCallback((node) => {
    const group = new THREE.Group();

    // Safe scaling factor to guarantee visibility
    const rawVal = Number(node?.stake ?? node?.balance ?? node?.hashPower ?? 100);
    const rawScale = Number.isFinite(rawVal) && rawVal > 0 ? 1.0 + (rawVal / 2500) : 1.0;
    const safeScale = Number.isFinite(rawScale) ? Math.max(0.95, Math.min(1.65, rawScale)) : 1.0;

    // Glowing unlit core sphere (radius >= 0.50, prevents edge-on disappearing)
    const coreGeo = new THREE.SphereGeometry(Math.max(0.50, 0.52 * safeScale), 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xff1744, transparent: true, opacity: 0.88 });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    group.add(coreMesh);

    // Displaced rocky icosahedron geometry
    const geo = new THREE.IcosahedronGeometry(0.60 * safeScale, 2);
    const posAttr = geo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const vz = posAttr.getZ(i);
      const len = Math.sqrt(vx * vx + vy * vy + vz * vz);
      const nx = vx / len;
      const ny = vy / len;
      const nz = vz / len;

      // Realistic crater ridges & jagged crags
      const crags = 1.0 +
        (Math.sin(nx * 7.0) * Math.cos(ny * 7.0) * Math.sin(nz * 7.0)) * 0.22 +
        (Math.sin(nx * 14.0 + ny * 10.0)) * 0.08 +
        (Math.random() - 0.5) * 0.05;

      posAttr.setXYZ(i, vx * crags, vy * crags, vz * crags);
    }
    geo.computeVertexNormals();

    // Dark volcanic craggy rock with glowing molten crimson-orange emissive material
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x2d0d15,
      roughness: 0.65,
      metalness: 0.4,
      emissive: 0xff2233,
      emissiveIntensity: 0.95,
      flatShading: true
    });
    const asteroidMesh = new THREE.Mesh(geo, rockMat);
    group.add(asteroidMesh);

    // Molten lava crack wireframe overlay
    const crackMat = new THREE.MeshBasicMaterial({
      color: 0xff5533,
      wireframe: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });
    const crackMesh = new THREE.Mesh(geo.clone(), crackMat);
    crackMesh.scale.set(1.02, 1.02, 1.02);
    asteroidMesh.add(crackMesh);

    // Bright crimson glow sprite/aura so it is unmistakably visible against black space
    const auraMat = new THREE.SpriteMaterial({
      map: getByzantineCoreTexture(),
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.85
    });
    const auraSprite = new THREE.Sprite(auraMat);
    const auraSize = 1.45 * safeScale;
    auraSprite.scale.set(auraSize, auraSize, 1);
    group.add(auraSprite);

    // Surrounding floating volcanic embers
    const emberCount = 36;
    const emberGeo = new THREE.BufferGeometry();
    const emberPos = new Float32Array(emberCount * 3);
    for (let i = 0; i < emberCount; i++) {
      const r = (0.8 + Math.random() * 0.5) * safeScale;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      emberPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      emberPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      emberPos[i * 3 + 2] = r * Math.cos(phi);
    }
    emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
    const emberMat = new THREE.PointsMaterial({
      color: 0xff4400,
      size: 0.08,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    const embersPoints = new THREE.Points(emberGeo, emberMat);
    group.add(embersPoints);

    return { group, asteroidMesh, auraSprite, embersPoints };
  }, []);

  // --- 6. 3D GRAPH BUILDER & TOPOLOGY POSITIONING (ZERO EMPTY LINE ENDS) ---
  const update3DGraph = useCallback((rawNodes = [], rawEdges = []) => {
    const scene = sceneRef.current;
    if (!scene) return;

    const positions = nodePositionsRef.current;
    const nodeEntries = nodeEntriesRef.current;
    const edgeEntries = edgeEntriesRef.current;

    // 1. Gather UNION of all node IDs from nodes, edges (from/to, source/target), and previous entries
    const allNodeIds = new Set();
    const nodeMap = new Map();

    (rawNodes || []).forEach((n) => {
      if (n && n.id) {
        allNodeIds.add(n.id);
        nodeMap.set(n.id, n);
      }
    });

    (rawEdges || []).forEach((e) => {
      const f = e.from || e.source;
      const t = e.to || e.target;
      if (f) allNodeIds.add(f);
      if (t) allNodeIds.add(t);
    });

    // Keep any previously registered nodes in the union
    nodeEntries.forEach((_, id) => allNodeIds.add(id));
    positions.forEach((_, id) => allNodeIds.add(id));

    if (allNodeIds.size === 0) return;

    // Deterministic natural sort (Agent-0, Agent-1, ..., Agent-9)
    const sortedNodeIds = Array.from(allNodeIds).sort((a, b) => 
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
    const totalCount = sortedNodeIds.length;

    // Check if network partition is active
    const hasPartition = (rawNodes || []).some((n) => (n.partitionId || 0) > 0);

    // 2. Compute or maintain 3D node positions (Guaranteed position for every single node ID)
    sortedNodeIds.forEach((nodeId, i) => {
      if (!positions.has(nodeId)) {
        const node = nodeMap.get(nodeId);
        let x, y, z;
        if (hasPartition) {
          const isGroupB = (node?.partitionId || 0) === 1;
          const clusterCenterX = isGroupB ? 7.0 : -7.0;
          const angle = (i / Math.max(1, totalCount / 2)) * Math.PI * 2;
          const radius = 3.5 + (i % 3) * 0.6;
          x = clusterCenterX + Math.cos(angle) * radius;
          y = (Math.sin(angle) * radius * 0.7) + (Math.sin(i) * 1.5);
          z = (Math.sin(angle * 1.5) * 2.5) + (Math.cos(i) * 1.5);
        } else {
          // Elegant spherical Fibonacci spiral distribution
          const phi = Math.acos(1 - 2 * (i + 0.5) / totalCount);
          const theta = Math.PI * (1 + 5 ** 0.5) * (i + 0.5);
          const r = 8.0;
          x = r * Math.sin(phi) * Math.cos(theta);
          y = r * Math.sin(phi) * Math.sin(theta);
          z = r * Math.cos(phi);
        }
        positions.set(nodeId, new THREE.Vector3(x, y, z));
      }
    });

    // 3. BUILD OR UPDATE 3D NODES (Guaranteed visible mesh for every node ID)
    sortedNodeIds.forEach((nodeId) => {
      let nodeData = nodeMap.get(nodeId);
      if (!nodeData) {
        const prevEntry = nodeEntries.get(nodeId);
        if (prevEntry?.data) {
          nodeData = prevEntry.data;
        } else {
          nodeData = {
            id: nodeId,
            role: 'HONEST',
            isProposer: false,
            stake: 100,
            hashPower: 50,
            headBlockId: 'GENESIS',
            mempoolSize: 0,
            partitionId: 0,
            peers: []
          };
        }
      }

      const pos = positions.get(nodeId);
      let entry = nodeEntries.get(nodeId);

      const isByzantine = nodeData.role === 'BYZANTINE';
      const isProposer = Boolean(nodeData.isProposer);
      const isInactive = nodeData.role === 'INACTIVE';
      const currentVisualType = isByzantine ? 'ASTEROID' : (isProposer ? 'QUASAR' : (isInactive ? 'DORMANT' : 'GALAXY'));

      if (!entry || entry.visualType !== currentVisualType) {
        if (entry) {
          scene.remove(entry.group);
          if (entry.group) {
            entry.group.traverse((obj) => {
              if (obj.geometry) obj.geometry.dispose();
              if (obj.material) {
                if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
                else obj.material.dispose();
              }
            });
          }
        }

        let visualObj;
        if (isByzantine) {
          visualObj = createAsteroidObject(nodeData);
        } else {
          visualObj = createGalaxyObject(nodeData, isProposer, isInactive);
        }

        // Add invisible hit-sphere for reliable raycaster click-to-inspect
        const hitGeo = new THREE.SphereGeometry(1.3, 10, 10);
        const hitMat = new THREE.MeshBasicMaterial({ visible: false });
        const hitMesh = new THREE.Mesh(hitGeo, hitMat);
        hitMesh.userData = { nodeId };
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
        if (!entry.group.parent) {
          scene.add(entry.group);
        }
        entry.group.visible = true;
        entry.group.position.copy(pos);
      }
    });

    // 4. BUILD OR UPDATE THICK P2P CYLINDER CONNECTIONS (Coordinates match exact node Vector3)
    const edgesToRender = rawEdges || [];
    if (edgesToRender.length > 0) {
      const currentEdgeKeys = new Set();

      edgesToRender.forEach((edge) => {
        const fromId = edge.from || edge.source;
        const toId = edge.to || edge.target;
        if (!fromId || !toId) return;

        const p1 = positions.get(fromId);
        const p2 = positions.get(toId);
        if (!p1 || !p2) return;

        const edgeKey = fromId < toId ? `${fromId}__${toId}` : `${toId}__${fromId}`;
        currentEdgeKeys.add(edgeKey);

        const dist = p1.distanceTo(p2);
        let edgeEntry = edgeEntries.get(edgeKey);
        if (!edgeEntry) {
          // Real geometric thickness: Cylinder with radius 0.045
          const cylGeo = new THREE.CylinderGeometry(0.045, 0.045, 1, 6, 1);
          cylGeo.translate(0, 0.5, 0); // Origin at base for clean positioning
          cylGeo.rotateX(Math.PI / 2); // Align with Z

          // Base high-contrast luminous electric cyan/aqua (#38bdf8 / #22d3ee)
          const baseColor = new THREE.Color(0x38bdf8);
          const baseEmissive = new THREE.Color(0x0ea5e9);
          const cylMat = new THREE.MeshStandardMaterial({
            color: baseColor,
            emissive: baseEmissive,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.65,
            roughness: 0.2,
            metalness: 0.3
          });

          const cylinder = new THREE.Mesh(cylGeo, cylMat);
          cylinder.position.copy(p1);
          cylinder.lookAt(p2);
          cylinder.scale.set(1, 1, dist);

          scene.add(cylinder);

          edgeEntry = {
            mesh: cylinder,
            baseColor,
            baseEmissive,
            flashEmissive: new THREE.Color(0x0ea5e9),
            flashTimer: 0,
            from: fromId,
            to: toId
          };
          edgeEntries.set(edgeKey, edgeEntry);
        } else {
          // Update orientation if nodes moved
          edgeEntry.mesh.position.copy(p1);
          edgeEntry.mesh.lookAt(p2);
          edgeEntry.mesh.scale.set(1, 1, dist);
        }
      });
    }
  }, [createGalaxyObject, createAsteroidObject]);

  // --- 7. FLASH P2P EDGE ON ACTIVE PACKET / CONSENSUS EVENT (TASK 1A) ---
  const flashEventEdge = useCallback((event) => {
    if (!event) return;

    let flashColorHex = 0x38bdf8;
    if (event.type === 'BLOCK_PROPOSAL' || event.type === 'BLOCK_GOSSIP') {
      flashColorHex = 0xffd700; // Radiant Gold
    } else if (event.type === 'ATTESTATION') {
      flashColorHex = 0x10b981; // Luminous Emerald
    } else if (event.type === 'BYZANTINE_ATTACK') {
      flashColorHex = 0xff0055; // Fiery Crimson
      // Trigger attacking state on node
      const nodeEntry = nodeEntriesRef.current.get(event.fromId);
      if (nodeEntry) {
        nodeEntry.isAttacking = true;
        setTimeout(() => { if (nodeEntry) nodeEntry.isAttacking = false; }, 800);
      }
    } else if (event.type === 'TX_PROPAGATION') {
      flashColorHex = 0xc084fc; // Cosmic Violet
    } else if (event.type === 'PACKET_DROPPED') {
      flashColorHex = 0xf43f5e; // Dropped Burst
    }

    const flashColor = new THREE.Color(flashColorHex);

    // Intensify matching edge(s)
    edgeEntriesRef.current.forEach((edge) => {
      const match = (edge.from === event.fromId && edge.to === event.toId) ||
                    (edge.from === event.toId && edge.to === event.fromId) ||
                    (!event.toId && (edge.from === event.fromId || edge.to === event.fromId));

      if (match) {
        edge.flashEmissive.copy(flashColor);
        edge.flashTimer = 1.0;
      }
    });
  }, []);

  // --- 8. ACTIVITY PACKET ANIMATION SPAWNER ---
  const spawnActivityPacket = useCallback((event) => {
    const scene = sceneRef.current;
    const positions = nodePositionsRef.current;
    if (!scene || !event) return;

    const fromPos = positions.get(event.fromId);
    let toPos = event.toId ? positions.get(event.toId) : null;

    if (!fromPos) return;

    // If toId is empty (e.g. broadcast proposal), choose a peer position
    if (!toPos) {
      const peers = nodeEntriesRef.current.get(event.fromId)?.data?.peers || [];
      if (peers.length > 0) {
        const randomPeer = peers[Math.floor(Math.random() * peers.length)];
        toPos = positions.get(randomPeer);
      }
      if (!toPos) {
        toPos = fromPos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 4, 2, (Math.random() - 0.5) * 4));
      }
    }

    let colorHex = 0x38bdf8;
    let size = 0.20;

    if (event.type === 'BLOCK_PROPOSAL' || event.type === 'BLOCK_GOSSIP') {
      colorHex = 0xffd700; // Gold
      size = 0.26;
    } else if (event.type === 'ATTESTATION') {
      colorHex = 0x10b981; // Emerald
      size = 0.18;
    } else if (event.type === 'TX_PROPAGATION') {
      colorHex = 0xc084fc; // Violet
      size = 0.16;
    } else if (event.type === 'BYZANTINE_ATTACK') {
      colorHex = 0xff0055; // Fiery Crimson
      size = 0.30;
    } else if (event.type === 'PACKET_DROPPED') {
      colorHex = 0xf43f5e;
      size = 0.16;
    }

    const packetGeo = new THREE.SphereGeometry(size, 10, 10);
    const packetMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending
    });
    const packetMesh = new THREE.Mesh(packetGeo, packetMat);
    packetMesh.position.copy(fromPos);
    scene.add(packetMesh);

    packetsRef.current.push({
      mesh: packetMesh,
      startPos: fromPos.clone(),
      endPos: toPos.clone(),
      progress: 0.0,
      color: colorHex
    });
  }, []);

  // --- 9. RAYCASTER CLICK TO INSPECT AGENT ---
  const handleCanvasClick = (e) => {
    const container = mountRef.current;
    const camera = cameraRef.current;
    if (!container || !camera) return;

    const rect = container.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / container.clientWidth) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / container.clientHeight) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, camera);

    // Raycast against all invisible hit-meshes for instant 100% reliable detection
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
    ? Math.min(100, (Number(latestTick.progress || 0) * 100) ||
      (Number(latestTick.currentTick || 0) / Math.max(1, simulationConfig?.simulationTicks || 10)) * 100)
    : 0;

  return (
    <div className="agent-viewport-container">
      {/* 3D WEBGL STAGE CANVAS */}
      <div
        className="agent-canvas"
        ref={mountRef}
        onClick={handleCanvasClick}
        title="Click on any galaxy or asteroid to inspect the node"
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
              <span className={`inspector-role-badge ${selectedNode.role}`}>
                {selectedNode.role === 'BYZANTINE' ? 'CRAGGY METEOROID • BYZANTINE' : (selectedNode.isProposer ? 'QUASAR • PROPOSER' : 'GALAXY • HONEST')}
              </span>
            </div>
            <button className="inspector-close" onClick={() => setSelectedNode(null)}>✕</button>
          </div>

          <div className="inspector-body">
            <div className="inspector-row">
              <span className="inspector-label">CURRENT ACTIVITY</span>
              <span className="inspector-val" style={{ color: selectedNode.isProposer ? '#ffd700' : (selectedNode.role === 'BYZANTINE' ? '#ff0055' : '#00ffff') }}>
                {selectedNode.isProposer ? '⭐ PROPOSING BLOCK (QUASAR)' : (selectedNode.currentAction || 'VALIDATING')}
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

      {/* BOTTOM CONTROLS & HUD LEGEND (TASK 1B) */}
      <footer className="agent-bottom-hud">
        <div className="legend-bar">
          <div className="legend-item" title="Procedural swirling spiral particle galaxy">
            <span className="legend-galaxy-icon honest" />
            <span>Honest Agent (Mini Galaxy)</span>
          </div>
          <div className="legend-item" title="Golden swirling quasar with shockwave pulse ring">
            <span className="legend-galaxy-icon proposer" />
            <span>Slot Proposer (Golden Quasar)</span>
          </div>
          <div className="legend-item" title="Irregular craggy 3D asteroid with volcanic molten cracks">
            <span className="legend-asteroid-icon" />
            <span>Byzantine Node (Meteoroid)</span>
          </div>
          <div className="legend-item" title="Dim low-opacity faded dormant mini-galaxy">
            <span className="legend-galaxy-icon inactive" />
            <span>Inactive / Offline (Nebula)</span>
          </div>
          <div className="legend-item" title="Thick glowing P2P link with active packet flashes">
            <span className="legend-edge-icon" />
            <span>Thick P2P Edge (Cyan/Aqua)</span>
          </div>
        </div>

        <div className="hud-actions">
          <button
            className="hud-btn"
            onClick={() => setAutoOrbit(!autoOrbit)}
            title="Toggle subtle automatic camera orbit"
          >
            ORBIT: {autoOrbit ? 'ON' : 'OFF'}
          </button>

          <button
            className="hud-btn"
            onClick={resetCamera}
            title="Reset 3D camera to default position"
          >
            RESET VIEW
          </button>

          <button
            className="hud-btn"
            onClick={() => navigate('/simulation')}
            title="Configure and run another simulation"
          >
            ← SIMULATION
          </button>

          {finalResult && simulationStatus === 'COMPLETED' && (
            <button
              className="hud-btn"
              onClick={() => downloadSimulationPdfReport({
                result: finalResult,
                config: simulationConfig,
                runMeta: { id: simulationId }
              })}
              title="Download detailed PDF report for this simulation"
            >
              PDF REPORT ↓
            </button>
          )}

          <button
            className="hud-btn primary"
            onClick={() => navigate('/dashboard')}
            title="Jump to Dashboard full analytics"
          >
            DASHBOARD ↗
          </button>
        </div>
      </footer>
    </div>
  );
}
