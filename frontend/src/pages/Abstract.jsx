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

const Abstract = () => {
  return (
    <motion.div 
      className="page-container"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={itemVariants} style={{ marginBottom: '6rem' }}>
        <h1>Research <span className="serif">the</span> Core</h1>
        <p style={{ marginTop: '1.5rem', maxWidth: '600px' }}>Overview of the underlying research.</p>
      </motion.div>

      <motion.div className="kott-card" style={{ maxWidth: '900px', margin: '0 auto', lineHeight: '1.8' }} variants={itemVariants}>
        <h2 style={{ marginBottom: '2.5rem', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>Abstract</h2>
        
        <p className="abstract-text" style={{ textAlign: 'justify', marginBottom: '2.5rem' }}>
          <strong style={{ color: 'var(--text-primary)' }}>Abstract—</strong>Distributed Ledger Technology (DLT), has surfaced as a kind of secure and decentralized base layer for things in banking, finance and digital asset management. A lot of older analysis models for blockchain networks tend to treat every participant like they act the same way, but that kinda falls apart once you look at actual networks, because nodes can be honest, malicious, inactive, or just unpredictable. So, this work puts forward an Agent-Based Modelling (ABM) strategy to mimic how individual blockchain actors behave, by treating them as autonomous agents with their own decision styles.
        </p>

        <p className="abstract-text" style={{ textAlign: 'justify', marginBottom: '2.5rem' }}>
          In the proposed setup, you end up with a simulated blockchain network made from multiple nodes, and each node gets a specific behavioral profile. Within the simulation we also represent transaction generation, transaction validation, block creation, and a simplified consensus mechanism, all while we keep an eye on the overall network performance under multiple scenarios. During the run, several key performance measures are gathered and then shown in an analytics dashboard, like transaction success rate, consensus achievement, network throughput, malicious activity levels, and ledger reliability.
        </p>

        <p className="abstract-text" style={{ textAlign: 'justify', marginBottom: '3.5rem' }}>
          Overall, the framework aims to deliver a low cost, repeatable test environment for judging blockchain behavior before any real deployment. The results are meant to help researchers and organizations see how participant conduct influences blockchain security, scalability, and reliability. In turn, this supports the building of sturdier distributed ledger systems.
        </p>

        <div style={{ padding: '2rem', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
          <p style={{ marginBottom: '1rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}><strong style={{ color: 'var(--text-primary)' }}>Keywords:</strong> Distributed Ledger Technology, Blockchain, Agent-Based Modelling, Consensus Mechanism, Blockchain Simulation, Distributed Systems, Network Analytics, Cybersecurity.</p>
          <p style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}><strong style={{ color: 'var(--text-primary)' }}>Index Terms—</strong>component, formatting, style, styling, insert</p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Abstract;
