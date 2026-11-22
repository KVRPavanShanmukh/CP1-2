import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authApi, getStoredUser } from '../services/api';
import './Navbar.css';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [_user, setUser] = useState(getStoredUser());

  useEffect(() => {
    setUser(getStoredUser());
  }, [location.pathname]);

  // Do not render navbar on login page to preserve intro video and full-screen experience
  if (location.pathname === '/login') {
    return null;
  }

  const handleDashboardClick = () => {
    navigate('/dashboard');
  };

  const handleSimulationClick = () => {
    navigate('/simulation');
  };

  const handleLearningClick = () => {
    navigate('/learning');
  };

  const handleAgentClick = () => {
    const activeSimId = sessionStorage.getItem('activeSimulationId');
    if (activeSimId) {
      navigate(`/agent?simId=${activeSimId}`);
    } else {
      navigate('/agent');
    }
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const handleBlogClick = () => {
    navigate('/blog');
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

  const isDashboardActive = location.pathname === '/dashboard';
  const isSimulationActive = location.pathname === '/simulation';
  const isLearningActive = ['/learning', '/manual', '/abstract'].includes(location.pathname);
  const isAgentActive = location.pathname === '/agent';
  const isProfileActive = location.pathname === '/profile';
  const isBlogActive = location.pathname === '/blog';

  return (
    <nav className="global-c55-navbar" id="global-c55-navbar">
      {/* BRAND LOGO ON THE LEFT */}
      <div className="global-nav-left" onClick={() => navigate('/landing')}>
        <img className="global-nav-logo" src="/assets/logo.png" alt="CHAIN55 logo" title="CHAIN55" />
        <div className="global-nav-identity">
          <strong>CHAIN55</strong> / CONSENSUS ENGINE
        </div>
      </div>

      {/* CORE NAVIGATION TABS */}
      <div className="global-nav-center">
        {/* 1. DASHBOARD */}
        <div
          id="nav-item-dashboard"
          className={`global-nav-link ${isDashboardActive ? 'active' : ''}`}
          onClick={handleDashboardClick}
        >
          DASHBOARD
        </div>

        {/* 2. SIMULATION */}
        <div
          id="nav-item-simulation"
          className={`global-nav-link ${isSimulationActive ? 'active' : ''}`}
          onClick={handleSimulationClick}
        >
          SIMULATION
        </div>

        {/* 3. LEARNING DOCS */}
        <div
          id="nav-item-learning"
          className={`global-nav-link ${isLearningActive ? 'active' : ''}`}
          onClick={handleLearningClick}
        >
          LEARN
        </div>

        {/* 4. AGENT */}
        <div
          id="nav-item-agent"
          className={`global-nav-link ${isAgentActive ? 'active' : ''}`}
          onClick={handleAgentClick}
          title="3D Agent Network Visualization"
        >
          AGENT
        </div>

        {/* 5. BLOG */}
        <div
          id="nav-item-blog"
          className={`global-nav-link ${isBlogActive ? 'active' : ''}`}
          onClick={handleBlogClick}
        >
          BLOG
        </div>

        {/* 6. PROFILE */}
        <div
          id="nav-item-profile"
          className={`global-nav-link ${isProfileActive ? 'active' : ''}`}
          onClick={handleProfileClick}
        >
          PROFILE
        </div>
      </div>

      {/* LOGOUT AT THE EXTREME RIGHT END */}
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
