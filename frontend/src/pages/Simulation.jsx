import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client/dist/sockjs';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

const API_BASE_URL = 'http://localhost:8080/api/simulations';
const WS_URL = 'http://localhost:8080/ws-simulation';

// --- WEBGL VISUALIZATION ---
function NetworkVisualization({ state, progress }) {
  const ref = useRef();
  
  const particleCount = state === 'IDLE' ? 500 : (state === 'RESULTS' ? 100 : 2000);
  
  const positions = useMemo(() => {
    const p = new Float32Array(3000 * 3);
    for (let i = 0; i < 3000; i++) {
      p[i * 3] = (Math.random() - 0.5) * 10;
      p[i * 3 + 1] = (Math.random() - 0.5) * 10;
      p[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return p;
  }, []);

  useFrame((stateObj, delta) => {
    if (!ref.current) return;
    
    // Parallax effect with mouse
    const mouseX = (stateObj.pointer.x * Math.PI) / 10;
    const mouseY = (stateObj.pointer.y * Math.PI) / 10;
    
    ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, mouseY, 0.05);
    ref.current.rotation.y = THREE.MathUtils.lerp(ref.current.rotation.y, mouseX + (stateObj.clock.elapsedTime * 0.1), 0.05);
    
    // React to simulation state
    if (state === 'RUNNING') {
        const scale = 1 + (Math.sin(stateObj.clock.elapsedTime * 5) * 0.05);
        ref.current.scale.set(scale, scale, scale);
    } else if (state === 'RESULTS') {
        ref.current.rotation.y += delta * 2;
        ref.current.scale.set(0.5, 0.5, 0.5);
    } else {
        ref.current.scale.set(1, 1, 1);
    }
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
        <PointMaterial 
            transparent 
            color={state === 'RUNNING' ? "#ff00ff" : (state === 'RESULTS' ? "#00ffff" : "#ffffff")} 
            size={0.03} 
            sizeAttenuation={true} 
            depthWrite={false} 
            opacity={0.6} 
        />
      </Points>
    </group>
  );
}

// --- MAIN APPLICATION COMPONENT ---
export default function Simulation() {
  const [activeSection, setActiveSection] = useState(0); // 0: Config, 1: Running, 2: Results
  
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
      });

      client.subscribe(`/topic/simulation/${simulationId}/result`, (message) => {
        const result = JSON.parse(message.body);
        setResults(result);
        setActiveSection(2); // Auto-scroll to results
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

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value
    }));
  };

  const handleStartSimulation = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setLiveTicks([]);
    setResults(null);
    setActiveSection(1); // Move to running state view
    
    try {
      const res = await axios.post(`${API_BASE_URL}/start`, formData);
      connectWebSocket(res.data.id);
    } catch (error) {
      console.error('Failed to start simulation', error);
      setLoading(false);
      setActiveSection(0);
    }
  };

  const simState = activeSection === 0 ? 'IDLE' : (activeSection === 1 ? 'RUNNING' : 'RESULTS');
  const latestTick = liveTicks.length > 0 ? liveTicks[liveTicks.length - 1] : null;
  const progressPercent = latestTick ? (latestTick.currentTick / 10) * 100 : 0; // Assuming 10 is max ticks for demo logic

  // Agent Message Logic
  const getAgentMessage = () => {
    if (simState === 'IDLE') return "Ready for initialization...";
    if (simState === 'RUNNING') {
        if (!latestTick) return "Initializing network topology...";
        if (latestTick.activeForks > 0) return "AYYO! FORK DETECTED!";
        return `Propagating Block ${latestTick.blockCount}...`;
    }
    if (simState === 'RESULTS') return "Consensus achieved. Data stabilized.";
    return "";
  };

  return (
    <div className="immersive-shell">
      {/* 3D Background Canvas */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1 }}>
        <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
          <color attach="background" args={['#030304']} />
          <ambientLight intensity={0.5} />
          <NetworkVisualization state={simState} progress={progressPercent} />
        </Canvas>
      </div>

      {/* HEADER */}
      <header className="minimal-header">
        <div className="header-left">
          <div className="monogram">S</div>
          <div>
            <div>SIMULATION LAB / DISTRIBUTED SYSTEMS</div>
            <div style={{ opacity: 0.5, marginTop: '4px' }}>CHAIN55 NETWORK ENGINE</div>
          </div>
        </div>
        <div className="header-right">
          <div>● WEBSOCKET / {simState === 'RUNNING' ? 'REAL-TIME' : 'STANDBY'}</div>
          <div className="monogram" style={{ border: 'none', background: 'rgba(255,255,255,0.1)' }}>=</div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="main-content">
        
        {/* LEFT PANEL */}
        <div className="left-panel">
          <AnimatePresence mode="wait">
            
            {activeSection === 0 && (
              <motion.div 
                key="config"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                <span className="meta-label">/00 CONFIGURATION</span>
                <h1 className="huge-title">NETWORK<br/>DYNAMICS.</h1>
                
                <form onSubmit={handleStartSimulation} style={{ marginTop: '3rem' }}>
                  <div className="form-group">
                    <span className="meta-label">Consensus Type</span>
                    <select name="consensusType" className="form-control" value={formData.consensusType} onChange={handleInputChange}>
                      <option value="PoW">Proof of Work (PoW)</option>
                      <option value="PoS">Proof of Stake (PoS)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <span className="meta-label">Network Topology</span>
                    <select name="networkTopology" className="form-control" value={formData.networkTopology} onChange={handleInputChange}>
                      <option value="Erdos-Renyi">Erdos-Renyi (Random)</option>
                      <option value="Scale-Free">Scale-Free</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ display: 'flex', gap: '2rem' }}>
                      <div style={{ flex: 1 }}>
                        <span className="meta-label">Node Count</span>
                        <input type="number" name="nodeCount" className="form-control" value={formData.nodeCount} onChange={handleInputChange} min="1"/>
                      </div>
                      <div style={{ flex: 1 }}>
                        <span className="meta-label">Gossip Latency</span>
                        <input type="number" name="blockGossipLatency" className="form-control" value={formData.blockGossipLatency} onChange={handleInputChange} step="0.1"/>
                      </div>
                  </div>
                  <button type="submit" className="primary-btn" style={{ marginTop: '2rem' }}>
                    START SIMULATION ↗
                  </button>
                </form>
              </motion.div>
            )}

            {activeSection === 1 && (
              <motion.div 
                key="running"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                <span className="meta-label">/01 SIMULATION</span>
                <h1 className="huge-title">IN<br/>PROGRESS.</h1>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2rem', maxWidth: '300px', lineHeight: '1.8' }}>
                  The core engine is currently synthesizing network interactions. Atmospheric disturbance indicates active block propagation across the topology.
                </p>
              </motion.div>
            )}

            {activeSection === 2 && results && (
              <motion.div 
                key="results"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                <span className="meta-label">/02 RESULTS</span>
                <h1 className="huge-title" style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}>SIMULATION<br/>COMPLETE.</h1>
                
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
                    <div className="value">{results.durationMillis}ms</div>
                  </div>
                </div>

                <button onClick={() => setActiveSection(0)} className="primary-btn" style={{ marginTop: '4rem' }}>
                  NEW SEQUENCE ↺
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* RIGHT PANEL - NAVIGATION */}
        <div className="right-panel">
          <div className={`nav-indicator ${activeSection === 0 ? 'active' : ''}`} data-label="/00 CFG" onClick={() => !loading && setActiveSection(0)}></div>
          <div className={`nav-indicator ${activeSection === 1 ? 'active' : ''}`} data-label="/01 SIM"></div>
          <div className={`nav-indicator ${activeSection === 2 ? 'active' : ''}`} data-label="/02 RES" onClick={() => results && setActiveSection(2)}></div>
        </div>

      </main>

      {/* COMEDY AGENT CHARACTER */}
      <motion.div 
        className="agent-companion"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        key={getAgentMessage()} // re-animates slightly when message changes
      >
        <span style={{ fontSize: '1rem' }}>🤖</span>
        <span>{getAgentMessage()}</span>
      </motion.div>

      {/* BOTTOM TELEMETRY BAR */}
      <footer className="bottom-bar">
        <div className="bottom-stats">
          <div style={{ display: 'flex', gap: '2rem' }}>
            <span>NODES: {formData.nodeCount}</span>
            {latestTick && <span>BLOCKS: {latestTick.blockCount}</span>}
            {latestTick && <span>FORKS: {latestTick.activeForks}</span>}
            {latestTick && <span>GINI: {latestTick.instantGini.toFixed(3)}</span>}
          </div>
          <div>SIM-ID: {results ? results.configId.substring(0, 8) : (latestTick ? latestTick.simulationId.substring(0,8) : 'AWAITING')}</div>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${activeSection === 2 ? 100 : (activeSection === 1 ? progressPercent : 0)}%` }}></div>
        </div>
      </footer>
    </div>
  );
}
