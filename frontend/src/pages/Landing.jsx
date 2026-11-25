import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useNavigate, useLocation } from 'react-router-dom';
import SimulationCursor from '../components/SimulationCursor';
import { getStoredUser } from '../services/api';
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
      const r = 4.2 + Math.random() * 0.28;
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
    <group ref={groupRef} position={[-3.8, 0, 0]}>
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
  const location = useLocation();
  const [privacyChoice, setPrivacyChoice] = useState(localStorage.getItem('privacy_choice'));
  const totalSections = 7;

  // Lead Creator Spotlight States
  const [creatorSpotlightOpen, setCreatorSpotlightOpen] = useState(false);
  const [portfolioCopied, setPortfolioCopied] = useState(false);
  const [currentUser, setCurrentUser] = useState(getStoredUser());

  useEffect(() => {
    setCurrentUser(getStoredUser());
  }, []);

  useEffect(() => {
    if (location.state?.section !== undefined) {
      setActiveSection(location.state.section);
    }
    const params = new URLSearchParams(location.search);
    if (params.get('section') === 'team' || location.hash === '#project-team') {
      setActiveSection(4);
    }
  }, [location.state, location.search, location.hash]);

  const sectionAccents = ['#ffffff', '#00e5ff', '#e6e6fa', '#ffaa00', '#00bfa5', '#ffffff', '#ff00ff'];
  const currentAccent = sectionAccents[activeSection];

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

  // Keyboard navigation & modal dismiss
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setCreatorSpotlightOpen(false);
      }
      if (e.key === 'ArrowDown' && activeSection < totalSections - 1) setActiveSection(prev => prev + 1);
      if (e.key === 'ArrowUp' && activeSection > 0) setActiveSection(prev => prev - 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeSection, totalSections]);

  const handleCopyPortfolio = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText('https://yellow-sea-03eb87200.4.azurestaticapps.net/');
      setPortfolioCopied(true);
      setTimeout(() => setPortfolioCopied(false), 3000);
    }
  };

  // Global navbar section navigation sync
  useEffect(() => {
    const handleNavSection = (e) => {
      if (typeof e.detail === 'number') {
        setActiveSection(e.detail);
      }
    };
    window.addEventListener('c55-navigate-section', handleNavSection);
    return () => window.removeEventListener('c55-navigate-section', handleNavSection);
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('c55-section-changed', { detail: activeSection }));
  }, [activeSection]);

  const sectionNavLabels = ['HERO', 'ABSTRACT', 'ARCH', 'PROCESS', 'TEAM', 'ENGINE', 'VISION'];

  return (
    <div className="landing-shell">

      {/* WEBGL LAYER */}
      <div className="webgl-layer">
        <Canvas camera={{ position: [0, 0, 14], fov: 50 }} dpr={[1, 1.5]}>
          <CombinedScene activeSection={activeSection} />
        </Canvas>
      </div>

      {/* SECTION CONTENT */}
      <div className="landing-sections">
        <AnimatePresence mode="wait">

          {/* ═══ SECTION 0 — HERO ═══ */}
          {activeSection === 0 && (
            <motion.div key="s0" className="landing-section" initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>
              <div className="section-hero-content">
                <h1 className="section-title size-hero">CONSENSUS<br/>ENGINE.</h1>
                <p className="section-desc">
                  An Agent-Based Modelling (ABM) laboratory for distributed ledger participant behaviour. 
                  CHAIN55 simulates honest, inactive, and Byzantine nodes across P2P topologies and five consensus protocols 
                  to evaluate ledger security, scalability, and reliability before deployment.
                </p>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <button className="landing-btn accent-cyan" onClick={() => setActiveSection(1)}>EXPLORE PROJECT ↓</button>
                  <button className="landing-btn" onClick={() => navigate('/simulation')}>LAUNCH SIMULATION ↗</button>
                  <button className="landing-btn" onClick={() => setCreatorSpotlightOpen(true)}>LEAD ARCHITECT ↗</button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══ SECTION 1 — ABSTRACT / NEXUS ═══ */}
          {activeSection === 1 && (
            <motion.div key="s1" className="landing-section" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>
              <div className="section-abstract-content">
                <h1 className="section-title size-large">RESEARCH<br/>ABSTRACT.</h1>
                <p className="section-desc">
                  Conventional blockchain models assume every participant behaves identically—an assumption that breaks down when real nodes turn malicious, inactive, or unpredictable. 
                  CHAIN55 models each node as an autonomous agent with a distinct behavioral profile, capturing transaction validation, block creation, consensus achievement, and ledger reliability.
                </p>
                <button className="landing-btn" onClick={() => setActiveSection(2)}>SYSTEM MODEL ↗</button>
              </div>
            </motion.div>
          )}

          {/* ═══ SECTION 2 — ARCHITECTURE ═══ */}
          {activeSection === 2 && (
            <motion.div key="s2" className="landing-section" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>
              <div className="section-arch-content">
                <h1 className="section-title size-large">SYSTEM<br/>DEPTH.</h1>
                <p className="section-desc">
                  Each participant operates as a stateful agent maintaining its own local blocktree, transaction mempool, and LMD-GHOST fork-choice view. 
                  Messages propagate across Erdős–Rényi, Small-World, or Scale-Free peer graphs under configurable gossip latency, packet loss, and network partitions.
                </p>
                <div style={{ display: 'flex', gap: '40px', marginBottom: '28px' }}>
                  <div>
                    <div className="sim-stat-label">PROTOCOLS</div>
                    <div className="sim-stat-value" style={{ fontSize: '18px', color: currentAccent }}>5 MODELS</div>
                  </div>
                  <div>
                    <div className="sim-stat-label">FORK CHOICE</div>
                    <div className="sim-stat-value" style={{ fontSize: '18px' }}>LMD-GHOST</div>
                  </div>
                  <div>
                    <div className="sim-stat-label">TOPOLOGIES</div>
                    <div className="sim-stat-value" style={{ fontSize: '18px' }}>3 GRAPHS</div>
                  </div>
                </div>
                <button className="landing-btn" onClick={() => setActiveSection(3)}>RESEARCH PROCESS ↗</button>
              </div>
            </motion.div>
          )}

          {/* ═══ SECTION 3 — PROCESS (Right-aligned) ═══ */}
          {activeSection === 3 && (
            <motion.div key="s3" className="landing-section" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>
              <div className="section-process-content">
                <h1 className="section-title size-large" style={{ color: '#ffaa00' }}>RESEARCH<br/>PROCESS.</h1>
                <p className="section-desc">
                  Every experiment runs in a repeatable, seed-controlled pipeline: configure network topology and consensus rules, 
                  assign honest, inactive, or Byzantine behavioral profiles, inject latency, packet loss, or partitions, 
                  and measure emergent chain stability and decentralization.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px', maxWidth: '340px' }}>
                  {['AGENT PROFILES', 'P2P TOPOLOGY', 'TX MEMPOOL', 'BLOCK GOSSIP', 'FORK CHOICE', 'FAULT INJECTION', 'SEED CONTROL', 'METRIC AUDIT'].map(item => (
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

          {/* ═══ SECTION 4 — PROJECT TEAM & CONTRIBUTIONS (HEXAGONAL FORMATION) ═══ */}
          {activeSection === 4 && (
            <motion.div key="s4" className="landing-section landing-section-team" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>
              <div className="section-team-content team-hex-layout">
                {/* CENTERED HEADER ABOVE HEXAGON (ZERO CARD OVERLAP) */}
                <div className="team-hex-header">
                  <h1 className="section-title size-medium">PROJECT TEAM.</h1>
                  <p className="team-hex-subtitle">
                    <strong style={{ color: '#ffffff' }}>KL University • Dept. of Computer Science &amp; Information Technology (Batch 73)</strong>
                    {' — '}
                    <strong style={{ color: '#00e5ff' }}>CHAIN55:</strong> Agent-Based Modelling of Distributed Ledger Participant Behaviour.
                  </p>
                </div>

                {/* 6-MEMBER HEXAGONAL FORMATION */}
                <div className="team-hex-formation">
                  {/* TOP EDGE (2 VERTICES) */}
                  <div className="team-hex-row hex-edge">
                    {/* VERTEX 1: K. NIRMALA (FACULTY GUIDE & MENTOR) */}
                    <div className="team-member-card mentor-highlight">
                      <div className="member-header">
                        <div className="member-name">K. Nirmala</div>
                        <span className="member-role-badge mentor">FACULTY GUIDE</span>
                      </div>
                      <div className="member-role-title" style={{ color: '#ffaa00' }}>Faculty Guide &amp; Research Mentor</div>
                      <div className="member-contributions">
                        Faculty Guide, Dept. of Computer Science &amp; Information Technology, KL University — research mentorship and academic supervision.
                      </div>
                    </div>

                    {/* VERTEX 2: JUPALLI PRAVALLIKA (TEAM LEADER) */}
                    <div className="team-member-card">
                      <div className="member-header">
                        <div className="member-name">Jupalli Pravallika</div>
                        <span className="member-role-badge leader">TEAM LEADER</span>
                      </div>
                      <div className="member-role-title">Team Leader</div>
                      <div className="member-contributions">
                        Project leadership, team coordination, literature survey, research documentation, and consensus algorithm comparison summary.
                      </div>
                    </div>
                  </div>

                  {/* MIDDLE WIDE VERTICES + CENTRAL HEX CREST */}
                  <div className="team-hex-row hex-middle">
                    {/* VERTEX 3: JANGA SATHVIK REDDY */}
                    <div className="team-member-card">
                      <div className="member-header">
                        <div className="member-name">Janga Sathvik Reddy</div>
                        <span className="member-role-badge contributor">DATABASE</span>
                      </div>
                      <div className="member-role-title">Database Management (MongoDB)</div>
                      <div className="member-contributions">
                        MongoDB database schema configuration, document collections, and persistent storage management.
                      </div>
                    </div>

                    {/* CENTRAL GEOMETRIC HEXAGON EMBLEM */}
                    <div className="team-hex-core" aria-hidden="true">
                      <svg viewBox="0 0 120 120" className="team-hex-svg">
                        <polygon
                          points="60,6 110,33 110,87 60,114 10,87 10,33"
                          fill="rgba(0, 229, 255, 0.04)"
                          stroke="rgba(0, 229, 255, 0.38)"
                          strokeWidth="1.5"
                        />
                        <polygon
                          points="60,16 101,39 101,81 60,104 19,81 19,39"
                          fill="none"
                          stroke="rgba(0, 191, 165, 0.25)"
                          strokeWidth="1"
                          strokeDasharray="4 3"
                        />
                      </svg>
                      <div className="team-hex-core-label">
                        <span>CHAIN55</span>
                        <small>BATCH 73</small>
                      </div>
                    </div>

                    {/* VERTEX 4: K.V.R. SAI PAVAN SHANMUKH (LEAD ARCHITECT) */}
                    <div className="team-member-card lead-highlight">
                      <div className="member-header">
                        <div className="member-name">K.V.R. Sai Pavan Shanmukh</div>
                        <span className="member-role-badge lead">LEAD ARCHITECT</span>
                      </div>
                      <div className="member-role-title">Core Backend &amp; Full-Stack System Architect</div>
                      <div className="member-contributions">
                        Engineered the Java Spring Boot CAS engine (Phases 1–13), 5 consensus protocols (PoW, PoS, DPoS, PoA, PoL), P2P topologies, RabbitMQ + WebSocket telemetry, React 19 frontend, and Three.js 3D Cosmic Visualizer.
                      </div>
                      <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                        <button
                          className="action-btn"
                          style={{ borderColor: '#ffd700', color: '#ffd700', background: 'rgba(255, 215, 0, 0.1)', padding: '4px 10px', fontSize: '9px' }}
                          onClick={() => setCreatorSpotlightOpen(true)}
                        >
                          SPOTLIGHT ↗
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* BOTTOM EDGE (2 VERTICES) */}
                  <div className="team-hex-row hex-edge">
                    {/* VERTEX 5: V SAI GANESH */}
                    <div className="team-member-card">
                      <div className="member-header">
                        <div className="member-name">V Sai Ganesh</div>
                        <span className="member-role-badge contributor">QA / TESTING</span>
                      </div>
                      <div className="member-role-title">Testing &amp; Quality Assurance</div>
                      <div className="member-contributions">
                        Test case validation, quality assurance workflows, and consensus scenario verification.
                      </div>
                    </div>

                    {/* VERTEX 6: JALADI ROHAN KUMAR */}
                    <div className="team-member-card">
                      <div className="member-header">
                        <div className="member-name">Jaladi Rohan Kumar</div>
                        <span className="member-role-badge contributor">QA / TESTING</span>
                      </div>
                      <div className="member-role-title">Testing &amp; Quality Assurance</div>
                      <div className="member-contributions">
                        Simulation testing execution, scenario verification, and metric output validation.
                      </div>
                    </div>
                  </div>
                </div>

                {/* STANDALONE TECHNICAL ARCHITECTURE BUTTON */}
                <div className="team-standalone-action">
                  <a
                    href="/architecture"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="landing-btn accent-cyan"
                  >
                    TECHNICAL ARCHITECTURE ↗
                  </a>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══ SECTION 5 — SIMULATION ENGINE ═══ */}
          {activeSection === 5 && (
            <motion.div key="s5" className="landing-section" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>
              <div className="section-sim-content">
                <h1 className="section-title size-large">LIVE<br/>ENGINE.</h1>
                <p className="section-desc">
                  Simulate up to 1,000 autonomous agents across PoW, PoS, DPoS, PoA, and PoL consensus. 
                  Observe transaction inclusion, Byzantine equivocation and block withholding, 
                  mainchain stability, fork branching, and Gini wealth distribution in real time.
                </p>
                <div className="sim-stat-row">
                  <div className="sim-stat">
                    <span className="sim-stat-label">CONSENSUS</span>
                    <span className="sim-stat-value">PoW–PoL (5)</span>
                  </div>
                  <div className="sim-stat">
                    <span className="sim-stat-label">MAX NODES</span>
                    <span className="sim-stat-value">UP TO 1000</span>
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
                <h1 className="section-title size-hero" style={{ textAlign: 'center' }}>CHAIN55<br/>PROJECT.</h1>
                <p className="section-desc">
                  A low-cost, repeatable test environment for evaluating blockchain behaviour before real-world deployment—helping researchers understand how participant conduct shapes security, scalability, and reliability to build sturdier distributed ledger systems.
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

      {/* BOTTOM PRIVACY BAR */}
      {!privacyChoice && (
        <div className="landing-bottom">
          <div className="bottom-privacy">
            <div className="bottom-privacy-text"><span className="accent">// PRIVACY</span> Optional analytics help improve this platform. <u style={{ cursor: 'pointer' }}>Details</u></div>
            <button className="privacy-btn" onClick={() => { localStorage.setItem('privacy_choice', 'declined'); setPrivacyChoice('declined'); }}>DECLINE</button>
            <button className="privacy-btn filled" onClick={() => { localStorage.setItem('privacy_choice', 'accepted'); setPrivacyChoice('accepted'); }}>ACCEPT</button>
          </div>
        </div>
      )}

      {/* DEDICATED LEAD CREATOR SPOTLIGHT MODAL (TASK 3) */}
      {creatorSpotlightOpen && (
        <div className="creator-modal-overlay" onClick={() => setCreatorSpotlightOpen(false)}>
          <div className="creator-modal-card" onClick={(e) => e.stopPropagation()}>
            {/* MODAL HEADER */}
            <div className="creator-modal-header">
              <span className="creator-badge">★ LEAD DEVELOPER & FULL-STACK SYSTEM ARCHITECT</span>
              <button
                className="creator-close-btn"
                onClick={() => setCreatorSpotlightOpen(false)}
                title="Close modal (Esc)"
              >
                ✕
              </button>
            </div>

            {/* MODAL BODY */}
            <div className="creator-modal-body">
              <div className="creator-hero">
                <div className="creator-name">K.V.R. Sai Pavan Shanmukh</div>
                <div className="creator-institution">
                  KL UNIVERSITY • DEPT. OF COMPUTER SCIENCE & INFORMATION TECHNOLOGY (BATCH 73)
                </div>
                <div className="creator-role">
                  Lead Developer & Full-Stack System Architect
                </div>
              </div>

              <div className="creator-section-title">CORE TECHNICAL OWNERSHIP & CONTRIBUTIONS</div>
              <div className="creator-feature-list">
                <div className="creator-feature-item">
                  <span className="creator-bullet">✦</span>
                  <div>
                    <strong style={{ color: '#00e5ff' }}>End-to-End System Architecture:</strong> Architected and built the complete platform end-to-end — including the entire React 19 + Vite frontend, the Three.js 3D Cosmic Agent Visualization, the full Java Spring Boot backend & Agent-Based Simulation Engine (Phases 1–13), all 5 consensus algorithms and network topologies, RabbitMQ + WebSocket real-time streaming, statistical experiment framework, and full-stack integration.
                  </div>
                </div>

                <div className="creator-feature-item">
                  <span className="creator-bullet">✦</span>
                  <div>
                    <strong style={{ color: '#ffd700' }}>Spring Boot CAS Simulation Engine:</strong> Engineered all 13 research simulation phases (149 passing empirical tests) with autonomous stateful agents, local blocktrees, solidification pipelines, and LMD GHOST fork choice.
                  </div>
                </div>

                <div className="creator-feature-item">
                  <span className="creator-bullet">✦</span>
                  <div>
                    <strong style={{ color: '#00e5ff' }}>High-Throughput Telemetry Pipeline:</strong> Integrated asynchronous RabbitMQ exchange-to-queue pipelines streaming sub-second STOMP/WebSocket updates of per-tick agent states, dynamic P2P links, and gossip packets.
                  </div>
                </div>

                <div className="creator-feature-item">
                  <span className="creator-bullet">✦</span>
                  <div>
                    <strong style={{ color: '#ffd700' }}>Cosmic 3D WebGL Visualizer:</strong> Built the 60 FPS Three.js agent spectacle featuring procedural swirling spiral particle galaxies, glowing golden quasars, and volcanic craggy meteoroids with thick glowing P2P connections.
                  </div>
                </div>

                <div className="creator-feature-item">
                  <span className="creator-bullet">✦</span>
                  <div>
                    <strong style={{ color: '#00e5ff' }}>Statistical Research Verification:</strong> Implemented empirical verification against premier distributed systems literature (Kraner et al. 2023, Wei et al. 2020, Mueller-Bloch et al. 2022, Lin et al. 2023).
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS & EXTERNAL PORTFOLIO LINK */}
              <div className="creator-actions">
                <a
                  href="https://yellow-sea-03eb87200.4.azurestaticapps.net/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="creator-cta-btn primary"
                  id="creator-portfolio-external-link"
                >
                  VISIT MY PORTFOLIO ↗
                </a>

                <button
                  type="button"
                  className="creator-cta-btn secondary"
                  onClick={handleCopyPortfolio}
                >
                  {portfolioCopied ? '✓ COPIED TO CLIPBOARD' : 'COPY PORTFOLIO LINK ⎘'}
                </button>

                <button
                  type="button"
                  className="creator-cta-btn dim"
                  onClick={() => setCreatorSpotlightOpen(false)}
                >
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
