import React from 'react';
import { motion } from 'framer-motion';

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

const Learning = () => {
  return (
    <motion.div 
      className="page-container"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={itemVariants} style={{ marginBottom: '6rem' }}>
        <h1>Learning <span className="serif">Notes</span></h1>
        <p style={{ marginTop: '1.5rem', maxWidth: '600px' }}>Comprehensive notes on blockchain architecture, simulation mechanics, and consensus theories.</p>
      </motion.div>

      <div className="grid-layout">
        <motion.div className="col-span-12 kott-card" variants={itemVariants} style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>1. Agent-Based Modelling (ABM)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ paddingBottom: '1rem' }}>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.8' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Overview:</strong> Agent-based modeling represents systems by programming the behaviors of individual entities (agents) and simulating their interactions. In blockchain research, traditional models often assume homogeneous participant behavior. ABM diverges by giving each node distinct behavioral profiles (honest, malicious, inactive, latency-prone).
              </p>
              <ul style={{ color: 'var(--text-secondary)', paddingLeft: '1.5rem', marginTop: '1rem', lineHeight: '1.8' }}>
                <li><strong>Honest Agents:</strong> Validate blocks strictly according to consensus rules.</li>
                <li><strong>Malicious Agents:</strong> Attempt selfish mining, withholding blocks, or Sybil attacks.</li>
                <li><strong>Emergent Behavior:</strong> The macro-level health of the blockchain (e.g., fork rate) emerges organically from these micro-level interactions.</li>
              </ul>
            </div>
          </div>
        </motion.div>

        <motion.div className="col-span-12 kott-card" variants={itemVariants} style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>2. Consensus Mechanisms</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <h4 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>Proof of Work (PoW)</h4>
              <p style={{ color: 'var(--text-secondary)' }}>Nodes (miners) compete to solve a cryptographic puzzle. Requires high energy but offers robust security against Sybil attacks. Often leads to a centralized mining pool ecosystem.</p>
            </div>
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <h4 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>Proof of Stake (PoS)</h4>
              <p style={{ color: 'var(--text-secondary)' }}>Validators are chosen to create blocks based on the number of tokens they "stake" (lock up). Highly energy-efficient but risks a "rich get richer" scenario (Gini coefficient rise).</p>
            </div>
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <h4 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>Delegated PoS (DPoS)</h4>
              <p style={{ color: 'var(--text-secondary)' }}>Token holders vote for a select group of delegates (block producers). Offers extreme scalability and low latency but sacrifices absolute decentralization.</p>
            </div>
            <div>
              <h4 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>Proof of Authority (PoA)</h4>
              <p style={{ color: 'var(--text-secondary)' }}>Block validators are known and approved entities (identity as a stake). Ideal for private/consortium blockchains.</p>
            </div>
          </div>
        </motion.div>

        <motion.div className="col-span-12 kott-card" variants={itemVariants} style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>3. Network Topologies</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ paddingBottom: '1rem' }}>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.8' }}>
                The physical and logical structure of the peer-to-peer (P2P) network determines how fast blocks and transactions propagate (gossip protocol).
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', marginTop: '1.5rem' }}>
                <div>
                  <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Erdos-Renyi (Random)</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Edges between nodes are created randomly with equal probability. Serves as a baseline but rarely reflects real-world networks.</p>
                </div>
                <div>
                  <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Small-World</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Most nodes are not neighbors, but neighbors of any given node are likely neighbors of each other. Allows for incredibly fast network-wide broadcast.</p>
                </div>
                <div>
                  <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Scale-Free</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>A few nodes (hubs) have an extremely high number of connections, while most have very few. Highly resilient to random node failure but vulnerable to targeted attacks on hubs.</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div className="col-span-12 kott-card" variants={itemVariants}>
          <h3 style={{ marginBottom: '2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>4. Block Gossip Latency & Forking</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ paddingBottom: '1rem' }}>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.8' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Gossip Protocol:</strong> The method by which nodes broadcast new transactions and blocks to their peers. It's an epidemic routing protocol.
              </p>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.8', marginTop: '1rem' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Latency & Branching Ratio:</strong> If latency (the time it takes for a block to reach the entire network) is too high relative to the block generation time (Slot Duration), multiple nodes might mine/create valid blocks at the same height. This creates a <strong>fork</strong>. A higher branching ratio indicates a less stable network fighting to find the true mainchain.
              </p>
            </div>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
};

export default Learning;
