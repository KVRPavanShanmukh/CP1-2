import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const Navbar = () => {
  const location = useLocation();

  const links = [
    { path: '/simulation', label: 'Simulation', id: '01' },
    { path: '/learning', label: 'Learning', id: '02' },
    { path: '/dashboard', label: 'Dashboard', id: '03' },
    { path: '/abstract', label: 'Abstract', id: '04' },
    { path: '/manual', label: 'Manual', id: '05' },
  ];

  return (
    <motion.nav 
      className="nav-header"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
    >
      <Link to="/" className="nav-logo">
        CHAIN55 <span style={{ color: 'var(--text-secondary)' }}>/ 2026</span>
      </Link>
      
      <div className="nav-links">
        {links.map((link) => {
          const isActive = location.pathname === link.path || (location.pathname === '/' && link.path === '/simulation');
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              <span style={{ color: 'var(--text-secondary)', marginRight: '0.5rem' }}>//{link.id}</span>
              {link.label}
            </Link>
          );
        })}
      </div>
    </motion.nav>
  );
};

export default Navbar;
