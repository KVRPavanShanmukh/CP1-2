import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getStoredUser, teamApi, friendApi } from '../services/api';
import SimulationCursor from '../components/SimulationCursor';
import NexusTeamModal from '../components/NexusTeamModal';
import '../components/NexusTeam.css';

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(getStoredUser());
  const [teamData, setTeamData] = useState(null);
  const [friendsCount, setFriendsCount] = useState(0);
  const [nexusModalOpen, setNexusModalOpen] = useState(false);

  useEffect(() => {
    const u = getStoredUser();
    setUser(u);
    if (!u) {
      navigate('/login', { replace: true });
      return;
    }

    teamApi.getMyTeam().then(res => setTeamData(res)).catch(() => {});
    friendApi.getFriends().then(res => setFriendsCount(res?.length || 0)).catch(() => {});
  }, [navigate]);

  if (!user) return null;

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
            //05 IDENTITY & ACCESS
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
                  AFFILIATED TEAM
                </div>
                <div style={{ fontSize: '16px', fontWeight: 500, color: '#ffffff', marginTop: '6px' }}>
                  {teamData?.hasTeam ? teamData.team.name : 'NO AFFILIATION'}
                </div>
                <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', color: '#00bfa5', marginTop: '4px' }}>
                  {teamData?.hasTeam ? (teamData.isLeader ? 'ROLE: TEAM LEADER' : 'ROLE: MEMBER') : 'Join or create a team'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', color: 'rgba(255,255,255,0.4)', letterSpacing: '2px' }}>
                  CONNECTED FRIENDS
                </div>
                <div style={{ fontSize: '16px', fontWeight: 500, color: '#ffffff', marginTop: '6px' }}>
                  {friendsCount} ACTIVE CONNECTIONS
                </div>
                <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                  Nexus network discovery
                </div>
              </div>

              <div>
                <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', color: 'rgba(255,255,255,0.4)', letterSpacing: '2px' }}>
                  DATABASE RECORD ID
                </div>
                <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono, monospace)', color: 'rgba(255,255,255,0.7)', marginTop: '6px', wordBreak: 'break-all' }}>
                  {user.id || 'N/A'}
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '24px' }}>
              <button
                className="nexus-btn-primary"
                onClick={() => setNexusModalOpen(true)}
              >
                NEXUS TEAM PORTAL ↗
              </button>
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

      <NexusTeamModal
        isOpen={nexusModalOpen}
        onClose={() => setNexusModalOpen(false)}
        onTeamUpdated={(res) => setTeamData(res)}
      />
    </div>
  );
}
