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
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
};

const Learning = () => {
  return (
    <motion.div 
      className="page-container"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={itemVariants} style={{ marginBottom: '3.5rem' }}>
        <h1 style={{ color: '#ffffff' }}>Learning <span className="serif" style={{ color: '#00e5ff' }}>Foundations</span></h1>
        <p style={{ marginTop: '1.2rem', maxWidth: '720px', color: '#f1f5f9', fontSize: '1.05rem', lineHeight: '1.8' }}>
          Rigorous theoretical reference on Complex Adaptive Systems, Agent-Based Modeling, Consensus Algorithms, P2P Topologies, and Adversarial Dynamics within the CHAIN55 Consensus Simulation Engine.
        </p>
        <div className="doc-links">
          <Link className="doc-link" to="/simulation">Launch Simulation Engine ↗</Link>
          <a className="doc-link" href="/architecture" target="_blank" rel="noopener noreferrer">Technical Architecture Spec ↗</a>
          <Link className="doc-link" to="/manual">Simulation Manual ↗</Link>
          <Link className="doc-link" to="/abstract">Research Abstract ↗</Link>
        </div>
      </motion.div>

      <div className="grid-layout">
        {/* MODULE 1: CAS & ABM */}
        <motion.div className="col-span-12 kott-card" variants={itemVariants} style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(0, 229, 255, 0.2)', paddingBottom: '0.8rem' }}>
            <h3 style={{ textTransform: 'uppercase', letterSpacing: '0.12em', color: '#00e5ff', margin: 0, fontSize: '1.05rem' }}>
              01 • Complex Adaptive Systems (CAS) & Agent-Based Modeling (ABM)
            </h3>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#f1f5f9', letterSpacing: '1px' }}>
              MICRO-RULES → MACRO-EMERGENCE
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <p style={{ color: '#f1f5f9', lineHeight: '1.85' }}>
              <strong style={{ color: '#ffffff' }}>The CAS Paradigm:</strong> Blockchains are canonical Complex Adaptive Systems. They cannot be accurately characterized by traditional deterministic queuing models because participants adapt their strategies dynamically to local observations, network latency, economic incentives, and peer connectivity.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '16px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <h4 style={{ color: '#00e5ff', fontSize: '0.9rem', marginBottom: '8px' }}>Micro-Level Autonomous Agents</h4>
                <p style={{ color: '#e2e8f0', fontSize: '0.88rem', lineHeight: '1.7' }}>
                  Each node operates with its own private state: cryptographic identity, local transaction mempool, local view of the block Directed Acyclic Graph (DAG), stake/hashpower balance, and routing tables. Nodes communicate solely via gossip protocols with discrete propagation delays.
                </p>
              </div>
              <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '16px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <h4 style={{ color: '#00e5ff', fontSize: '0.9rem', marginBottom: '8px' }}>Macro-Level Emergence</h4>
                <p style={{ color: '#e2e8f0', fontSize: '0.88rem', lineHeight: '1.7' }}>
                  System-wide properties—such as canonical chain stability, branching ratio, Byzantine fault tolerance, finality delay, and wealth concentration (Gini coefficient)—emerge organically without any central coordinator.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* MODULE 2: CONSENSUS MECHANISMS & LMD-GHOST */}
        <motion.div className="col-span-12 kott-card" variants={itemVariants} style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(0, 229, 255, 0.2)', paddingBottom: '0.8rem' }}>
            <h3 style={{ textTransform: 'uppercase', letterSpacing: '0.12em', color: '#00e5ff', margin: 0, fontSize: '1.05rem' }}>
              02 • Consensus Paradigms & LMD-GHOST Fork Choice
            </h3>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#f1f5f9', letterSpacing: '1px' }}>
              5 PROTOCOLS + WEIGHT-ACCUMULATION
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '16px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <h4 style={{ color: '#ffffff', fontSize: '0.95rem' }}>Proof of Work (PoW)</h4>
                <span style={{ color: '#f59e0b', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>HASHPOWER</span>
              </div>
              <p style={{ color: '#e2e8f0', fontSize: '0.86rem', lineHeight: '1.7' }}>
                Miners race to compute a cryptographic nonce satisfying difficulty targets. Resolves forks via the longest-chain (heaviest cumulative work) rule. Robust against Sybil attacks but energy-intensive.
              </p>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '16px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <h4 style={{ color: '#ffffff', fontSize: '0.95rem' }}>Proof of Stake (PoS)</h4>
                <span style={{ color: '#10b981', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>DEPOSIT WEIGHT</span>
              </div>
              <p style={{ color: '#e2e8f0', fontSize: '0.86rem', lineHeight: '1.7' }}>
                Block proposal probability is strictly proportional to staked tokens. Eliminates compute waste. Monitored for wealth concentration via dynamic Gini coefficient tracking.
              </p>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '16px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <h4 style={{ color: '#ffffff', fontSize: '0.95rem' }}>Delegated PoS (DPoS)</h4>
                <span style={{ color: '#3b82f6', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>WITNESS ROTATION</span>
              </div>
              <p style={{ color: '#e2e8f0', fontSize: '0.86rem', lineHeight: '1.7' }}>
                Community stakeholders elect a fixed committee of delegates (witnesses) who validate slots in deterministic round-robin order, providing high throughput and sub-second confirmation.
              </p>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '16px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <h4 style={{ color: '#ffffff', fontSize: '0.95rem' }}>Proof of Authority (PoA)</h4>
                <span style={{ color: '#ec4899', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>REPUTATION</span>
              </div>
              <p style={{ color: '#e2e8f0', fontSize: '0.86rem', lineHeight: '1.7' }}>
                Pre-approved authority identities validate blocks sequentially. Optimal for enterprise federations, zero computational overhead, and deterministic throughput.
              </p>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '16px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <h4 style={{ color: '#ffffff', fontSize: '0.95rem' }}>Proof of Location (PoL)</h4>
                <span style={{ color: '#8b5cf6', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>GEOSPATIAL MULTILATERATION</span>
              </div>
              <p style={{ color: '#e2e8f0', fontSize: '0.86rem', lineHeight: '1.7' }}>
                Validators prove physical presence within geographic boundaries using round-trip latency bounding and multi-lateration beacons. Enforces spatial decentralization.
              </p>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '16px', borderRadius: '4px', border: '1px solid rgba(0, 229, 255, 0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <h4 style={{ color: '#00e5ff', fontSize: '0.95rem' }}>LMD-GHOST Fork Choice</h4>
                <span style={{ color: '#00e5ff', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>SLOTS & ATTESTATIONS</span>
              </div>
              <p style={{ color: '#e2e8f0', fontSize: '0.86rem', lineHeight: '1.7' }}>
                <strong>Latest Message Driven GHOST:</strong> At each slot fork, validators cast votes (attestations). The fork-choice traverses the block tree starting from the finalized root, choosing the subtree with the highest cumulative attestation weight rather than the raw longest branch.
              </p>
            </div>
          </div>
        </motion.div>

        {/* MODULE 3: TOPOLOGIES & PHASE TRANSITION LAW */}
        <motion.div className="col-span-12 kott-card" variants={itemVariants} style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(0, 229, 255, 0.2)', paddingBottom: '0.8rem' }}>
            <h3 style={{ textTransform: 'uppercase', letterSpacing: '0.12em', color: '#00e5ff', margin: 0, fontSize: '1.05rem' }}>
              03 • Network Topologies & The Phase Transition Criterion
            </h3>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#f1f5f9', letterSpacing: '1px' }}>
              PROPAGATION LATENCY & TOPOLOGICAL DIAMETER
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.8rem' }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '16px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <h4 style={{ color: '#ffffff', fontSize: '0.95rem', marginBottom: '8px' }}>Erdős–Rényi Random Graph</h4>
              <p style={{ color: '#e2e8f0', fontSize: '0.86rem', lineHeight: '1.7' }}>
                Edges are instantiated with uniform probability <code style={{ color: '#00e5ff' }}>p</code> across all pairs. Displays a Poisson degree distribution. Ideal baseline for theoretical analysis without clustered routing.
              </p>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '16px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <h4 style={{ color: '#ffffff', fontSize: '0.95rem', marginBottom: '8px' }}>Watts–Strogatz Small-World</h4>
              <p style={{ color: '#e2e8f0', fontSize: '0.86rem', lineHeight: '1.7' }}>
                High clustering coefficient coupled with low average path length <code style={{ color: '#00e5ff' }}>L</code>. Accurately reflects real-world P2P peer tables, enabling rapid epidemic message spread.
              </p>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '16px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <h4 style={{ color: '#ffffff', fontSize: '0.95rem', marginBottom: '8px' }}>Barabási–Albert Scale-Free</h4>
              <p style={{ color: '#e2e8f0', fontSize: '0.86rem', lineHeight: '1.7' }}>
                Follows power-law degree distribution <code style={{ color: '#00e5ff' }}>P(k) ~ k⁻ᵞ</code> generated via preferential attachment. Highly robust against random node dropouts, but prone to eclipse attacks if superhubs are partitioned.
              </p>
            </div>
          </div>

          <div style={{ background: 'rgba(0, 229, 255, 0.06)', border: '1px solid rgba(0, 229, 255, 0.35)', padding: '20px', borderRadius: '4px' }}>
            <h4 style={{ color: '#00e5ff', fontSize: '0.95rem', marginBottom: '8px', letterSpacing: '1px' }}>
              THE CRITICAL PHASE TRANSITION LAW
            </h4>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', color: '#ffffff', padding: '10px 0', fontWeight: 700 }}>
              D(G) · τ_block &gt; T_slot
            </div>
            <p style={{ color: '#f1f5f9', fontSize: '0.9rem', lineHeight: '1.7', margin: 0 }}>
              Where <strong style={{ color: '#ffffff' }}>D(G)</strong> represents network graph diameter (maximum hop distance between any two nodes), <strong style={{ color: '#ffffff' }}>τ_block</strong> is block gossip latency per hop including network jitter, and <strong style={{ color: '#ffffff' }}>T_slot</strong> is the slot duration. When propagation exceeds the slot boundary, nodes make decisions on stale state, triggering an abrupt phase transition from a stable single-chain regime into severe fork branching and high reorganization rates.
            </p>
          </div>
        </motion.div>

        {/* MODULE 4: ADVERSARIAL & FAULT SCENARIOS */}
        <motion.div className="col-span-12 kott-card" variants={itemVariants} style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(0, 229, 255, 0.2)', paddingBottom: '0.8rem' }}>
            <h3 style={{ textTransform: 'uppercase', letterSpacing: '0.12em', color: '#00e5ff', margin: 0, fontSize: '1.05rem' }}>
              04 • Adversarial Strategies & Network Fault Scenarios
            </h3>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#f1f5f9', letterSpacing: '1px' }}>
              BYZANTINE ATTACKS & PHYSICAL DEFECTS
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '16px', borderRadius: '4px' }}>
              <h4 style={{ color: '#f87171', fontSize: '0.92rem', marginBottom: '8px' }}>Equivocation Attack (Double Signing)</h4>
              <p style={{ color: '#f1f5f9', fontSize: '0.86rem', lineHeight: '1.7' }}>
                A Byzantine validator creates and signs two distinct conflicting blocks or attestations for the exact same slot height, broadcasting one to partition A and the other to partition B to induce split-brain consensus.
              </p>
            </div>

            <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '16px', borderRadius: '4px' }}>
              <h4 style={{ color: '#f87171', fontSize: '0.92rem', marginBottom: '8px' }}>Block Withholding (Selfish Mining)</h4>
              <p style={{ color: '#f1f5f9', fontSize: '0.86rem', lineHeight: '1.7' }}>
                Adversaries discover valid blocks but withhold them secretly while honest nodes expend resources on an older state. The adversary releases the private branch precisely to invalidate and orphan the honest blocks.
              </p>
            </div>

            <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '16px', borderRadius: '4px' }}>
              <h4 style={{ color: '#f87171', fontSize: '0.92rem', marginBottom: '8px' }}>Invalid Block Proposals</h4>
              <p style={{ color: '#f1f5f9', fontSize: '0.86rem', lineHeight: '1.7' }}>
                Malicious nodes broadcast syntactically or state-transition invalid payloads (e.g., double-spent UTXOs, fraudulent state roots) to stress and throttle validation pipelines across the peer network.
              </p>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '16px', borderRadius: '4px' }}>
              <h4 style={{ color: '#ffffff', fontSize: '0.92rem', marginBottom: '8px' }}>Inactive Nodes & Packet Loss</h4>
              <p style={{ color: '#e2e8f0', fontSize: '0.86rem', lineHeight: '1.7' }}>
                Simulates real-world infrastructure failures where a fraction of validators drop offline (0–1 ratio) or network links drop packets stochastically, forcing gossip re-broadcasts and reducing quorum finality speeds.
              </p>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '16px', borderRadius: '4px' }}>
              <h4 style={{ color: '#ffffff', fontSize: '0.92rem', marginBottom: '8px' }}>Network Partitions</h4>
              <p style={{ color: '#e2e8f0', fontSize: '0.86rem', lineHeight: '1.7' }}>
                Simulates undersea cable cuts or regional firewall isolations from <code style={{ color: '#00e5ff' }}>T_start</code> to <code style={{ color: '#00e5ff' }}>T_end</code>. Evaluates CAP-theorem tradeoffs: whether forks continue growing independently and how the network resolves reorganization upon healing.
              </p>
            </div>
          </div>
        </motion.div>

        {/* MODULE 5: READING CHAIN55 METRICS */}
        <motion.div className="col-span-12 kott-card" variants={itemVariants}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(0, 229, 255, 0.2)', paddingBottom: '0.8rem' }}>
            <h3 style={{ textTransform: 'uppercase', letterSpacing: '0.12em', color: '#00e5ff', margin: 0, fontSize: '1.05rem' }}>
              05 • Reading & Interpreting CHAIN55 Research Metrics
            </h3>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#f1f5f9', letterSpacing: '1px' }}>
              ACADEMIC VERIFICATION BENCHMARKS
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '18px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <h4 style={{ color: '#ffffff', fontSize: '0.95rem' }}>Mainchain Rate (μ)</h4>
                <span style={{ color: '#00e5ff', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>[0.0, 1.0]</span>
              </div>
              <p style={{ color: '#f1f5f9', fontSize: '0.88rem', lineHeight: '1.7' }}>
                The ratio of canonical blocks that became permanent history to total blocks produced: <code style={{ color: '#00e5ff' }}>μ = B_main / B_total</code>. A rate near 1.0 indicates perfect network convergence; rates dropping below 0.70 indicate high orphan rates and consensus degradation.
              </p>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '18px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <h4 style={{ color: '#ffffff', fontSize: '0.95rem' }}>Branching Ratio (F)</h4>
                <span style={{ color: '#00e5ff', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>FORK INTENSITY</span>
              </div>
              <p style={{ color: '#f1f5f9', fontSize: '0.88rem', lineHeight: '1.7' }}>
                Measures chain divergence: <code style={{ color: '#00e5ff' }}>F = B_fork / B_main</code>. Under honest conditions with small latency, <code style={{ color: '#00e5ff' }}>F ≈ 0.0</code>. Under high network latency or Byzantine balancing attacks, <code style={{ color: '#00e5ff' }}>F &gt; 0.50</code> signals intense chain competition.
              </p>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '18px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <h4 style={{ color: '#ffffff', fontSize: '0.95rem' }}>Gini Coefficient (G)</h4>
                <span style={{ color: '#00e5ff', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>[0.0, 1.0]</span>
              </div>
              <p style={{ color: '#f1f5f9', fontSize: '0.88rem', lineHeight: '1.7' }}>
                Measures wealth and reward distribution inequality among agents. <code style={{ color: '#00e5ff' }}>G = 0</code> indicates absolute equality in block production, whereas <code style={{ color: '#00e5ff' }}>G → 1.0</code> flags validator centralization and oligopolistic capture.
              </p>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '18px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <h4 style={{ color: '#ffffff', fontSize: '0.95rem' }}>Throughput (TPS) & Finality</h4>
                <span style={{ color: '#00e5ff', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>EXECUTION SPEED</span>
              </div>
              <p style={{ color: '#f1f5f9', fontSize: '0.88rem', lineHeight: '1.7' }}>
                Real-time transactions committed per tick/second and the average slot delta required for deterministic finality under given adversarial load.
              </p>
            </div>
          </div>
        </motion.div>

        {/* MODULE 6: PLATFORM ARCHITECTURE & TECHNOLOGY STACK */}
        <motion.div className="col-span-12 kott-card" variants={itemVariants} style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(0, 229, 255, 0.2)', paddingBottom: '0.8rem' }}>
            <h3 style={{ textTransform: 'uppercase', letterSpacing: '0.12em', color: '#00e5ff', margin: 0, fontSize: '1.05rem' }}>
              06 • Platform Architecture &amp; Technology Stack
            </h3>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#f1f5f9', letterSpacing: '1px' }}>
              IMPLEMENTATION &amp; RUNTIME STACK
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '18px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <h4 style={{ color: '#ffffff', fontSize: '0.95rem', marginBottom: '8px' }}>Spring Boot CAS Engine</h4>
              <p style={{ color: '#e2e8f0', fontSize: '0.86rem', lineHeight: '1.7' }}>
                Java 17 &amp; Spring Boot orchestrate the simulation engine, REST APIs, Spring Security authentication, and multi-seed statistical experiment runners verified by automated JUnit 5 tests.
              </p>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '18px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <h4 style={{ color: '#ffffff', fontSize: '0.95rem', marginBottom: '8px' }}>MongoDB Persistence</h4>
              <p style={{ color: '#e2e8f0', fontSize: '0.86rem', lineHeight: '1.7' }}>
                Spring Data MongoDB persists simulation configurations, execution history, final metrics, BCrypt user accounts, teams, and research blog posts.
              </p>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '18px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <h4 style={{ color: '#ffffff', fontSize: '0.95rem', marginBottom: '8px' }}>RabbitMQ &amp; STOMP WebSocket</h4>
              <p style={{ color: '#e2e8f0', fontSize: '0.86rem', lineHeight: '1.7' }}>
                RabbitMQ decouples simulation job queuing from background worker execution, while STOMP over WebSocket (SockJS) streams live tick updates and telemetry to clients.
              </p>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '18px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <h4 style={{ color: '#ffffff', fontSize: '0.95rem', marginBottom: '8px' }}>React 19, Vite &amp; Three.js WebGL</h4>
              <p style={{ color: '#e2e8f0', fontSize: '0.86rem', lineHeight: '1.7' }}>
                React 19, Vite, Framer Motion, and Three.js / React Three Fiber deliver the interactive parameter studio, live SVG telemetry charts, and 3D cosmic agent network visualizer.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Learning;
