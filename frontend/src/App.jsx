import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Lenis from '@studio-freight/lenis';
import Navbar from './components/Navbar';
import Simulation from './pages/Simulation';
import Learning from './pages/Learning';
import Dashboard from './pages/Dashboard';
import Abstract from './pages/Abstract';
import Manual from './pages/Manual';
import InteractiveShape from './components/InteractiveShape';

function AppContent() {
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Lenis Smooth Scroll
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      direction: 'vertical',
      gestureDirection: 'vertical',
      smooth: true,
      mouseMultiplier: 1,
      smoothTouch: false,
      touchMultiplier: 2,
      infinite: false,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Custom Cursor Logic
    const moveCursor = (e) => {
      setCursorPos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseOver = (e) => {
      if (
        e.target.tagName.toLowerCase() === 'a' ||
        e.target.tagName.toLowerCase() === 'button' ||
        e.target.tagName.toLowerCase() === 'input' ||
        e.target.tagName.toLowerCase() === 'select' ||
        e.target.closest('a') ||
        e.target.closest('button')
      ) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    window.addEventListener('mousemove', moveCursor);
    window.addEventListener('mouseover', handleMouseOver);

    // Scroll to top on route change
    window.scrollTo(0, 0);

    return () => {
      lenis.destroy();
      window.removeEventListener('mousemove', moveCursor);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, [location.pathname]);

  return (
    <>
      <div 
        className={`custom-cursor ${isHovering ? 'hovering' : ''}`}
        style={{ left: `${cursorPos.x}px`, top: `${cursorPos.y}px` }}
      ></div>
      <div className="grain-overlay"></div>
      <InteractiveShape />

      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Simulation />} />
            <Route path="/simulation" element={<Simulation />} />
            <Route path="/learning" element={<Learning />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/abstract" element={<Abstract />} />
            <Route path="/manual" element={<Manual />} />
          </Routes>
        </main>
      </div>
      <div className="telemetry" aria-hidden="true">
        <span>CHAIN55 NETWORK ENGINE / AGENT-BASED MODELLING</span>
        <span>STATUS: LIVE</span>
      </div>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;

