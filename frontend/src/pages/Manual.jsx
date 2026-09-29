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

const Manual = () => {
  return (
    <motion.div 
      className="page-container"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={itemVariants} style={{ marginBottom: '6rem' }}>
        <h1>Simulation <span className="serif">Manual</span></h1>
        <p style={{ marginTop: '1.5rem', maxWidth: '600px' }}>A guide on how to configure and run blockchain simulations.</p>
      </motion.div>

      <motion.div className="kott-card" style={{ maxWidth: '900px', margin: '0 auto' }} variants={itemVariants}>
        <h2 style={{ marginBottom: '3rem', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
          How to Simulate
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
          
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '3rem', fontWeight: 300, lineHeight: 1, color: 'var(--text-secondary)' }}>01</div>
            <div>
              <h3 style={{ marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Configuration</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.8', marginBottom: '1rem' }}>
                Navigate to the <strong>Simulation Page</strong>. You will see a "New Simulation" form on the left side. Adjust the parameters to define your blockchain network environment:
              </p>
              <ul style={{ color: 'var(--text-secondary)', paddingLeft: '1.5rem', lineHeight: '1.8' }}>
                <li><strong>Node Count:</strong> Total number of nodes participating in the network.</li>
                <li><strong>Consensus Type:</strong> The algorithm used to agree on the block state.</li>
                <li><strong>Network Topology:</strong> The structure of the P2P connections.</li>
                <li><strong>Block Gossip Latency:</strong> How long it takes for a block to propagate.</li>
                <li><strong>Slot Duration:</strong> Time allocated per slot or block generation attempt.</li>
              </ul>
            </div>
          </div>

          <div style={{ height: '1px', background: 'var(--border-color)', width: '100%' }}></div>

          <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '3rem', fontWeight: 300, lineHeight: 1, color: 'var(--text-secondary)' }}>02</div>
            <div>
              <h3 style={{ marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Execution</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.8' }}>
                Click the <strong>"Start Simulation"</strong> button. The frontend will send the configuration to the Spring Boot backend, which initializes the autonomous agents (nodes) using the Agent-Based Modelling strategy. The simulation runs in the background.
              </p>
            </div>
          </div>

          <div style={{ height: '1px', background: 'var(--border-color)', width: '100%' }}></div>

          <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '3rem', fontWeight: 300, lineHeight: 1, color: 'var(--text-secondary)' }}>03</div>
            <div>
              <h3 style={{ marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Analysis</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.8' }}>
                Once the simulation finishes, the results are loaded into the <strong>Simulation Results</strong> panel. You can observe the Mainchain Rate, Branching Ratio (forks), Gini Coefficient (wealth distribution), and overall duration. You can also click on past runs in the <strong>Sequence History</strong> list to review older results.
              </p>
            </div>
          </div>

        </div>
      </motion.div>
    </motion.div>
  );
};

export default Manual;
