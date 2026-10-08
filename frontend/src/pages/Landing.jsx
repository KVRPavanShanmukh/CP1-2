import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useNavigate } from 'react-router-dom';
import SimulationCursor from '../components/SimulationCursor';
import './Landing.css';

// ═══════════════════════════════════════════════════════════════
// VISUAL 0 — HERO: Flowing network constellation (white/purple)
// Inspired by "Technical Depth" reference — flowing glowing lines
// ═══════════════════════════════════════════════════════════════
function HeroVisual({ active }) {
  const groupRef = useRef();
  const linesRef = useRef();
  const pointsRef = useRef();

  const { linePositions, pointPositions } = useMemo(() => {
    const numLines = 40;
    const pointsPerLine = 60;
    const lp = new Float32Array(numLines * pointsPerLine * 3);
    
    for (let l = 0; l < numLines; l++) {
      const baseY = (l / numLines - 0.5) * 8;
      const baseZ = (Math.random() - 0.5) * 4;
      for (let p = 0; p < pointsPerLine; p++) {
        const i = (l * pointsPerLine + p) * 3;
        const t = (p / pointsPerLine - 0.5) * 14;
        lp[i] = t;
        lp[i + 1] = baseY + Math.sin(t * 0.8 + l * 0.3) * 1.5 + Math.cos(t * 0.3) * 0.8;
        lp[i + 2] = baseZ + Math.sin(t * 0.5 + l) * 0.5;
      }
    }
    
    const numDust = 2000;
    const pp = new Float32Array(numDust * 3);
    for (let i = 0; i < numDust; i++) {
      pp[i * 3] = (Math.random() - 0.5) * 25;
      pp[i * 3 + 1] = (Math.random() - 0.5) * 15;
      pp[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return { linePositions: lp, pointPositions: pp };
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = Math.sin(t * 0.1) * 0.05 + state.pointer.x * 0.08;
    groupRef.current.rotation.x = state.pointer.y * 0.04;
    
    if (linesRef.current) {
      const pos = linesRef.current.geometry.attributes.position;
      const numLines = 40;
      const ppl = 60;
      for (let l = 0; l < numLines; l++) {
        for (let p = 0; p < ppl; p++) {
          const idx = (l * ppl + p) * 3;
          const baseX = (p / ppl - 0.5) * 14;
          const baseY = (l / numLines - 0.5) * 8;
          pos.array[idx + 1] = baseY + Math.sin(baseX * 0.8 + l * 0.3 + t * 0.6) * 1.5 + Math.cos(baseX * 0.3 + t * 0.4) * 0.8;
        }
      }
      pos.needsUpdate = true;
    }
    
    const scale = active ? 1 : 0.5;
    const opacity = active ? 0.9 : 0.0;
    groupRef.current.scale.setScalar(THREE.MathUtils.lerp(groupRef.current.scale.x, scale, 0.03));
    if (linesRef.current?.material) linesRef.current.material.opacity = THREE.MathUtils.lerp(linesRef.current.material.opacity, opacity, 0.03);
    if (pointsRef.current?.material) pointsRef.current.material.opacity = THREE.MathUtils.lerp(pointsRef.current.material.opacity, opacity * 0.4, 0.03);
  });

  return (
    <group ref={groupRef} position={[3, 0, 0]}>
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={linePositions.length / 3} array={linePositions} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.8} blending={THREE.AdditiveBlending} />
      </lineSegments>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={pointPositions.length / 3} array={pointPositions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.02} color="#9b59b6" transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// VISUAL 1 — ABSTRACT: Dense cyan particle sphere (The Nexus)
// Inspired by "Spirit Realm" / "The Nexus" reference
// ═══════════════════════════════════════════════════════════════
function NexusSphereVisual({ active }) {
  const groupRef = useRef();
  const pointsRef = useRef();
  const numParticles = 6000;
  
  const positions = useMemo(() => {
    const p = new Float32Array(numParticles * 3);
    for (let i = 0; i < numParticles; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = 4.8 + Math.random() * 0.3;
      p[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      p[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.85;
      p[i * 3 + 2] = r * Math.cos(phi);
    }
    return p;
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = t * 0.08 + state.pointer.x * 0.15;
    groupRef.current.rotation.x = Math.sin(t * 0.2) * 0.1 + state.pointer.y * 0.08;
    
    const scale = active ? 1.2 : 0.3;
    const opacity = active ? 0.85 : 0.0;
    groupRef.current.scale.setScalar(THREE.MathUtils.lerp(groupRef.current.scale.x, scale, 0.03));
    if (pointsRef.current?.material) pointsRef.current.material.opacity = THREE.MathUtils.lerp(pointsRef.current.material.opacity, opacity, 0.03);
  });

  return (
    <group ref={groupRef} position={[3.5, 0.5, 0]}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={numParticles} array={positions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.04} color="#00e5ff" transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// VISUAL 2 — ARCHITECTURE: Connected node graph (network topo)
// Unique: NOT a sphere — interconnected nodes with edges
// ═══════════════════════════════════════════════════════════════
function NetworkGraphVisual({ active }) {
  const groupRef = useRef();
  const nodesRef = useRef();
  const edgesRef = useRef();
  
  const { nodePositions, edgePositions } = useMemo(() => {
    const numNodes = 80;
    const np = new Float32Array(numNodes * 3);
    const edges = [];
    
    for (let i = 0; i < numNodes; i++) {
      np[i * 3] = (Math.random() - 0.5) * 12;
      np[i * 3 + 1] = (Math.random() - 0.5) * 8;
      np[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    
    for (let i = 0; i < numNodes; i++) {
      const connections = 2 + Math.floor(Math.random() * 3);
      for (let c = 0; c < connections; c++) {
        const j = Math.floor(Math.random() * numNodes);
        if (j !== i) {
          const dx = np[i*3] - np[j*3];
          const dy = np[i*3+1] - np[j*3+1];
          const dz = np[i*3+2] - np[j*3+2];
          const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
          if (dist < 6) {
            edges.push(np[i*3], np[i*3+1], np[i*3+2]);
            edges.push(np[j*3], np[j*3+1], np[j*3+2]);
          }
        }
      }
    }
    
    return { nodePositions: np, edgePositions: new Float32Array(edges) };
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = t * 0.04 + state.pointer.x * 0.1;
    groupRef.current.rotation.x = state.pointer.y * 0.06;
    
    const scale = active ? 1 : 0.4;
    const opacity = active ? 1 : 0.0;
    groupRef.current.scale.setScalar(THREE.MathUtils.lerp(groupRef.current.scale.x, scale, 0.03));
    if (nodesRef.current?.material) nodesRef.current.material.opacity = THREE.MathUtils.lerp(nodesRef.current.material.opacity, opacity, 0.03);
    if (edgesRef.current?.material) edgesRef.current.material.opacity = THREE.MathUtils.lerp(edgesRef.current.material.opacity, opacity * 0.3, 0.03);
  });

  return (
    <group ref={groupRef} position={[3, 0, 0]}>
      <points ref={nodesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={nodePositions.length / 3} array={nodePositions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.12} color="#e6e6fa" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
      <lineSegments ref={edgesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={edgePositions.length / 3} array={edgePositions} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial color="#9b59b6" transparent opacity={0.25} blending={THREE.AdditiveBlending} />
      </lineSegments>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// VISUAL 3 — PROCESS: Flowing energy streams (amber/warm)
// Inspired by "DEFI Platform" reference — warm flowing wave field
// ═══════════════════════════════════════════════════════════════
function EnergyStreamVisual({ active }) {
  const groupRef = useRef();
  const linesRef = useRef();
  
  const linePositions = useMemo(() => {
    const numStreams = 25;
    const pps = 80;
    const lp = new Float32Array(numStreams * pps * 3);
    for (let s = 0; s < numStreams; s++) {
      const baseY = (s / numStreams - 0.5) * 7;
      for (let p = 0; p < pps; p++) {
        const i = (s * pps + p) * 3;
        const t = (p / pps - 0.5) * 16;
        lp[i] = t;
        lp[i + 1] = baseY + Math.sin(t * 0.4 + s * 0.5) * 2.2;
        lp[i + 2] = Math.cos(t * 0.3 + s) * 1.5;
      }
    }
    return lp;
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = state.pointer.x * 0.06;
    
    if (linesRef.current) {
      const pos = linesRef.current.geometry.attributes.position;
      const numStreams = 25;
      const pps = 80;
      for (let s = 0; s < numStreams; s++) {
        for (let p = 0; p < pps; p++) {
          const idx = (s * pps + p) * 3;
          const baseX = (p / pps - 0.5) * 16;
          const baseY = (s / numStreams - 0.5) * 7;
          pos.array[idx + 1] = baseY + Math.sin(baseX * 0.4 + s * 0.5 + t * 0.8) * 2.2 + Math.cos(baseX * 0.15 + t * 0.5) * 0.6;
        }
      }
      pos.needsUpdate = true;
    }

    const scale = active ? 1 : 0.4;
    const opacity = active ? 0.85 : 0.0;
    groupRef.current.scale.setScalar(THREE.MathUtils.lerp(groupRef.current.scale.x, scale, 0.03));
    if (linesRef.current?.material) linesRef.current.material.opacity = THREE.MathUtils.lerp(linesRef.current.material.opacity, opacity, 0.03);
  });

  return (
    <group ref={groupRef} position={[-3, 0, 0]}>
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={linePositions.length / 3} array={linePositions} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial color="#ffaa00" transparent opacity={0.7} blending={THREE.AdditiveBlending} />
      </lineSegments>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// VISUAL 4 — TEAM: Subtle ambient particle cloud (teal)
// ═══════════════════════════════════════════════════════════════
function TeamAmbientVisual({ active }) {
  const groupRef = useRef();
  const pointsRef = useRef();
  const numParticles = 3000;
  
  const positions = useMemo(() => {
    const p = new Float32Array(numParticles * 3);
    for (let i = 0; i < numParticles; i++) {
      p[i * 3] = (Math.random() - 0.5) * 30;
      p[i * 3 + 1] = (Math.random() - 0.5) * 20;
      p[i * 3 + 2] = (Math.random() - 0.5) * 15;
    }
    return p;
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = state.clock.elapsedTime * 0.02;
    
    const opacity = active ? 0.4 : 0.0;
    if (pointsRef.current?.material) pointsRef.current.material.opacity = THREE.MathUtils.lerp(pointsRef.current.material.opacity, opacity, 0.03);
  });

  return (
    <group ref={groupRef}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={numParticles} array={positions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.025} color="#00bfa5" transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// VISUAL 5 — SIMULATION: Dense blue/white high-energy sphere
// ═══════════════════════════════════════════════════════════════
function SimSphereVisual({ active }) {
  const groupRef = useRef();
  const pointsRef = useRef();
  const numParticles = 5000;
  
  const positions = useMemo(() => {
    const p = new Float32Array(numParticles * 3);
    for (let i = 0; i < numParticles; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = 5.2 + Math.random() * 0.5;
      p[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      p[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      p[i * 3 + 2] = r * Math.cos(phi);
    }
    return p;
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = t * 0.06 + state.pointer.x * 0.12;
    groupRef.current.rotation.x = state.pointer.y * 0.06;

    const scale = active ? 1 : 0.3;
    const opacity = active ? 0.8 : 0.0;
    groupRef.current.scale.setScalar(THREE.MathUtils.lerp(groupRef.current.scale.x, scale, 0.03));
    if (pointsRef.current?.material) pointsRef.current.material.opacity = THREE.MathUtils.lerp(pointsRef.current.material.opacity, opacity, 0.03);
  });

  return (
    <group ref={groupRef} position={[4, 0, 0]}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={numParticles} array={positions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.045} color="#ffffff" transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// VISUAL 6 — CONTACT: Geometric crystal (magenta wireframe)
// Inspired by "Ambitious Ideas, Shipped" diamond reference
// ═══════════════════════════════════════════════════════════════
function CrystalVisual({ active }) {
  const groupRef = useRef();
  const meshRef = useRef();
  const dustRef = useRef();
  const numDust = 1500;
  
  const dustPositions = useMemo(() => {
    const p = new Float32Array(numDust * 3);
    for (let i = 0; i < numDust; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 3 + Math.random() * 6;
      p[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      p[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      p[i * 3 + 2] = r * Math.cos(phi);
    }
    return p;
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = t * 0.15 + state.pointer.x * 0.15;
    groupRef.current.rotation.x = t * 0.08 + state.pointer.y * 0.1;
    
    const scale = active ? 1 : 0.0;
    const opacity = active ? 1 : 0;
    groupRef.current.scale.setScalar(THREE.MathUtils.lerp(groupRef.current.scale.x, scale, 0.04));
    if (meshRef.current?.material) meshRef.current.material.opacity = THREE.MathUtils.lerp(meshRef.current.material.opacity, opacity, 0.04);
    if (dustRef.current?.material) dustRef.current.material.opacity = THREE.MathUtils.lerp(dustRef.current.material.opacity, opacity * 0.4, 0.04);
  });

  return (
    <group ref={groupRef} position={[3, 0, 0]}>
      <mesh ref={meshRef}>
        <octahedronGeometry args={[4.5, 1]} />
        <meshStandardMaterial color="#ff00ff" wireframe transparent emissive="#ff00ff" emissiveIntensity={2.5} opacity={0.9} />
      </mesh>
      <points ref={dustRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={numDust} array={dustPositions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.03} color="#ff4081" transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMBINED SCENE — All visuals coexist, opacity-driven
// ═══════════════════════════════════════════════════════════════
function CombinedScene({ activeSection }) {
  return (
    <>
      <color attach="background" args={['#020204']} />
      <ambientLight intensity={0.3} />
      <HeroVisual active={activeSection === 0} />
      <NexusSphereVisual active={activeSection === 1} />
      <NetworkGraphVisual active={activeSection === 2} />
      <EnergyStreamVisual active={activeSection === 3} />
      <TeamAmbientVisual active={activeSection === 4} />
      <SimSphereVisual active={activeSection === 5} />
      <CrystalVisual active={activeSection === 6} />
      <EffectComposer>
        <Bloom luminanceThreshold={0.3} luminanceSmoothing={0.9} height={300} intensity={2.0} />
        <Noise opacity={0.035} />
      </EffectComposer>
    </>
  );
}


// ═══════════════════════════════════════════════════════════════
// LANDING PAGE — MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function Landing() {
  const [activeSection, setActiveSection] = useState(0);
  const [scrollLocked, setScrollLocked] = useState(false);
  const navigate = useNavigate();
  const [privacyChoice, setPrivacyChoice] = useState(localStorage.getItem('privacy_choice'));
  const totalSections = 7;

  const sectionAccents = ['#ffffff', '#00e5ff', '#e6e6fa', '#ffaa00', '#00bfa5', '#ffffff', '#ff00ff'];
  const currentAccent = sectionAccents[activeSection];

  const sectionMeta = [
    { num: '//00', cat: 'PROJECT INTRODUCTION', techTags: ['SPRING BOOT', 'REACT', 'THREE.JS', 'WEBSOCKET'] },
    { num: '//01', cat: 'DISTRIBUTED SYSTEMS / ABSTRACT', techTags: ['AGENT-BASED MODELLING', 'CONSENSUS', 'P2P'] },
    { num: '//02', cat: 'SYSTEM ARCHITECTURE', techTags: ['MICROSERVICES', 'RABBITMQ', 'STOMP', 'REST'] },
    { num: '//03', cat: 'DESIGN / DEVELOPMENT', techTags: ['WEBGL', 'FRAMER MOTION', 'LENIS', 'VITE'] },
    { num: '//04', cat: 'TEAM / CONTRIBUTORS', techTags: ['FULL-STACK', 'SIMULATION', 'FRONTEND', 'BACKEND'] },
    { num: '//05', cat: 'LIVE SIMULATION ENGINE', techTags: ['PROOF OF WORK', 'PROOF OF STAKE', 'GINI', 'FORKS'] },
    { num: '//06', cat: 'PROJECT VISION / CONTACT', techTags: ['CHAIN55', 'DISTRIBUTED CONSENSUS', '2026'] },
  ];

  // Smooth scroll navigation
  useEffect(() => {
    const handleWheel = (e) => {
      if (scrollLocked) return;
      if (e.deltaY > 40 && activeSection < totalSections - 1) {
        setScrollLocked(true);
        setActiveSection(prev => prev + 1);
        setTimeout(() => setScrollLocked(false), 1200);
      } else if (e.deltaY < -40 && activeSection > 0) {
        setScrollLocked(true);
        setActiveSection(prev => prev - 1);
        setTimeout(() => setScrollLocked(false), 1200);
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [activeSection, scrollLocked]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowDown' && activeSection < totalSections - 1) setActiveSection(prev => prev + 1);
      if (e.key === 'ArrowUp' && activeSection > 0) setActiveSection(prev => prev - 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeSection]);

  const navItems = [
    { label: 'DASHBOARD', action: () => navigate('/dashboard') },
    { label: 'SIMULATION', action: () => navigate('/simulation') },
    { label: 'PROFILE', action: () => {} },
  ];

  const sectionNavLabels = ['HERO', 'ABSTRACT', 'ARCH', 'PROCESS', 'TEAM', 'ENGINE', 'VISION'];

  return (
    <div className="landing-shell" style={{ cursor: 'none' }}>
      <SimulationCursor activeSection={activeSection} />

      {/* WEBGL LAYER */}
      <div className="webgl-layer">
        <Canvas camera={{ position: [0, 0, 14], fov: 50 }} dpr={[1, 1.5]}>
          <CombinedScene activeSection={activeSection} />
        </Canvas>
      </div>

      {/* TOP NAVBAR */}
      <nav className="landing-navbar">
        <div className="navbar-left">
          <div className="navbar-logo">C55</div>
          <div className="navbar-identity">
            <strong>CHAIN55</strong> / DISTRIBUTED CONSENSUS SIMULATOR<br/>
            AGENT-BASED MODELLING ENGINE
          </div>
        </div>
        <div className="navbar-center">
          {navItems.map(item => (
            <div key={item.label} className="navbar-link" onClick={item.action}>{item.label}</div>
          ))}
        </div>
        <div className="navbar-right">
          <div className="navbar-status">
            <div className="status-dot"></div>
            <span>SYSTEM ONLINE</span>
          </div>
          <button className="navbar-menu-btn">☰</button>
        </div>
      </nav>

      {/* SECTION CONTENT */}
      <div className="landing-sections">
        <AnimatePresence mode="wait">

          {/* ═══ SECTION 0 — HERO ═══ */}
          {activeSection === 0 && (
            <motion.div key="s0" className="landing-section" initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>
              <div className="section-hero-content">
                <span className="section-number" style={{ color: currentAccent }}>{sectionMeta[0].num}</span>
                <span className="section-category" style={{ color: 'var(--text-dimmer)' }}>{sectionMeta[0].cat}</span>
                <h1 className="section-title size-hero">CONSENSUS<br/>ENGINE.</h1>
                <p className="section-desc">
                  An agent-based modelling platform for distributed consensus simulation. We model peer-to-peer networks, 
                  block propagation dynamics, and fork resolution in real-time using WebGL and WebSocket telemetry.
                </p>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <button className="landing-btn accent-cyan" onClick={() => setActiveSection(1)}>EXPLORE PROJECT ↓</button>
                  <button className="landing-btn" onClick={() => navigate('/simulation')}>LAUNCH SIMULATION ↗</button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══ SECTION 1 — ABSTRACT / NEXUS ═══ */}
          {activeSection === 1 && (
            <motion.div key="s1" className="landing-section" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>
              <div className="section-abstract-content">
                <span className="section-number" style={{ color: currentAccent }}>{sectionMeta[1].num}</span>
                <span className="section-category" style={{ color: 'var(--text-dimmer)' }}>{sectionMeta[1].cat}</span>
                <h1 className="section-title size-large">THE<br/>NETWORK.</h1>
                <p className="section-desc">
                  Each node in our simulation operates as an autonomous agent with its own blockchain state, 
                  mempool, and consensus logic. Together they form a unified nexus — a distributed intelligence 
                  that converges on canonical truth through gossip propagation.
                </p>
                <button className="landing-btn" onClick={() => setActiveSection(2)}>VIEW ARCHITECTURE ↗</button>
              </div>
            </motion.div>
          )}

          {/* ═══ SECTION 2 — ARCHITECTURE ═══ */}
          {activeSection === 2 && (
            <motion.div key="s2" className="landing-section" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>
              <div className="section-arch-content">
                <span className="section-number" style={{ color: currentAccent }}>{sectionMeta[2].num}</span>
                <span className="section-category" style={{ color: 'var(--text-dimmer)' }}>{sectionMeta[2].cat}</span>
                <h1 className="section-title size-large">SYSTEM<br/>DEPTH.</h1>
                <p className="section-desc">
                  Spring Boot orchestrates the simulation engine with concurrent agent threads. 
                  STOMP over WebSocket delivers sub-second tick updates to the React frontend. 
                  Network topology follows Erdős–Rényi random graph generation with configurable edge probability.
                </p>
                <div style={{ display: 'flex', gap: '40px', marginBottom: '28px' }}>
                  <div>
                    <div className="sim-stat-label">PROTOCOLS</div>
                    <div className="sim-stat-value" style={{ fontSize: '18px', color: currentAccent }}>PoW / PoS</div>
                  </div>
                  <div>
                    <div className="sim-stat-label">TRANSPORT</div>
                    <div className="sim-stat-value" style={{ fontSize: '18px' }}>STOMP/WS</div>
                  </div>
                  <div>
                    <div className="sim-stat-label">TOPOLOGY</div>
                    <div className="sim-stat-value" style={{ fontSize: '18px' }}>ERDŐS–RÉNYI</div>
                  </div>
                </div>
                <button className="landing-btn" onClick={() => setActiveSection(3)}>DEVELOPMENT PROCESS ↗</button>
              </div>
            </motion.div>
          )}

          {/* ═══ SECTION 3 — PROCESS (Right-aligned) ═══ */}
          {activeSection === 3 && (
            <motion.div key="s3" className="landing-section" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>
              <div className="section-process-content">
                <span className="section-number" style={{ color: currentAccent }}>{sectionMeta[3].num}</span>
                <span className="section-category" style={{ color: 'var(--text-dimmer)' }}>{sectionMeta[3].cat}</span>
                <h1 className="section-title size-large" style={{ color: '#ffaa00' }}>DESIGN<br/>PROCESS.</h1>
                <p className="section-desc">
                  The platform was built end-to-end: architecture design, Spring Boot backend with H2/SQL persistence, 
                  React + Three.js immersive frontend, WebSocket real-time data pipeline, 
                  and agent-based simulation engine with configurable consensus strategies.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px', maxWidth: '340px' }}>
                  {['CONCEPT', 'ARCHITECTURE', 'FRONTEND', 'BACKEND', 'SIMULATION', 'REAL-TIME', 'AUTH', 'TESTING'].map(item => (
                    <div key={item} style={{ padding: '10px 14px', border: '1px solid var(--border-subtle)', fontSize: '9px', fontFamily: 'var(--font-mono)', letterSpacing: '2px', color: 'var(--text-dim)', transition: 'border-color 0.3s' }}>
                      {item}
                    </div>
                  ))}
                </div>
                <div style={{ position: 'relative', zIndex: 100, marginTop: '20px' }}>
                  <button className="landing-btn" onClick={() => setActiveSection(4)} style={{ pointerEvents: 'auto' }}>MEET THE TEAM ↗</button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══ SECTION 4 — TEAM ═══ */}
          {activeSection === 4 && (
            <motion.div key="s4" className="landing-section" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>
              <div className="section-team-content">
                <div className="team-text-side">
                  <span className="section-number" style={{ color: currentAccent }}>{sectionMeta[4].num}</span>
                  <span className="section-category" style={{ color: 'var(--text-dimmer)' }}>{sectionMeta[4].cat}</span>
                  <h1 className="section-title size-medium">THE<br/>TEAM.</h1>
                  <p className="section-desc">The engineers behind the CHAIN55 distributed consensus simulation platform.</p>
                </div>
                <div className="team-grid">
                  {[
                    { name: 'PAVAN SHANMUKH', role: 'FULL-STACK LEAD', desc: 'Architecture, Spring Boot backend, simulation engine, React frontend, WebGL visuals, authentication system.' },
                    { name: 'TEAM MEMBER 2', role: 'BACKEND ENGINEER', desc: 'Database integration, API design, WebSocket infrastructure, consensus algorithm implementation.' },
                    { name: 'TEAM MEMBER 3', role: 'FRONTEND ENGINEER', desc: 'React components, Three.js visualizations, responsive design, animation systems.' },
                    { name: 'TEAM MEMBER 4', role: 'RESEARCH / QA', desc: 'Agent-based modelling research, simulation validation, testing, documentation.' },
                  ].map((member, idx) => (
                    <div key={idx} className="team-card">
                      <div className="team-card-name">{member.name}</div>
                      <div className="team-card-role" style={{ color: currentAccent }}>{member.role}</div>
                      <div className="team-card-desc">{member.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══ SECTION 5 — SIMULATION ENGINE ═══ */}
          {activeSection === 5 && (
            <motion.div key="s5" className="landing-section" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>
              <div className="section-sim-content">
                <span className="section-number" style={{ color: currentAccent }}>{sectionMeta[5].num}</span>
                <span className="section-category" style={{ color: 'var(--text-dimmer)' }}>{sectionMeta[5].cat}</span>
                <h1 className="section-title size-large">LIVE<br/>ENGINE.</h1>
                <p className="section-desc">
                  Configure node count, consensus type, and network latency. 
                  The simulation engine instantiates autonomous blockchain agents, 
                  propagates blocks across the gossip layer, and streams real-time metrics via WebSocket.
                </p>
                <div className="sim-stat-row">
                  <div className="sim-stat">
                    <span className="sim-stat-label">CONSENSUS</span>
                    <span className="sim-stat-value">PoW / PoS</span>
                  </div>
                  <div className="sim-stat">
                    <span className="sim-stat-label">MAX NODES</span>
                    <span className="sim-stat-value">100+</span>
                  </div>
                  <div className="sim-stat">
                    <span className="sim-stat-label">METRICS</span>
                    <span className="sim-stat-value">GINI / FORKS</span>
                  </div>
                </div>
                <div style={{ marginTop: '32px' }}>
                  <button className="landing-btn accent-cyan" onClick={() => navigate('/simulation')}>OPEN SIMULATION TOOL ↗</button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══ SECTION 6 — CONTACT / VISION ═══ */}
          {activeSection === 6 && (
            <motion.div key="s6" className="landing-section" initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>
              <div className="section-contact-content">
                <span className="section-number" style={{ color: currentAccent }}>{sectionMeta[6].num}</span>
                <span className="section-category" style={{ color: 'var(--text-dimmer)' }}>{sectionMeta[6].cat}</span>
                <h1 className="section-title size-hero" style={{ textAlign: 'center' }}>CHAIN55<br/>PROJECT.</h1>
                <p className="section-desc">
                  A complete distributed consensus simulation platform. 
                  From agent-based modelling to real-time WebGL visualization — 
                  built end-to-end with Spring Boot, React, and Three.js.
                </p>
                <div className="contact-actions">
                  <button className="landing-btn accent-cyan" onClick={() => navigate('/simulation')}>LAUNCH SIMULATION ↗</button>
                  <button className="landing-btn" onClick={() => navigate('/dashboard')}>VIEW DASHBOARD ↗</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* RIGHT-SIDE SECTION NAVIGATION */}
      <div className="section-nav">
        {sectionNavLabels.map((label, idx) => (
          <div
            key={idx}
            className={`section-nav-item ${activeSection === idx ? 'active' : ''}`}
            style={activeSection === idx ? { background: currentAccent, boxShadow: `0 0 8px ${currentAccent}` } : {}}
            data-label={label}
            onClick={() => setActiveSection(idx)}
          />
        ))}
      </div>

      {/* BOTTOM METADATA BAR */}
      <div className="landing-bottom">
        <div className="bottom-tech-tags">
          {sectionMeta[activeSection].techTags.map((tag, i) => (
            <span key={i} style={{ color: i === 0 ? currentAccent : 'var(--text-dimmer)' }}>{tag}</span>
          ))}
        </div>
        {!privacyChoice && (
          <div className="bottom-privacy">
            <div className="bottom-privacy-text"><span className="accent">// PRIVACY</span> Optional analytics help improve this platform. <u style={{ cursor: 'pointer' }}>Details</u></div>
            <button className="privacy-btn" onClick={() => { localStorage.setItem('privacy_choice', 'declined'); setPrivacyChoice('declined'); }}>DECLINE</button>
            <button className="privacy-btn filled" onClick={() => { localStorage.setItem('privacy_choice', 'accepted'); setPrivacyChoice('accepted'); }}>ACCEPT</button>
          </div>
        )}
      </div>
    </div>
  );
}
