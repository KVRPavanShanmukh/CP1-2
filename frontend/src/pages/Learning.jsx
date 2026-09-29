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
        <h1>Learning <span className="serif">Resources</span></h1>
        <p style={{ marginTop: '1.5rem', maxWidth: '600px' }}>Tech stack and architectural details for Chain55.</p>
      </motion.div>

      <div className="grid-layout">
        <motion.div className="col-span-6 kott-card" variants={itemVariants}>
          <h3 style={{ marginBottom: '2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Frontend Technologies</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '2rem' }}>
              <h4 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>React & Vite</h4>
              <p style={{ color: 'var(--text-secondary)' }}>We use React for building our dynamic UI components and Vite for fast development and optimized building.</p>
            </div>
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '2rem' }}>
              <h4 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>Framer Motion & Lenis</h4>
              <p style={{ color: 'var(--text-secondary)' }}>Used for seamless fluid animations, scroll staggering, and buttery smooth scrolling.</p>
            </div>
            <div>
              <h4 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>Awwwards Styling</h4>
              <p style={{ color: 'var(--text-secondary)' }}>A minimalist brutalist dark theme prioritizing high contrast, large typography, and custom cursor interactions.</p>
            </div>
          </div>
        </motion.div>

        <motion.div className="col-span-6 kott-card" variants={itemVariants}>
          <h3 style={{ marginBottom: '2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Backend & Engine</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '2rem' }}>
              <h4 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>Java & Spring Boot</h4>
              <p style={{ color: 'var(--text-secondary)' }}>The robust backend is built with Spring Boot to provide a reliable API for the frontend and coordinate the simulation.</p>
            </div>
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '2rem' }}>
              <h4 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>Agent-Based Modelling</h4>
              <p style={{ color: 'var(--text-secondary)' }}>Nodes are modelled as autonomous agents with unique behavioral profiles, allowing for realistic network simulations.</p>
            </div>
            <div>
              <h4 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>REST API</h4>
              <p style={{ color: 'var(--text-secondary)' }}>Facilitates communication between the UI configuration forms and the simulation runner engine.</p>
            </div>
          </div>
        </motion.div>

        <div className="line-separator col-span-full"></div>

        <motion.div className="col-span-full" variants={itemVariants}>
          <h3 style={{ marginBottom: '3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Blockchain Concepts Discussed</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            <div className="kott-card">
              <h4 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>Consensus Mechanisms</h4>
              <p style={{ color: 'var(--text-secondary)' }}>Analysis of PoW, PoS, DPoS, PoA, and PoL protocols.</p>
            </div>
            <div className="kott-card">
              <h4 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>Network Topologies</h4>
              <p style={{ color: 'var(--text-secondary)' }}>Erdos-Renyi, Small-World, and Scale-Free arrangements.</p>
            </div>
            <div className="kott-card">
              <h4 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>Gossip Latency</h4>
              <p style={{ color: 'var(--text-secondary)' }}>Evaluating how block propagation time affects fork rates.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Learning;
