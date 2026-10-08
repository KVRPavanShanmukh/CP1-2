import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useNavigate } from 'react-router-dom';
import SimulationCursor from '../components/SimulationCursor';
import './Simulation.css'; // We will reuse the immersive-shell styles

// --- GENERATIVE WEBGL ENGINE ---
function DashboardVisualization({ stateIndex }) {
  const pointsRef = useRef();
  const crystalRef = useRef();
  const numParticles = 8000;
  
  const shapes = useMemo(() => {
    const s = {
      idle: new Float32Array(numParticles * 3),    
      sphere1: new Float32Array(numParticles * 3), 
      waves: new Float32Array(numParticles * 3),   
      sphere2: new Float32Array(numParticles * 3), 
      blob: new Float32Array(numParticles * 3),    
    };
    
    for (let i = 0; i < numParticles; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      
      s.idle[i * 3] = (Math.random() - 0.5) * 20;
      s.idle[i * 3 + 1] = (Math.random() - 0.5) * 20;
      s.idle[i * 3 + 2] = (Math.random() - 0.5) * 20;

      const r = 5.0 + (Math.random() * 0.8);
      s.sphere1[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      s.sphere1[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      s.sphere1[i * 3 + 2] = r * Math.cos(phi);

      const waveX = (Math.random() - 0.5) * 15;
      const waveZ = (Math.random() - 0.5) * 6;
      const waveY = Math.sin(waveX * 1.5) * 2.0 + Math.cos(waveZ * 2.5);
      s.waves[i * 3] = waveX;
      s.waves[i * 3 + 1] = waveY + (Math.random() * 1.5 - 0.75);
      s.waves[i * 3 + 2] = waveZ;

      const r2 = 4.5 + (Math.random() * 0.4);
      s.sphere2[i * 3] = r2 * Math.sin(phi) * Math.cos(theta);
      s.sphere2[i * 3 + 1] = r2 * Math.sin(phi) * Math.sin(theta);
      s.sphere2[i * 3 + 2] = r2 * Math.cos(phi);

      s.blob[i * 3] = (r2 * 2.0) * Math.sin(phi) * Math.cos(theta) + (Math.random() - 0.5)*2;
      s.blob[i * 3 + 1] = (r2 * 1.0) * Math.sin(phi) * Math.sin(theta) + (Math.random() - 0.5)*2;
      s.blob[i * 3 + 2] = (r2 * 1.5) * Math.cos(phi) + (Math.random() - 0.5)*2;
    }
    return s;
  }, []);

  const positions = useMemo(() => new Float32Array(shapes.idle), [shapes]);
  const currentColors = useMemo(() => new Float32Array(numParticles * 3), []);

  useFrame((stateObj) => {
    if (!pointsRef.current) return;
    
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
    
    let targetShape = shapes.idle;
    let targetColor = new THREE.Color("#444444"); 
    let targetOpacity = 1.0;

    // SECTION 0: Flowing Network / Technical Depth (Waves, White/Purple)
    // SECTION 1: Cyan Nexus (Sphere2, Cyan)
    // SECTION 2: System Architecture / Network (Waves, Bright White)
    // SECTION 3: Project Vision (Geometric Crystal, Magenta)
    // SECTION 4: Final Overview / Account (Dense Sphere, Lavender)
    
    if (stateIndex === 0) { 
        targetShape = shapes.waves; 
        targetColor = new THREE.Color("#ffffff"); 
    } else if (stateIndex === 1) { 
        targetShape = shapes.sphere2; 
        targetColor = new THREE.Color("#00ffff"); 
        targetColor.multiplyScalar(1.2); 
    } else if (stateIndex === 2) { 
        targetShape = shapes.waves; 
        targetColor = new THREE.Color("#e6e6fa"); 
        targetColor.multiplyScalar(1.5);
    } else if (stateIndex === 3) {
        targetShape = shapes.sphere1;
        targetColor = new THREE.Color("#ff00ff");
        targetOpacity = 0.0; // Hide particles for crystal
    } else if (stateIndex === 4) {
        targetShape = shapes.blob;
        targetColor = new THREE.Color("#9b59b6");
        targetColor.multiplyScalar(1.3);
    }

    for (let i = 0; i < numParticles; i++) {
      const idx = i * 3;
      const noise = (stateIndex === 0 || stateIndex === 2) ? Math.sin(stateObj.clock.elapsedTime * 3 + i) * 0.1 : Math.sin(stateObj.clock.elapsedTime * 1.5 + i) * 0.05;
      
      posAttr.array[idx] = THREE.MathUtils.lerp(posAttr.array[idx], targetShape[idx] + noise, 0.04);
      posAttr.array[idx+1] = THREE.MathUtils.lerp(posAttr.array[idx+1], targetShape[idx+1] + noise, 0.04);
      posAttr.array[idx+2] = THREE.MathUtils.lerp(posAttr.array[idx+2], targetShape[idx+2], 0.04);
      
      let finalColor = targetColor;
      if (stateIndex === 0 && i % 4 === 0) finalColor = new THREE.Color("#d8b4e2"); 

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
        crystalRef.current.scale.setScalar(THREE.MathUtils.lerp(crystalRef.current.scale.x, stateIndex === 3 ? 1 : 0.0, 0.05));
    }
  });

  return (
    <group position={[4, 0, 0]}> 
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={numParticles} array={positions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.04} vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.9} />
      </points>
      <mesh ref={crystalRef} scale={0.001}>
        <octahedronGeometry args={[5, 1]} />
        <meshStandardMaterial color="#ff00ff" wireframe emissive="#ff00ff" emissiveIntensity={3.0} />
      </mesh>
    </group>
  );
}

// --- DASHBOARD COMPONENT ---
export default function Dashboard() {
  const [activeSection, setActiveSection] = useState(0); 
  const [scrollLocked, setScrollLocked] = useState(false);
  const navigate = useNavigate();
  const [privacyChoice, setPrivacyChoice] = useState(localStorage.getItem('privacy_choice'));

  const transactions = [
    { id: 'tx-89a1', type: 'Received', amount: '+500', date: '2026-09-28', status: 'Completed' },
    { id: 'tx-44b2', type: 'Sent', amount: '-150', date: '2026-09-27', status: 'Completed' },
    { id: 'tx-21c3', type: 'Staked', amount: '-1000', date: '2026-09-25', status: 'Active' },
  ];
  
  const sections = [
    { id: 0, title: "PROJECT\nINTRODUCTION.", desc: "We are building an agent-based modelling system for high-frequency distributed networks. The core engine simulates consensus environments in real-time.", btn: "DISCOVER THE ENGINE ↓" },
    { id: 1, title: "THE NEXUS", desc: "The core abstract concept. A densely connected peer-to-peer network acting as a unified entity. Representing the collective intelligence of the distributed system.", btn: "EXPLORE TOPOLOGY ↗" },
    { id: 2, title: "SYSTEM\nARCHITECTURE", desc: "Underneath the nexus lies a scalable, highly concurrent worker architecture. RabbitMQ drives inter-process message propagation seamlessly.", btn: "VIEW ARCHITECTURE ↗" },
    { id: 3, title: "PROJECT\nVISION", desc: "Transforming ambitious ideas into shipped systems. The vision is to provide absolute clarity into decentralized consensus behaviors through flawless execution.", btn: "ENTER THE FIELD ↓" },
    { id: 4, title: "FINAL SYSTEM\nOVERVIEW", desc: "Personal account and simulation metadata dashboard. Monitor your real-time CHN55 token holdings and network status here.", btn: "ACCESS SIMULATION ↗" }
  ];

  const accentColors = [
    '#ffffff', // 00: White Waves
    '#00ffff', // 01: Cyan Nexus
    '#e6e6fa', // 02: White Waves
    '#ff00ff', // 03: Magenta Crystal
    '#9b59b6'  // 04: Lavender Blob
  ];
  const currentAccent = accentColors[activeSection];

  // Wheel Scroll Navigation
  useEffect(() => {
    const handleWheel = (e) => {
      if (scrollLocked) return;
      
      if (e.deltaY > 50 && activeSection < 4) {
        setScrollLocked(true);
        setActiveSection(prev => prev + 1);
        setTimeout(() => setScrollLocked(false), 1200);
      } else if (e.deltaY < -50 && activeSection > 0) {
        setScrollLocked(true);
        setActiveSection(prev => prev - 1);
        setTimeout(() => setScrollLocked(false), 1200);
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [activeSection, scrollLocked]);

  return (
    <div className="immersive-shell" style={{ '--dynamic-accent': currentAccent, cursor: 'none' }}>
      <SimulationCursor activeSection={activeSection} />
      
      {/* 3D WEBGL ENGINE */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1 }}>
        <Canvas camera={{ position: [0, 0, 15], fov: 50 }} dpr={[1, 2]}>
          <color attach="background" args={['#050508']} />
          <ambientLight intensity={0.5} />
          <DashboardVisualization stateIndex={activeSection} />
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
          <div className="brand-text">CHAIN55 / LANDING<br/><span style={{opacity:0.5}}>DASHBOARD EXPERIENCE</span></div>
        </div>
        <div className="nav-links">
          <div className="nav-link" onClick={() => setActiveSection(0)}>Project</div>
          <div className="nav-link" onClick={() => setActiveSection(1)}>Network</div>
          <div className="nav-link" onClick={() => setActiveSection(2)}>Architecture</div>
          <div className="nav-link" style={{ color: 'var(--dynamic-accent)' }} onClick={() => navigate('/simulation')}>Simulation Tool</div>
        </div>
      </nav>

      {/* MAIN CONTENT COMPOSITION */}
      <main className="main-content" style={sections[activeSection].alignRight ? { left: 'auto', right: '100px' } : {}}>
        <AnimatePresence mode="wait">
          <motion.div 
            key={activeSection}
            initial={{ opacity: 0, x: sections[activeSection].alignRight ? 30 : -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: sections[activeSection].alignRight ? -30 : 30 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="meta-label">
              //{String(activeSection + 1).padStart(2, '0')} {sections[activeSection].title.replace('\n', ' ')}
            </span>
            
            <h1 className="huge-title" style={{ whiteSpace: 'pre-line' }}>
              {sections[activeSection].title}
            </h1>
            
            <p className="desc-text">
              {sections[activeSection].desc}
            </p>

            {activeSection === 4 ? (
              <div style={{ marginTop: '2rem' }}>
                <div style={{ marginBottom: '2rem' }}>
                  <span className="meta-label" style={{ marginBottom: '10px' }}>ACCOUNT OVERVIEW (CHN55)</span>
                  <div style={{ fontSize: '3rem', fontWeight: 200, letterSpacing: '-1px' }}>
                    2,450<span style={{ fontSize: '0.4em', opacity: 0.5 }}>.00</span>
                  </div>
                </div>
                
                <span className="meta-label" style={{ marginBottom: '15px' }}>RECENT ACTIVITY</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '400px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px' }}>
                  {transactions.map(tx => (
                    <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>{tx.type}</div>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{tx.date} • {tx.id}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', color: tx.amount.startsWith('+') ? '#fff' : 'rgba(255,255,255,0.6)' }}>{tx.amount} CHN</div>
                        <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', color: tx.status === 'Completed' ? 'rgba(255,255,255,0.4)' : '#fff', marginTop: '2px' }}>{tx.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <button className="hollow-btn" onClick={() => navigate('/simulation')} style={{ marginTop: '30px' }}>
                  {sections[activeSection].btn}
                </button>
              </div>
            ) : (
              <button className="hollow-btn" onClick={() => {
                if(activeSection === 3 || activeSection === 4) navigate('/simulation');
                else setActiveSection(activeSection + 1);
              }}>
                {sections[activeSection].btn}
              </button>
            )}
            
          </motion.div>
        </AnimatePresence>
      </main>

      {/* RIGHT NAVIGATION INDICATORS */}
      <div className="right-nav">
        {sections.map(sec => (
          <div 
            key={sec.id}
            className={`nav-dash ${activeSection === sec.id ? 'active' : ''}`} 
            onClick={() => setActiveSection(sec.id)}
          ></div>
        ))}
      </div>

      {/* BOTTOM METADATA BAR */}
      <div className="bottom-left-meta" style={{ display: 'flex', gap: '2rem' }}>
        <span>IDENTITY / SYSTEM STORY / ABSTRACT VISUALS</span>
        <span style={{ color: '#FFFFFF', cursor: 'pointer' }} onClick={() => navigate('/simulation')}>LAUNCH TOOL ↗</span>
      </div>

      {/* PRIVACY CONSENT BANNER */}
      {!privacyChoice && (
        <div className="privacy-bar">
          <div className="privacy-text">
            <span>// PRIVACY</span> Optional analytics help improve the dashboard. <u>Details</u>
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            <button className="hollow-btn" onClick={() => { localStorage.setItem('privacy_choice', 'declined'); setPrivacyChoice('declined'); }} style={{ fontSize: '9px', padding: '8px 16px', border: 'none', color: 'rgba(255,255,255,0.5)' }}>DECLINE</button>
            <button className="hollow-btn" onClick={() => { localStorage.setItem('privacy_choice', 'accepted'); setPrivacyChoice('accepted'); }} style={{ fontSize: '9px', padding: '8px 16px' }}>ACCEPT</button>
          </div>
        </div>
      )}
    </div>
  );
}
