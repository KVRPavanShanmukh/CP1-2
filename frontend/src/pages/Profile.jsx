import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authApi, getStoredUser, setStoredUser } from '../services/api';
import '../components/NexusTeam.css';

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(getStoredUser());

  useEffect(() => {
    let cancelled = false;
    const u = getStoredUser();
    if (!u) {
      navigate('/login', { replace: true });
      return undefined;
    }
    authApi.getMe()
      .then((res) => {
        if (!cancelled && res?.authenticated && res.user) {
          setUser(res.user);
          setStoredUser(res.user);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [navigate]);

  if (!user) return null;

  const isAdminOrOwner = ['ADMIN', 'OWNER'].includes(String(user.role || '').toUpperCase());

  return (
    <div className="landing-shell">

      <div style={{
        position: 'relative',
        zIndex: 10,
        maxWidth: '920px',
        margin: '120px auto 40px auto',
        padding: '0 30px'
      }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* TOP BREADCRUMB */}
          <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', letterSpacing: '3px', color: '#00e5ff', marginBottom: '8px' }}>
            IDENTITY &amp; ACCESS
          </div>
          <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 100, letterSpacing: '-0.02em', textTransform: 'uppercase', marginBottom: '32px' }}>
            OPERATOR<br/>PROFILE.
          </h1>

          {/* MAIN IDENTITY CARD */}
          <div style={{
            background: 'rgba(10, 12, 20, 0.75)',
            border: '1px solid rgba(0, 229, 255, 0.25)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            padding: '36px',
            marginBottom: '28px',
            boxShadow: '0 0 40px rgba(0, 0, 0, 0.8)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '24px', marginBottom: '24px' }}>
              <div>
                <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', color: 'rgba(255, 255, 255, 0.5)', letterSpacing: '2px', textTransform: 'uppercase' }}>
                  REGISTERED OPERATOR
                </div>
                <div style={{ fontSize: '26px', fontWeight: 600, letterSpacing: '1.5px', color: '#ffffff', marginTop: '4px' }}>
                  {user.username}
                </div>
                <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono, monospace)', color: '#00e5ff', marginTop: '6px' }}>
                  UID: <strong style={{ letterSpacing: '2px' }}>{user.uid}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <span className="nexus-badge" style={{ borderColor: '#00e5ff', color: '#00e5ff' }}>
                  SYSTEM: {user.role || 'USER'}
                </span>
                <span className="nexus-badge" style={{ borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }}>
                  SECURITY: VERIFIED
                </span>
              </div>
            </div>

            {/* DETAILS GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', marginBottom: '28px' }}>
              <div>
                <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', color: 'rgba(255,255,255,0.4)', letterSpacing: '2px' }}>
                  RESEARCH PLATFORM
                </div>
                <div style={{ fontSize: '16px', fontWeight: 500, color: '#ffffff', marginTop: '6px' }}>
                  CHAIN55 CONSENSUS ENGINE
                </div>
                <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', color: '#00bfa5', marginTop: '4px' }}>
                  KL University • Batch 73
                </div>
              </div>

              <div>
                <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', color: 'rgba(255,255,255,0.4)', letterSpacing: '2px' }}>
                  RESEARCH PARTICIPATION
                </div>
                <div style={{ fontSize: '16px', fontWeight: 500, color: '#ffffff', marginTop: '6px' }}>
                  ACTIVE SIMULATION RESEARCH
                </div>
                <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', color: '#00e5ff', marginTop: '4px' }}>
                  CHAIN55 Consensus Laboratory
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '24px' }}>
              {isAdminOrOwner && (
                <button
                  className="nexus-btn-primary"
                  onClick={() => navigate('/landing?section=team', { state: { section: 4 } })}
                >
                  OUR PROJECT TEAM ↗
                </button>
              )}
              <button
                className="nexus-btn-secondary"
                onClick={() => navigate('/dashboard')}
              >
                RETURN TO DASHBOARD ↗
              </button>
              <button
                className="nexus-btn-secondary"
                onClick={() => navigate('/simulation')}
              >
                LAUNCH SIMULATION ↗
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
