import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import './InfoPages.css';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.76, 0, 0.24, 1] } }
};

export default function Architecture() {
  return (
    <motion.div
      className="page-container"
      variants={containerVariants}
      initial="hidden"
      animate="show"
      style={{ background: '#020204', minHeight: '100vh', color: '#ffffff' }}
    >
      <motion.div variants={itemVariants} style={{ marginBottom: '3.5rem' }}>
        <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.75rem', letterSpacing: '2px', color: '#00e5ff', marginBottom: '8px', textTransform: 'uppercase' }}>
          // SYSTEM ARCHITECTURE SPECIFICATION
        </div>
        <h1 style={{ color: '#ffffff', fontWeight: 200, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
          TECHNICAL <span className="serif" style={{ color: '#00e5ff', fontStyle: 'italic' }}>ARCHITECTURE</span>
        </h1>
        <p style={{ marginTop: '1rem', maxWidth: '780px', color: '#f1f5f9', fontSize: '1.05rem', lineHeight: '1.7' }}>
          A complete architectural breakdown of the <strong>CHAIN55</strong> Complex Adaptive Systems (CAS) Distributed Ledger Simulation Platform — explaining every technology, its role, and how it contributes to the ecosystem.
        </p>
        <div className="doc-links" style={{ marginTop: '1.5rem', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <Link className="doc-link" to="/simulation" style={{ color: '#00e5ff', border: '1px solid rgba(0,229,255,0.3)', padding: '6px 14px', borderRadius: '3px', textDecoration: 'none' }}>LAUNCH SIMULATOR ↗</Link>
          <Link className="doc-link" to="/agent" style={{ color: '#ffd700', border: '1px solid rgba(255,215,0,0.3)', padding: '6px 14px', borderRadius: '3px', textDecoration: 'none' }}>3D AGENT SPECTACLE ↗</Link>
          <Link className="doc-link" to="/learning" style={{ color: '#ffffff', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 14px', borderRadius: '3px', textDecoration: 'none' }}>LEARNING NOTES ↗</Link>
          <Link className="doc-link" to="/dashboard" style={{ color: '#ffffff', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 14px', borderRadius: '3px', textDecoration: 'none' }}>LEDGER DASHBOARD ↗</Link>
        </div>
      </motion.div>

      <div className="grid-layout" style={{ maxWidth: '1180px' }}>
        {/* 1. FRONTEND STACK */}
        <motion.div className="col-span-12 kott-card" variants={itemVariants} style={{ background: 'rgba(6, 10, 18, 0.85)', border: '1px solid rgba(0, 229, 255, 0.25)', borderRadius: '6px', padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.12)', paddingBottom: '14px', marginBottom: '20px' }}>
            <h3 style={{ color: '#00e5ff', margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '1.15rem' }}>
              1. FRONTEND & 3D VISUALIZATION LAYER
            </h3>
            <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.75rem', color: '#ffd700', background: 'rgba(255, 215, 0, 0.1)', padding: '3px 8px', borderRadius: '3px', border: '1px solid rgba(255, 215, 0, 0.3)' }}>
              CLIENT-SIDE RUNTIME
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div>
              <h4 style={{ color: '#ffffff', fontSize: '0.95rem', marginBottom: '6px' }}>React 19 & Vite</h4>
              <p style={{ color: '#f1f5f9', fontSize: '0.9rem', lineHeight: '1.65' }}>
                Powers the reactive user interface with sub-second hot module reloading, lightning-fast ES build pipelines, modular component architecture, and responsive state management across all pages.
              </p>
            </div>
            <div>
              <h4 style={{ color: '#ffffff', fontSize: '0.95rem', marginBottom: '6px' }}>Three.js & WebGL 60 FPS Engine</h4>
              <p style={{ color: '#f1f5f9', fontSize: '0.9rem', lineHeight: '1.65' }}>
                Renders procedural swirling spiral particle galaxies for honest nodes, radiant golden quasars with pulse rings for slot proposers, craggy molten meteoroids for Byzantine adversaries, and thick glowing 3D P2P cylinder edges connecting network neighbors.
              </p>
            </div>
            <div>
              <h4 style={{ color: '#ffffff', fontSize: '0.95rem', marginBottom: '6px' }}>Framer Motion & Custom Glassmorphism</h4>
              <p style={{ color: '#f1f5f9', fontSize: '0.9rem', lineHeight: '1.65' }}>
                Drives cinematic section-to-section narrative transitions, responsive drawer overlays, spring-physics modals, and custom dark-space cyber aesthetics.
              </p>
            </div>
            <div>
              <h4 style={{ color: '#ffffff', fontSize: '0.95rem', marginBottom: '6px' }}>Oxlint & Code Quality Tooling</h4>
              <p style={{ color: '#f1f5f9', fontSize: '0.9rem', lineHeight: '1.65' }}>
                Provides fast static code analysis, enforcing clean imports, strict hook semantics, and high client-side runtime reliability.
              </p>
            </div>
          </div>
        </motion.div>

        {/* 2. BACKEND & CAS ENGINE */}
        <motion.div className="col-span-12 kott-card" variants={itemVariants} style={{ background: 'rgba(6, 10, 18, 0.85)', border: '1px solid rgba(255, 215, 0, 0.25)', borderRadius: '6px', padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.12)', paddingBottom: '14px', marginBottom: '20px' }}>
            <h3 style={{ color: '#ffd700', margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '1.15rem' }}>
              2. BACKEND COMPLEX ADAPTIVE SYSTEMS (CAS) ENGINE
            </h3>
            <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.75rem', color: '#00e5ff', background: 'rgba(0, 229, 255, 0.1)', padding: '3px 8px', borderRadius: '3px', border: '1px solid rgba(0, 229, 255, 0.3)' }}>
              JAVA 17 • SPRING BOOT
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div>
              <h4 style={{ color: '#ffffff', fontSize: '0.95rem', marginBottom: '6px' }}>Autonomous Agent Architecture</h4>
              <p style={{ color: '#f1f5f9', fontSize: '0.9rem', lineHeight: '1.65' }}>
                Every participant node is instantiated as an independent stateful agent (<code style={{ color: '#00e5ff' }}>BlockchainAgent</code>, <code style={{ color: '#ffd700' }}>ByzantineNodeAgent</code>) with its own local blocktree, mempool, stake/hashpower, attestations, and solidification engine.
              </p>
            </div>
            <div>
              <h4 style={{ color: '#ffffff', fontSize: '0.95rem', marginBottom: '6px' }}>5 Consensus Protocols (Strategy Pattern)</h4>
              <p style={{ color: '#f1f5f9', fontSize: '0.9rem', lineHeight: '1.65' }}>
                Implements modular consensus strategies: <strong>Proof of Work (PoW)</strong> difficulty target hashing, <strong>Proof of Stake (PoS)</strong> proportional selection, <strong>Delegated PoS (DPoS)</strong> witness voting, <strong>Proof of Authority (PoA)</strong> signer rotation, and <strong>Proof of Location (PoL)</strong> latency-proximity scoring.
              </p>
            </div>
            <div>
              <h4 style={{ color: '#ffffff', fontSize: '0.95rem', marginBottom: '6px' }}>LMD GHOST Fork Choice Engine</h4>
              <p style={{ color: '#f1f5f9', fontSize: '0.9rem', lineHeight: '1.65' }}>
                Latest Message Driven Greediest Heaviest Observed Subtree (Kraner et al. 2023) evaluates slot attestation weight vectors to converge canonical heads across distributed networks.
              </p>
            </div>
            <div>
              <h4 style={{ color: '#ffffff', fontSize: '0.95rem', marginBottom: '6px' }}>Heterogeneous Network & Adversity Model</h4>
              <p style={{ color: '#f1f5f9', fontSize: '0.9rem', lineHeight: '1.65' }}>
                Generates <strong>Erdős–Rényi</strong>, <strong>Watts–Strogatz Small-World</strong>, and <strong>Barabási–Albert Scale-Free</strong> topologies with distance-based delays, latency jitter, packet drops, partition splits, and Byzantine attacks (equivocation, block withholding).
              </p>
            </div>
          </div>
        </motion.div>

        {/* 3. DATABASE & PERSISTENCE */}
        <motion.div className="col-span-12 kott-card" variants={itemVariants} style={{ background: 'rgba(6, 10, 18, 0.85)', border: '1px solid rgba(0, 255, 200, 0.25)', borderRadius: '6px', padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.12)', paddingBottom: '14px', marginBottom: '20px' }}>
            <h3 style={{ color: '#00ffc8', margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '1.15rem' }}>
              3. DATABASE & PERSISTENCE LAYER
            </h3>
            <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.75rem', color: '#00ffc8', background: 'rgba(0, 255, 200, 0.1)', padding: '3px 8px', borderRadius: '3px', border: '1px solid rgba(0, 255, 200, 0.3)' }}>
              MONGODB • SPRING DATA
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div>
              <h4 style={{ color: '#ffffff', fontSize: '0.95rem', marginBottom: '6px' }}>MongoDB Document Store</h4>
              <p style={{ color: '#f1f5f9', fontSize: '0.9rem', lineHeight: '1.65' }}>
                Stores simulation configurations, comprehensive historical execution traces, final consensus metrics, user credentials with BCrypt hashing, and researcher research posts.
              </p>
            </div>
            <div>
              <h4 style={{ color: '#ffffff', fontSize: '0.95rem', marginBottom: '6px' }}>Spring Data MongoDB Repositories</h4>
              <p style={{ color: '#f1f5f9', fontSize: '0.9rem', lineHeight: '1.65' }}>
                Provides structured object-document mapping (ODM), query optimization, indexing on simulation IDs and run timestamps, and schema validation.
              </p>
            </div>
          </div>
        </motion.div>

        {/* 4. ASYNC WORKER & REAL-TIME STREAMING */}
        <motion.div className="col-span-12 kott-card" variants={itemVariants} style={{ background: 'rgba(6, 10, 18, 0.85)', border: '1px solid rgba(168, 85, 247, 0.25)', borderRadius: '6px', padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.12)', paddingBottom: '14px', marginBottom: '20px' }}>
            <h3 style={{ color: '#c084fc', margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '1.15rem' }}>
              4. ASYNC TELEMETRY & MESSAGE BROKER
            </h3>
            <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.75rem', color: '#c084fc', background: 'rgba(168, 85, 247, 0.1)', padding: '3px 8px', borderRadius: '3px', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
              RABBITMQ • STOMP WEBSOCKET
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div>
              <h4 style={{ color: '#ffffff', fontSize: '0.95rem', marginBottom: '6px' }}>RabbitMQ Simulation Queue</h4>
              <p style={{ color: '#f1f5f9', fontSize: '0.9rem', lineHeight: '1.65' }}>
                Decouples simulation triggering from compute execution. Heavy consensus simulation jobs are published to durable AMQP queues and processed asynchronously by background worker daemons.
              </p>
            </div>
            <div>
              <h4 style={{ color: '#ffffff', fontSize: '0.95rem', marginBottom: '6px' }}>Spring WebSocket & STOMP / SockJS</h4>
              <p style={{ color: '#f1f5f9', fontSize: '0.9rem', lineHeight: '1.65' }}>
                Pushes sub-second tick updates, live agent status transitions, network packet transmissions, and macro-metrics directly to the React frontend and Three.js canvas in real-time.
              </p>
            </div>
          </div>
        </motion.div>

        {/* 5. INFRASTRUCTURE & SCIENTIFIC VERIFICATION */}
        <motion.div className="col-span-12 kott-card" variants={itemVariants} style={{ background: 'rgba(6, 10, 18, 0.85)', border: '1px solid rgba(255, 255, 255, 0.25)', borderRadius: '6px', padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.12)', paddingBottom: '14px', marginBottom: '20px' }}>
            <h3 style={{ color: '#ffffff', margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '1.15rem' }}>
              5. INFRASTRUCTURE & 149 AUTOMATED VERIFICATION TESTS
            </h3>
            <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.75rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '3px 8px', borderRadius: '3px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              149 / 149 PASSING TESTS
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div>
              <h4 style={{ color: '#ffffff', fontSize: '0.95rem', marginBottom: '6px' }}>Docker Compose Deployment</h4>
              <p style={{ color: '#f1f5f9', fontSize: '0.9rem', lineHeight: '1.65' }}>
                Multi-container orchestration packaging the Spring Boot backend, MongoDB instance, RabbitMQ broker with management UI, and Vite frontend for reproducible cross-platform execution.
              </p>
            </div>
            <div>
              <h4 style={{ color: '#ffffff', fontSize: '0.95rem', marginBottom: '6px' }}>149 Automated Maven JUnit 5 Tests</h4>
              <p style={{ color: '#f1f5f9', fontSize: '0.9rem', lineHeight: '1.65' }}>
                Comprehensive empirical test suite covering all 13 research phases (agent behaviour, mempools, 5 consensus models, P2P topologies, latency phase-transitions, Byzantine resilience, multi-seed statistical significance, and Gini wealth distributions).
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
