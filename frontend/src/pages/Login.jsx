import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import { Eye, EyeOff, Lock, User, Shield, Hash } from 'lucide-react';

const Login = () => {
  const [videoState, setVideoState] = useState('playing'); // 'playing', 'transitioning', 'ended'
  const [authStatus, setAuthStatus] = useState('idle'); // 'idle', 'authenticating', 'success', 'error'
  const [showPassword, setShowPassword] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  
  const videoRef = useRef(null);
  const cursorRef = useRef(null);
  const trailRefs = useRef([]);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    otp: '',
    uid: ''
  });

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
      // Update links
      trail[0].x += (mouseX - trail[0].x) * 0.5;
      trail[0].y += (mouseY - trail[0].y) * 0.5;
      
      for (let i = 1; i < NUM_LINKS; i++) {
        trail[i].x += (trail[i-1].x - trail[i].x) * 0.4;
        trail[i].y += (trail[i-1].y - trail[i].y) * 0.4;
      }

      for (let i = 0; i < NUM_LINKS; i++) {
        if (linksRef.current[i]) {
          let angle = 0;
          if (i > 0) {
            const dx = trail[i-1].x - trail[i].x;
            const dy = trail[i-1].y - trail[i].y;
            angle = Math.atan2(dy, dx) * (180 / Math.PI);
          } else {
            const dx = mouseX - trail[0].x;
            const dy = mouseY - trail[0].y;
            angle = Math.atan2(dy, dx) * (180 / Math.PI);
          }
          
          linksRef.current[i].style.transform = `translate(${trail[i].x}px, ${trail[i].y}px) rotate(${angle}deg)`;
        }
      }

      // Update sparks
      for (let i = 0; i < NUM_SPARKS; i++) {
        let s = sparks[i];
        s.life++;
        if (s.life >= s.maxLife) {
          // respawn spark at the end of the chain
          s.x = trail[NUM_LINKS-1].x + (Math.random() * 10 - 5);
          s.y = trail[NUM_LINKS-1].y + (Math.random() * 10 - 5);
          s.vx = (Math.random() * 4 - 2) - (mouseX - trail[0].x) * 0.05;
          s.vy = (Math.random() * 4 - 2) - 2; // move upwards slightly like fire
          s.life = 0;
          s.maxLife = Math.random() * 20 + 10;
        } else {
          s.x += s.vx;
          s.y += s.vy;
          s.vy -= 0.1; // rise up
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
        if (videoState === 'playing') {
          setVideoState('transitioning');
        }
      }
    };

    const handleEnded = () => {
      setVideoState('ended');
    };

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
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (!formData.username || !formData.password || !formData.otp || !formData.uid) {
      setAuthStatus('error');
      return;
    }
    setAuthStatus('authenticating');
    setTimeout(() => {
      setAuthStatus('success');
      setTimeout(() => navigate('/simulation'), 1500);
    }, 2000);
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

            <form onSubmit={handleLogin} className="login-form">
              
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

              <div className="input-group">
                <input 
                  type="text" 
                  name="otp" 
                  placeholder="OTP" 
                  value={formData.otp} 
                  onChange={handleChange}
                  className="cyber-input"
                  maxLength={6}
                  onMouseEnter={() => setIsHovering(true)}
                  onMouseLeave={() => setIsHovering(false)}
                />
              </div>

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

              {authStatus === 'error' && (
                <div className="auth-message error">SECURITY WARNING: FIELDS EMPTY</div>
              )}
              {authStatus === 'authenticating' && (
                <div className="auth-message info">VERIFYING CREDENTIALS...</div>
              )}
              {authStatus === 'success' && (
                <div className="auth-message success">AUTHENTICATION SUCCESSFUL</div>
              )}

              <button 
                type="submit" 
                className={`login-btn ${authStatus === 'authenticating' ? 'loading' : ''}`}
                disabled={authStatus === 'authenticating' || authStatus === 'success'}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
              >
                <span>LOGIN</span>
              </button>

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
