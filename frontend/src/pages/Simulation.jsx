import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client/dist/sockjs';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import SimulationCursor from '../components/SimulationCursor';
import './Simulation.css';
import { useNavigate } from 'react-router-dom';

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
    
    // State mapping based on images
    let targetShape = shapes.idle;
    let targetColor = new THREE.Color("#444444"); // 00 Idle
    let targetOpacity = 1.0;

    if (stateIndex === 0) { targetShape = shapes.waves; targetColor = new THREE.Color("#e6e6fa"); } // Technical Depth / Waves
    else if (stateIndex === 1) { targetShape = shapes.sphere2; targetColor = new THREE.Color("#00ffff"); targetColor.multiplyScalar(1.2); } // The Nexus / Cyan Sphere
    else if (stateIndex === 2) { targetShape = shapes.sphere1; targetColor = new THREE.Color("#e6e6fa"); targetColor.multiplyScalar(1.5); } // Spirit Realm / Bright White
    else if (stateIndex === 3) { targetShape = shapes.sphere1; targetColor = new THREE.Color("#9b59b6"); targetColor.multiplyScalar(1.5); } // Aaron / Purple
    else if (stateIndex === 4) { targetShape = shapes.waves; targetColor = new THREE.Color("#00ffff"); targetColor.multiplyScalar(1.2); } // Defi Platform / Waves
    else if (stateIndex === 5) { targetShape = shapes.blob; targetColor = new THREE.Color("#ff00ff"); } 

    // Interpolation (lerp)
    for (let i = 0; i < numParticles; i++) {
      const idx = i * 3;
      const noise = (stateIndex === 0 || stateIndex === 4) ? Math.sin(stateObj.clock.elapsedTime * 3 + i) * 0.1 : Math.sin(stateObj.clock.elapsedTime * 1.5 + i) * 0.05;
      
      posAttr.array[idx] = THREE.MathUtils.lerp(posAttr.array[idx], targetShape[idx] + noise, 0.04);
      posAttr.array[idx+1] = THREE.MathUtils.lerp(posAttr.array[idx+1], targetShape[idx+1] + noise, 0.04);
      posAttr.array[idx+2] = THREE.MathUtils.lerp(posAttr.array[idx+2], targetShape[idx+2], 0.04);
      
      let finalColor = targetColor;
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
  });

  return (
    <group position={[3, 0, 0]}> 
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={numParticles} array={positions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.04} vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.9} />
      </points>
    </group>
  );
}

// --- MAIN APPLICATION COMPONENT ---
export default function Simulation() {
  const [activeSection, setActiveSection] = useState(0); 
  const [scrollLocked, setScrollLocked] = useState(false);
  const navigate = useNavigate();
  
  const sections = [
    { id: 0, title: "TECHNICAL DEPTH.", desc: "Give me an ambitious idea and I will turn it into a finished, highly polished product. I own the architecture and implementation, using my design background to refine every detail until the result feels complete.", btn: "SEE SELECTED SYSTEMS ↓" },
    { id: 1, title: "THE NEXUS", desc: "Owned end to end: the design thesis, Three.js application and two custom backends for live network, staking, price and trading-volume data.", btn: "OPEN CASE STUDY ↗" },
    { id: 2, title: "SPIRIT REALM", desc: "An explorable Three.js world, live multiplayer and chat, an art gallery, NFT minting and reusable automatic BVH colliders. Featured at NFT NYC in Times Square.", btn: "OPEN CASE STUDY ↗", alignRight: true },
    { id: 3, title: "AARON J.\nCUNNINGHAM", desc: "I turn ambitious ideas into shipped products, combining full-stack development, design judgment, and disciplined agentic workflows.", btn: "ENTER THE FIELD ↓" },
    { id: 4, title: "DEFI\nPLATFORM", desc: "Five connected Solidity contracts, milestone voting, on-chain staking and transferable positions. EIP-1167 clone factories cut repeat deployment cost by roughly 95%.", btn: "OPEN CASE STUDY ↗", alignRight: true }
  ];

  const accentColors = [
    '#ff00ff', // 00: Magenta (Technical Depth)
    '#00ffff', // 01: Cyan (Nexus)
    '#e6e6fa', // 02: Lavender (Spirit Realm)
    '#9b59b6', // 03: Purple (Aaron J.)
    '#e6e6fa', // 04: Lavender (Defi)
  ];
  const currentAccent = accentColors[activeSection];
  
  // Wheel Scroll Navigation
  useEffect(() => {
    const handleWheel = (e) => {
      if (scrollLocked) return;
      if (e.deltaY > 50 && activeSection < 4) {
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

  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:8080/api/auth/logout', {}, { withCredentials: true });
      navigate('/login');
    } catch (err) {
      navigate('/login');
    }
  };

  return (
    <div className="immersive-shell" style={{ '--dynamic-accent': currentAccent, cursor: 'none' }}>
      <SimulationCursor activeSection={activeSection} />
      
      {/* 3D WEBGL ENGINE */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1 }}>
        <Canvas camera={{ position: [0, 0, 15], fov: 50 }} dpr={[1, 2]}>
          <color attach="background" args={['#050508']} />
          <ambientLight intensity={0.5} />
          <NetworkVisualization stateIndex={activeSection} />
          <EffectComposer>
            <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} intensity={2.5} />
            <Noise opacity={0.05} />
          </EffectComposer>
        </Canvas>
      </div>

      {/* TOP NAVBAR */}
      <nav className="sim-navbar">
        <div className="nav-brand">
          <div className="brand-circle">C55</div>
          <div className="brand-text">CHAIN55 / CREATIVE TECHNOLOGIST<br/><span style={{opacity:0.5}}>SKIP EXPERIENCE / VIEW ALL WORK</span></div>
        </div>
        <div className="nav-links">
          <div className="nav-link">Profile</div>
          <div className="nav-link">Report</div>
          <div className="nav-link">Agent Analysis</div>
          <div className="nav-link" onClick={handleLogout}>Logout</div>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="main-content" style={sections[activeSection].alignRight ? { left: 'auto', right: '150px' } : {}}>
        <AnimatePresence mode="wait">
          <motion.div 
            key={activeSection}
            initial={{ opacity: 0, x: sections[activeSection].alignRight ? 30 : -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: sections[activeSection].alignRight ? -30 : 30 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="meta-label">
              //{String(activeSection + 1).padStart(2, '0')} {activeSection === 0 ? 'PRODUCT OWNERSHIP / DESIGN JUDGMENT / END-TO-END DELIVERY' : activeSection === 3 ? 'FULL-STACK DEVELOPMENT / PRODUCT OWNERSHIP' : 'THE NEXUS / BASEDAI'}
            </span>
            
            <h1 className="huge-title" style={{ whiteSpace: 'pre-line' }}>
              {sections[activeSection].title}
            </h1>
            
            <p className="desc-text">
              {sections[activeSection].desc}
            </p>

            <button className="hollow-btn">
              {sections[activeSection].btn}
            </button>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* RIGHT NAVIGATION */}
      <div className="right-nav">
        {sections.map(sec => (
          <div 
            key={sec.id}
            className={`nav-dash ${activeSection === sec.id ? 'active' : ''}`} 
            onClick={() => setActiveSection(sec.id)}
          ></div>
        ))}
      </div>

      {/* BOTTOM METADATA */}
      <div className="bottom-left-meta">
        ARCHITECTURE / FRONTEND / BACKEND / REAL-TIME / 3D
      </div>

      {/* PRIVACY CONSENT BANNER */}
      <div className="privacy-bar">
        <div className="privacy-text">
          <span>// PRIVACY</span> Optional analytics help improve this portfolio. <u>Details</u>
        </div>
        <div style={{ display: 'flex', gap: '15px' }}>
          <button className="hollow-btn" style={{ fontSize: '9px', padding: '8px 16px', border: 'none', color: 'rgba(255,255,255,0.5)' }}>DECLINE</button>
          <button className="hollow-btn" style={{ fontSize: '9px', padding: '8px 16px' }}>ACCEPT</button>
        </div>
      </div>

    </div>
  );
}
