import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client/dist/sockjs';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import SimulationCursor from '../components/SimulationCursor';

const API_BASE_URL = 'http://localhost:8080/api/simulations';
const WS_URL = 'http://localhost:8080/ws-simulation';

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
        crystalRef.current.scale.setScalar(THREE.MathUtils.lerp(crystalRef.current.scale.x, stateIndex === 5 ? 1 : 0.001, 0.05));
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

// --- MAIN APPLICATION COMPONENT ---
export default function Simulation() {
  const [activeSection, setActiveSection] = useState(0); 
  const [scrollLocked, setScrollLocked] = useState(false);
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
  
  const [formData, setFormData] = useState({
    nodeCount: 10,
    consensusType: 'PoW',
    networkTopology: 'Erdos-Renyi',
    blockGossipLatency: 0.5,
    slotDuration: 1.0
  });

  const [loading, setLoading] = useState(false);
  const [liveTicks, setLiveTicks] = useState([]);
  const [results, setResults] = useState(null);
  const stompClientRef = useRef(null);

  // Wheel Scroll Navigation
  useEffect(() => {
    const handleWheel = (e) => {
      if (scrollLocked) return;
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
  }, [activeSection, scrollLocked]);

  const connectWebSocket = (simulationId) => {
    if (stompClientRef.current) stompClientRef.current.deactivate();
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      reconnectDelay: 5000,
    });
    client.onConnect = () => {
      client.subscribe(`/topic/simulation/${simulationId}`, (message) => {
        const tick = JSON.parse(message.body);
        setLiveTicks(prev => [...prev, tick]);
        
        // Auto-advance scenes if user hasn't manually overridden it
        if (tick.currentTick === 2 && activeSection < 2) setActiveSection(2);
        if (tick.currentTick === 5 && activeSection < 3) setActiveSection(3);
        if (tick.currentTick === 8 && activeSection < 4) setActiveSection(4);
      });
      client.subscribe(`/topic/simulation/${simulationId}/result`, (message) => {
        const result = JSON.parse(message.body);
        setResults(result);
        setActiveSection(5); 
        setLoading(false);
      });
    };
    client.activate();
    stompClientRef.current = client;
  };

  useEffect(() => {
    return () => {
      if (stompClientRef.current) stompClientRef.current.deactivate();
    };
  }, []);

  const handleStartSimulation = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setLiveTicks([]);
    setResults(null);
    setActiveSection(1); 
    
    try {
      const res = await axios.post(`${API_BASE_URL}/start`, formData);
      connectWebSocket(res.data.id);
    } catch (error) {
      console.error('Failed to start simulation', error);
      setLoading(false);
      setActiveSection(0);
    }
  };

  const latestTick = liveTicks.length > 0 ? liveTicks[liveTicks.length - 1] : null;
  const progressPercent = latestTick ? (latestTick.currentTick / 10) * 100 : 0; 



  return (
    <div className="immersive-shell" style={{ '--dynamic-accent': currentAccent }}>
      <SimulationCursor activeSection={activeSection} />
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

      {/* HEADER */}
      <header className="minimal-header">
        <div className="header-left">
          <div className="monogram">S</div>
          <div>
            <div>SIMULATION LAB / DISTRIBUTED SYSTEMS</div>
            <div style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>CHAIN55 NETWORK ENGINE</div>
          </div>
        </div>
        <div className="header-right">
          <div>ΓùÅ WEBSOCKET / <span style={{ color: '#FFFFFF' }}>{activeSection > 0 && activeSection < 5 ? 'CONNECTED' : (activeSection === 5 ? 'COMPLETED' : 'STANDBY')}</span></div>
          <div className="monogram" style={{ border: 'none', background: 'rgba(255,255,255,0.2)' }}>=</div>
        </div>
      </header>

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
              
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#D8D8D8', marginBottom: '3rem', maxWidth: '350px', lineHeight: '1.8' }}>
                {sections[activeSection].desc}
              </p>

              {/* SECTION CONTROLS / CONTENT */}
              {activeSection === 0 && (
                <form onSubmit={(e) => e.preventDefault()}>
                  <div className="form-group">
                    <span className="meta-label">Consensus Type</span>
                    <select name="consensusType" className="form-control" value={formData.consensusType} onChange={(e) => setFormData({...formData, consensusType: e.target.value})} style={{ color: '#FFFFFF' }}>
                      <option value="PoW">Proof of Work (PoW)</option>
                      <option value="PoS">Proof of Stake (PoS)</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ display: 'flex', gap: '2rem' }}>
                      <div style={{ flex: 1 }}>
                        <span className="meta-label">Nodes</span>
                        <input type="number" name="nodeCount" className="form-control" value={formData.nodeCount} onChange={(e) => setFormData({...formData, nodeCount: parseInt(e.target.value)})} min="1" style={{ color: '#FFFFFF' }}/>
                      </div>
                      <div style={{ flex: 1 }}>
                        <span className="meta-label">Latency (s)</span>
                        <input type="number" name="blockGossipLatency" className="form-control" value={formData.blockGossipLatency} onChange={(e) => setFormData({...formData, blockGossipLatency: parseFloat(e.target.value)})} step="0.1" style={{ color: '#FFFFFF' }}/>
                      </div>
                  </div>
                </form>
              )}

              {/* DYNAMIC SCENE RESULTS MAP */}
              {activeSection === 1 && (
                <div className="results-grid" style={{ marginTop: '2rem' }}>
                  <div className="result-item">
                    <span className="meta-label">REQUESTED NODES</span>
                    <div className="value">{formData.nodeCount}</div>
                  </div>
                  <div className="result-item">
                    <span className="meta-label">NETWORK STATE</span>
                    <div className="value">INITIALIZING...</div>
                  </div>
                </div>
              )}

              {activeSection === 2 && latestTick && (
                <div className="results-grid" style={{ marginTop: '2rem' }}>
                  <div className="result-item">
                    <span className="meta-label">LIVE BLOCKS</span>
                    <div className="value">{latestTick.blockCount}</div>
                  </div>
                  <div className="result-item">
                    <span className="meta-label">ACTIVE FORKS</span>
                    <div className="value">{latestTick.activeForks}</div>
                  </div>
                </div>
              )}

              {activeSection === 3 && latestTick && (
                <div className="results-grid" style={{ marginTop: '2rem' }}>
                  <div className="result-item">
                    <span className="meta-label">ACTIVE FORKS</span>
                    <div className="value">{latestTick.activeForks}</div>
                  </div>
                  <div className="result-item">
                    <span className="meta-label">INSTANT GINI</span>
                    <div className="value">{latestTick.instantGini.toFixed(3)}</div>
                  </div>
                </div>
              )}

              {activeSection === 4 && latestTick && (
                <div className="results-grid" style={{ marginTop: '2rem' }}>
                  <div className="result-item">
                    <span className="meta-label">MAINCHAIN STABILITY</span>
                    <div className="value">{((1.0 - latestTick.instantGini) * 100).toFixed(1)}%</div>
                  </div>
                  <div className="result-item">
                    <span className="meta-label">TOPOLOGY STATUS</span>
                    <div className="value">COMPUTING...</div>
                  </div>
                </div>
              )}

              {activeSection === 5 && results && (
                <div>
                  <div className="results-grid">
                    <div className="result-item">
                      <span className="meta-label">MAINCHAIN RATE</span>
                      <div className="value">{(results.mainchainRate * 100).toFixed(1)}%</div>
                    </div>
                    <div className="result-item">
                      <span className="meta-label">BRANCHING RATIO</span>
                      <div className="value">{results.branchingRatio.toFixed(3)}</div>
                    </div>
                    <div className="result-item">
                      <span className="meta-label">GINI COEFFICIENT</span>
                      <div className="value">{results.finalGiniCoefficient.toFixed(3)}</div>
                    </div>
                    <div className="result-item">
                      <span className="meta-label">DURATION</span>
                      <div className="value">{results.durationMillis} ms</div>
                    </div>
                  </div>
                  <button onClick={() => { setActiveSection(0); setLiveTicks([]); setResults(null); }} className="primary-btn" style={{ marginTop: '3rem', opacity: 1 }}>
                    NEW SEQUENCE Γå║
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
        <div style={{ position: 'absolute', top: '50%', right: '25%', transform: 'translate(50%, -50%)', zIndex: 10 }}>
          <button 
            onClick={handleStartSimulation} 
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
              cursor: 'pointer',
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
            START SIMULATION Γåù
          </button>
        </div>
      )}



      {/* BOTTOM TELEMETRY BAR */}
      <footer className="bottom-bar">
        <div className="bottom-stats">
          <div style={{ display: 'flex', gap: '2rem' }}>
            <span>NODES: <span style={{ color: '#FFFFFF' }}>{formData.nodeCount}</span></span>
            {latestTick && <span>BLOCKS: <span style={{ color: '#FFFFFF' }}>{latestTick.blockCount}</span></span>}
            {latestTick && <span>FORKS: <span style={{ color: '#FFFFFF' }}>{latestTick.activeForks}</span></span>}
            {latestTick && <span>LATENCY: <span style={{ color: '#FFFFFF' }}>{formData.blockGossipLatency}</span>s</span>}
            {latestTick && <span>MAINCHAIN RATE: <span style={{ color: '#FFFFFF' }}>{(1.0 - latestTick.instantGini).toFixed(2)}</span></span>}
          </div>
          <div>ΓùÅ ENGINE STATUS: <span style={{ color: '#FFFFFF' }}>{activeSection === 0 ? 'IDLE' : (activeSection === 5 ? 'COMPLETED' : 'RUNNING')}</span></div>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${activeSection === 5 ? 100 : (activeSection > 0 ? progressPercent : 0)}%` }}></div>
        </div>
      </footer>
    </div>
  );
}
