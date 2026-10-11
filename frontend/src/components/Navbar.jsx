import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authApi, getStoredUser } from '../services/api';
import './Navbar.css';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(getStoredUser());
  const [landingSection, setLandingSection] = useState(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, [location.pathname]);

  useEffect(() => {
    const handleSectionChange = (e) => {
      if (typeof e.detail === 'number') {
        setLandingSection(e.detail);
      }
    };
    window.addEventListener('c55-section-changed', handleSectionChange);
    return () => window.removeEventListener('c55-section-changed', handleSectionChange);
  }, []);

  // Do not render navbar on login page to preserve intro video and full-screen experience
  if (location.pathname === '/login') {
    return null;
  }

  const handleTeamClick = () => {
    if (location.pathname === '/landing' || location.pathname === '/') {
      window.dispatchEvent(new CustomEvent('c55-navigate-section', { detail: 4 }));
      setLandingSection(4);
    } else {
      navigate('/landing', { state: { section: 4 } });
    }
  };

  const handleDashboardClick = () => {
    navigate('/dashboard');
  };

  const handleSimulationClick = () => {
    navigate('/simulation');
  };

  const handleAgentClick = (e) => {
    e.preventDefault();
    // Item is displayed as required, but performs no action
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      console.warn('Logout cleanup exception:', e);
    } finally {
      setUser(null);
      navigate('/login', { replace: true });
    }
  };

  const isTeamActive = (location.pathname === '/landing' || location.pathname === '/') && landingSection === 4;
  const isDashboardActive = location.pathname === '/dashboard';
  const isSimulationActive = location.pathname === '/simulation';
  const isProfileActive = location.pathname === '/profile';

  return (
    <nav className="global-c55-navbar" id="global-c55-navbar">
      {/* BRAND LOGO ON THE LEFT */}
      <div className="global-nav-left" onClick={() => navigate('/landing')}>
        <div className="global-nav-logo">C55</div>
        <div className="global-nav-identity">
          <strong>CHAIN55</strong> / CONSENSUS ENGINE
        </div>
      </div>

      {/* ITEMS 1 TO 5 IN REQUIRED ORDER */}
      <div className="global-nav-center">
        {/* 1. TEAM */}
        <div
          id="nav-item-team"
          className={`global-nav-link ${isTeamActive ? 'active' : ''}`}
          onClick={handleTeamClick}
        >
          TEAM
        </div>

        {/* 2. DASHBOARD */}
        <div
          id="nav-item-dashboard"
          className={`global-nav-link ${isDashboardActive ? 'active' : ''}`}
          onClick={handleDashboardClick}
        >
          DASHBOARD
        </div>

        {/* 3. SIMULATION */}
        <div
          id="nav-item-simulation"
          className={`global-nav-link ${isSimulationActive ? 'active' : ''}`}
          onClick={handleSimulationClick}
        >
          SIMULATION
        </div>

        {/* 4. AGENT (Display item, inert as required) */}
        <div
          id="nav-item-agent"
          className="global-nav-link inert-agent"
          onClick={handleAgentClick}
          title="Agent Interface [Standby]"
        >
          AGENT
        </div>

        {/* 5. PROFILE */}
        <div
          id="nav-item-profile"
          className={`global-nav-link ${isProfileActive ? 'active' : ''}`}
          onClick={handleProfileClick}
        >
          PROFILE
        </div>
      </div>

      {/* ITEM 6: LOGOUT AT THE EXTREME RIGHT END */}
      <div className="global-nav-right">
        <button
          id="nav-item-logout"
          className="global-logout-btn"
          onClick={handleLogout}
        >
          LOGOUT ↗
        </button>
      </div>
    </nav>
  );
}
