import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import { Eye, EyeOff, Lock, User, Shield, Hash } from 'lucide-react';

const Login = () => {
  const [videoState, setVideoState] = useState('playing'); // 'playing', 'transitioning', 'ended'
  const [authStatus, setAuthStatus] = useState('idle'); // 'idle', 'authenticating', 'success', 'error', 'network_error'
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const videoRef = useRef(null);
  const cursorRef = useRef(null);
  const trailRefs = useRef([]);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    registrationCode: '',
    loginCode: '',
    uid: ''
  });

  const [assignedUid, setAssignedUid] = useState(null);

  // Custom Chain Cursor Logic
  const NUM_LINKS = 6;
  const NUM_SPARKS = 15;
  const linksRef = useRef([]);
  const sparksRef = useRef([]);
  const [isClicking, setIsClicking] = useState(false);

  useEffect(() => {
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let trail = Array(NUM_LINKS).fill().map(() => ({x: mouseX, y: mouseY}));
    let sparks = Array(NUM_SPARKS).fill().map(() => ({
      x: mouseX, y: mouseY, vx: 0, vy: 0, life: 0, maxLife: Math.random() * 20 + 10
    }));

    const handleMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);

    let animationFrame;
    const updateCursor = () => {
      trail[0].x += (mouseX - trail[0].x) * 0.5;
      trail[0].y += (mouseY - trail[0].y) * 0.5;
      for (let i = 1; i < NUM_LINKS; i++) {
        trail[i].x += (trail[i-1].x - trail[i].x) * 0.4;
        trail[i].y += (trail[i-1].y - trail[i].y) * 0.4;
      }
      for (let i = 0; i < NUM_LINKS; i++) {
        if (linksRef.current[i]) {
          let angle = 0;
          if (i > 0) angle = Math.atan2(trail[i-1].y - trail[i].y, trail[i-1].x - trail[i].x) * (180 / Math.PI);
          else angle = Math.atan2(mouseY - trail[0].y, mouseX - trail[0].x) * (180 / Math.PI);
          linksRef.current[i].style.transform = `translate(${trail[i].x}px, ${trail[i].y}px) rotate(${angle}deg)`;
        }
      }
      for (let i = 0; i < NUM_SPARKS; i++) {
        let s = sparks[i];
        s.life++;
        if (s.life >= s.maxLife) {
          s.x = trail[NUM_LINKS-1].x + (Math.random() * 10 - 5);
          s.y = trail[NUM_LINKS-1].y + (Math.random() * 10 - 5);
          s.vx = (Math.random() * 4 - 2) - (mouseX - trail[0].x) * 0.05;
          s.vy = (Math.random() * 4 - 2) - 2; 
          s.life = 0;
          s.maxLife = Math.random() * 20 + 10;
        } else {
          s.x += s.vx;
          s.y += s.vy;
          s.vy -= 0.1; 
        }
        if (sparksRef.current[i]) {
          const scale = 1 - (s.life / s.maxLife);
          sparksRef.current[i].style.transform = `translate(${s.x}px, ${s.y}px) scale(${scale})`;
          sparksRef.current[i].style.opacity = scale;
        }
      }
      animationFrame = requestAnimationFrame(updateCursor);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    animationFrame = requestAnimationFrame(updateCursor);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  // Video Transition Logic
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleTimeUpdate = () => {
      if (video.duration && video.currentTime >= video.duration - 0.9) {
        if (videoState === 'playing') setVideoState('transitioning');
      }
    };
    const handleEnded = () => setVideoState('ended');
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, [videoState]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setAuthStatus('idle');
    setAssignedUid(null);
  };

  const [isSignupMode, setIsSignupMode] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    if (isSignupMode) {
      if (!formData.username || !formData.password) {
        setAuthStatus('error');
        setErrorMessage('SECURITY WARNING: FIELDS EMPTY');
        return;
      }
    } else {
      if (!formData.username || !formData.password || !formData.uid) {
        setAuthStatus('error');
        setErrorMessage('SECURITY WARNING: FIELDS EMPTY');
        return;
      }
    }
    
    setAuthStatus('authenticating');
    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      const endpoint = isSignupMode ? '/api/auth/signup' : '/api/auth/login';
      const response = await fetch(`http://localhost:8080${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json().catch(() => ({}));
      
      if (response.ok) {
        setAuthStatus('success');
        if (isSignupMode) {
            setAssignedUid(data.assignedUid);
            setSuccessMessage('REGISTRATION SUCCESSFUL');
            setTimeout(() => {
                setIsSignupMode(false);
                setAuthStatus('idle');
                setFormData({ ...formData, password: '' });
            }, 5000);
        } else {
            setSuccessMessage('CREDENTIALS VERIFIED');
            setTimeout(() => {
                setSuccessMessage('ACCESS GRANTED');
                setTimeout(() => navigate('/simulation'), 800);
            }, 1000);
        }
      } else if (response.status === 429) {
        setAuthStatus('error');
        setErrorMessage('RATE LIMIT EXCEEDED');
      } else {
        setAuthStatus('error');
        if (isSignupMode && data.error) setErrorMessage(`REGISTRATION FAILED: ${data.error.toUpperCase()}`);
        else setErrorMessage('AUTHENTICATION FAILED: INVALID CREDENTIALS');
      }
    } catch (err) {
      setAuthStatus('network_error');
      setErrorMessage('AUTHENTICATION SERVICE UNAVAILABLE');
    }
  };

  return (
    <div className="login-experience" style={{ cursor: 'none' }}>
      
      {/* CUSTOM FLAMING CHAIN CURSOR */}
      <div className={`cursor-container ${isHovering ? 'hovering' : ''} ${isClicking ? 'clicking' : ''}`}>
        {/* Sparks */}
        {Array(NUM_SPARKS).fill().map((_, i) => (
          <div key={`spark-${i}`} ref={el => sparksRef.current[i] = el} className="fire-spark" />
        ))}
        {/* Chain Links (rendered in reverse so head is on top) */}
        {Array(NUM_LINKS).fill().map((_, i) => (
          <div key={`link-${i}`} ref={el => linksRef.current[i] = el} className={`chain-link-wrapper link-${i}`}>
            <div className="fire-glow"></div>
            <div className={`chain-link ${i % 2 === 0 ? 'alt' : ''}`}></div>
          </div>
        )).reverse()}
      </div>

      {/* PERSISTENT CYBERPUNK BACKGROUND */}
      <div className={`cyber-background ${videoState !== 'playing' ? 'visible' : ''}`}>
        <div className="cyber-particles"></div>
        <div className="cyber-circuitry"></div>
        <div className="cyber-glow"></div>
      </div>

      {/* INTRO VIDEO */}
      <video 
        ref={videoRef}
        className={`intro-video ${videoState === 'ended' ? 'hidden' : ''}`}
        src="/assets/login-intro.mp4" 
        autoPlay 
        muted 
        playsInline
      />

      {/* HTML LOGIN UI OVERLAY */}
      <div className={`login-ui-layer ${videoState !== 'playing' ? 'active' : ''}`}>
        <div className="login-panel">
          
          <div className="panel-border left"></div>
          <div className="panel-border right"></div>
          
          <div className="panel-content">
            <div className="panel-header">
              <Lock className="lock-icon" size={28} />
              <div className="hud-corner top-left"></div>
              <div className="hud-corner top-right"></div>
            </div>

            <form onSubmit={handleAuth} className="login-form">
              
              <div className="input-group">
                <input 
                  type="text" 
                  name="username" 
                  placeholder="USERNAME" 
                  value={formData.username} 
                  onChange={handleChange}
                  className="cyber-input"
                  onMouseEnter={() => setIsHovering(true)}
                  onMouseLeave={() => setIsHovering(false)}
                />
              </div>

              <div className="input-group">
                <input 
                  type={showPassword ? "text" : "password"} 
                  name="password" 
                  placeholder="PASSWORD" 
                  value={formData.password} 
                  onChange={handleChange}
                  className="cyber-input"
                  onMouseEnter={() => setIsHovering(true)}
                  onMouseLeave={() => setIsHovering(false)}
                />
                <button 
                  type="button" 
                  className="eye-btn" 
                  onClick={() => setShowPassword(!showPassword)}
                  onMouseEnter={() => setIsHovering(true)}
                  onMouseLeave={() => setIsHovering(false)}
                >
                  {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>

              {!isSignupMode && (
                <div className="input-group">
                  <input 
                    type="text" 
                    name="uid" 
                    placeholder="UID" 
                    value={formData.uid} 
                    onChange={handleChange}
                    className="cyber-input"
                    onMouseEnter={() => setIsHovering(true)}
                    onMouseLeave={() => setIsHovering(false)}
                  />
                </div>
              )}

              {(authStatus === 'error' || authStatus === 'network_error') && (
                <div className="auth-message error">{errorMessage}</div>
              )}
              {authStatus === 'authenticating' && (
                <div className="auth-message info">{isSignupMode ? 'REGISTERING...' : 'VERIFYING CREDENTIALS...'}</div>
              )}
              {authStatus === 'success' && !assignedUid && (
                <div className="auth-message success">{successMessage}</div>
              )}
              
              {assignedUid && (
                <div className="auth-message success" style={{ padding: '15px' }}>
                    REGISTRATION SUCCESSFUL<br/><br/>
                    <span style={{ color: '#fff' }}>YOUR ASSIGNED UID:</span><br/>
                    <strong style={{ fontSize: '16px', letterSpacing: '3px' }}>{assignedUid}</strong><br/><br/>
                    <span style={{ fontSize: '9px', opacity: 0.7 }}>Keep this UID safe. Required for login.</span>
                </div>
              )}

              <button 
                type="submit" 
                className={`login-btn ${authStatus === 'authenticating' ? 'loading' : ''}`}
                disabled={authStatus === 'authenticating' || authStatus === 'success'}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
              >
                <span>{isSignupMode ? 'SIGN UP' : 'LOGIN'}</span>
              </button>

              <div 
                className="signup-toggle"
                onClick={() => {
                    setIsSignupMode(!isSignupMode);
                    setAuthStatus('idle');
                    setAssignedUid(null);
                }}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                style={{
                    textAlign: 'center',
                    color: 'rgba(0, 255, 255, 0.6)',
                    fontSize: '11px',
                    fontFamily: '"Courier New", Courier, monospace',
                    letterSpacing: '1px',
                    cursor: 'none',
                    marginTop: '5px'
                }}
              >
                {isSignupMode ? 'ALREADY HAVE AN ACCOUNT? LOGIN' : 'NO ACCOUNT? SIGN UP'}
              </div>

            </form>

            <div className="hud-corner bottom-left"></div>
            <div className="hud-corner bottom-right"></div>
          </div>
        </div>
      </div>
      
    </div>
  );
};

export default Login;
