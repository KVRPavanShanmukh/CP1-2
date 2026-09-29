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

const Dashboard = () => {
  return (
    <motion.div 
      className="page-container"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={itemVariants} style={{ marginBottom: '6rem' }}>
        <h1>User <span className="serif">Dashboard</span></h1>
        <p style={{ marginTop: '1.5rem', maxWidth: '600px' }}>Monitor your personal simulation stats and theoretical account.</p>
      </motion.div>

      <div className="grid-layout">
        <motion.div className="col-span-6 kott-card" variants={itemVariants}>
          <h3 style={{ marginBottom: '2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Account Overview</h3>
          <div style={{ fontSize: 'clamp(4rem, 8vw, 6rem)', fontWeight: 300, lineHeight: 1, marginBottom: '0.5rem', letterSpacing: '-0.03em' }}>
            2,450<span style={{ fontSize: '0.4em', color: 'var(--text-secondary)' }}>.00</span>
          </div>
          <div style={{ color: 'var(--text-secondary)', marginBottom: '4rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.875rem' }}>Total CHN55 Tokens</div>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="kott-btn" style={{ flex: 1, border: '1px solid var(--accent)' }}>
              Receive
            </button>
            <button className="kott-btn" style={{ flex: 1, background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
              Send
            </button>
          </div>
        </motion.div>

        <motion.div className="col-span-6 kott-card" variants={itemVariants}>
          <h3 style={{ marginBottom: '2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent Transactions</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { id: 'tx-89a1', type: 'Received', amount: '+500', date: '2026-09-28', status: 'Completed' },
              { id: 'tx-44b2', type: 'Sent', amount: '-150', date: '2026-09-27', status: 'Completed' },
              { id: 'tx-21c3', type: 'Staked', amount: '-1000', date: '2026-09-25', status: 'Active' },
            ].map(tx => (
              <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: '1.25rem' }}>{tx.type}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{tx.date} • {tx.id}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 300, fontSize: '1.5rem', color: tx.amount.startsWith('+') ? '#fff' : 'var(--text-secondary)' }}>{tx.amount} CHN</div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: tx.status === 'Completed' ? 'var(--text-secondary)' : '#fff', marginTop: '0.25rem' }}>{tx.status}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Dashboard;
