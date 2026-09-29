import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const Navbar = () => {
  const location = useLocation();

  const links = [
    { path: '/simulation', label: 'Simulation' },
    { path: '/learning', label: 'Learning' },
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/abstract', label: 'Abstract' },
    { path: '/manual', label: 'Manual' },
  ];

  return (
    <motion.nav 
      className="nav-header"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
    >
      <Link to="/" className="nav-logo">
        Chain<span className="serif" style={{ fontStyle: 'italic', textTransform: 'lowercase', fontWeight: 400 }}>55</span>
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
              {link.label}
            </Link>
          );
        })}
      </div>
    </motion.nav>
  );
};

export default Navbar;
