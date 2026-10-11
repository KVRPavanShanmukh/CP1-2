import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

const SECTION_COLORS = {
  0: '#ffffff', // 00: HERO / CONFIG (clean white)
  1: '#00e5ff', // 01: NEXUS / FORMATION (cyan)
  2: '#e6e6fa', // 02: ARCHITECTURE / PROPAGATION (lavender)
  3: '#ffaa00', // 03: PROCESS / CONSENSUS (warm amber)
  4: '#00bfa5', // 04: TEAM / TOPOLOGY (teal)
  5: '#00e5ff', // 05: SIMULATION / METRICS (electric cyan)
  6: '#ff00ff', // 06: VISION / COMPLETE (magenta)
};

export default function SimulationCursor({ activeSection }) {
  const location = useLocation();
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const pulseRef = useRef(null);

  const mousePos = useRef({ x: -100, y: -100 });
  const smoothPos = useRef({ x: -100, y: -100 });

  const [isHovering, setIsHovering] = useState(false);
  const [isOverInput, setIsOverInput] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [currentSection, setCurrentSection] = useState(activeSection ?? 0);

  // Sync section color dynamically
  useEffect(() => {
    if (typeof activeSection === 'number') {
      setCurrentSection(activeSection);
    }
  }, [activeSection]);

  useEffect(() => {
    const handleSectionChange = (e) => {
      if (typeof e.detail === 'number') {
        setCurrentSection(e.detail);
      }
    };
    window.addEventListener('c55-section-changed', handleSectionChange);
    return () => window.removeEventListener('c55-section-changed', handleSectionChange);
  }, []);

  // Determine current accent color
  let targetColor = SECTION_COLORS[currentSection] || '#00e5ff';
  if (location.pathname === '/simulation') targetColor = '#00ffff';
  else if (location.pathname === '/dashboard') targetColor = '#00e5ff';
  else if (location.pathname === '/profile') targetColor = '#00e5ff';

  useEffect(() => {
    // Check if on touch device
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    if (isTouch) {
      setIsVisible(false);
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const onMouseMove = (e) => {
      mousePos.current.x = e.clientX;
      mousePos.current.y = e.clientY;
      if (!isVisible) setIsVisible(true);
    };

    const onMouseOver = (e) => {
      const tag = e.target.tagName ? e.target.tagName.toLowerCase() : '';
      
      // Native text input fields
      if (
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        e.target.isContentEditable ||
        e.target.classList.contains('cyber-input') ||
        e.target.classList.contains('cyber-search-input')
      ) {
        setIsOverInput(true);
        setIsHovering(false);
        return;
      }
      setIsOverInput(false);

      // Interactive clickable elements
      if (
        tag === 'button' ||
        tag === 'a' ||
        e.target.closest('button') ||
        e.target.closest('a') ||
        e.target.closest('.global-nav-link') ||
        e.target.closest('.global-logout-btn') ||
        e.target.closest('.action-btn') ||
        e.target.closest('.nexus-btn-primary') ||
        e.target.closest('.nexus-btn-secondary') ||
        e.target.closest('.nexus-tab') ||
        e.target.closest('.team-card') ||
        e.target.closest('.nav-dash') ||
        e.target.closest('.nav-indicator') ||
        e.target.closest('.hollow-btn') ||
        e.target.closest('.landing-btn')
      ) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    const onMouseDown = (e) => {
      if (mediaQuery.matches) return;
      if (pulseRef.current) {
        pulseRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) scale(0.8)`;
        pulseRef.current.style.opacity = '0.9';
        pulseRef.current.style.borderColor = targetColor;
        pulseRef.current.style.boxShadow = `0 0 0 1px rgba(0, 0, 0, 0.9), 0 0 12px ${targetColor}`;

        requestAnimationFrame(() => {
          if (!pulseRef.current) return;
          pulseRef.current.style.transition = 'transform 0.35s ease-out, opacity 0.35s ease-out';
          pulseRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) scale(2.6)`;
          pulseRef.current.style.opacity = '0';

          setTimeout(() => {
            if (pulseRef.current) {
              pulseRef.current.style.transition = 'none';
            }
          }, 350);
        });
      }
    };

    const onMouseLeave = () => setIsVisible(false);
    const onMouseEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseover', onMouseOver, { passive: true });
    window.addEventListener('mousedown', onMouseDown, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('mouseenter', onMouseEnter);

    let animationFrameId;

    const render = () => {
      // 1. Precise center dot follows cursor instantly
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mousePos.current.x}px, ${mousePos.current.y}px, 0)`;
      }

      // 2. Outer ring follows with smooth momentum
      if (ringRef.current) {
        if (!mediaQuery.matches) {
          smoothPos.current.x += (mousePos.current.x - smoothPos.current.x) * 0.18;
          smoothPos.current.y += (mousePos.current.y - smoothPos.current.y) * 0.18;
        } else {
          smoothPos.current.x = mousePos.current.x;
          smoothPos.current.y = mousePos.current.y;
        }
        ringRef.current.style.transform = `translate3d(${smoothPos.current.x}px, ${smoothPos.current.y}px, 0)`;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseover', onMouseOver);
      window.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('mouseenter', onMouseEnter);
      cancelAnimationFrame(animationFrameId);
    };
  }, [targetColor, isVisible]);

  // Do not show custom cursor over text inputs to let native high-contrast text cursor work
  const cursorOpacity = (!isVisible || isOverInput) ? 0 : 1;

  return (
    <>
      {/* OUTER HIGH-CONTRAST RING */}
      <div
        ref={ringRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: isHovering ? '36px' : '22px',
          height: isHovering ? '36px' : '22px',
          margin: isHovering ? '-18px 0 0 -18px' : '-11px 0 0 -11px',
          border: `1.5px solid ${targetColor}`,
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 2147483647, // Maximum integer z-index ensures it is ALWAYS on top
          opacity: cursorOpacity,
          background: isHovering ? 'rgba(0, 229, 255, 0.08)' : 'rgba(0, 0, 0, 0.12)',
          // Dual shadow: Inner/Outer black contours for 100% contrast over bright particles + vivid neon glow
          boxShadow: `
            0 0 0 1.5px rgba(0, 0, 0, 0.95),
            0 0 10px ${targetColor}99,
            inset 0 0 0 1px rgba(0, 0, 0, 0.7)
          `,
          transition: 'width 0.22s ease-out, height 0.22s ease-out, margin 0.22s ease-out, border-color 0.3s ease, box-shadow 0.25s ease-out, opacity 0.15s ease',
          boxSizing: 'border-box',
          transform: 'translate3d(-100px, -100px, 0)',
          willChange: 'transform, width, height'
        }}
      >
        {/* CROSSHAIR TICKS WITH HIGH-CONTRAST DARK BORDER */}
        <div style={{ position: 'absolute', top: '-4px', left: '50%', width: '1.5px', height: '4px', background: targetColor, transform: 'translateX(-50%)', boxShadow: '0 0 0 0.5px #000' }} />
        <div style={{ position: 'absolute', bottom: '-4px', left: '50%', width: '1.5px', height: '4px', background: targetColor, transform: 'translateX(-50%)', boxShadow: '0 0 0 0.5px #000' }} />
        <div style={{ position: 'absolute', left: '-4px', top: '50%', width: '4px', height: '1.5px', background: targetColor, transform: 'translateY(-50%)', boxShadow: '0 0 0 0.5px #000' }} />
        <div style={{ position: 'absolute', right: '-4px', top: '50%', width: '4px', height: '1.5px', background: targetColor, transform: 'translateY(-50%)', boxShadow: '0 0 0 0.5px #000' }} />
      </div>

      {/* CENTER HIGH-CONTRAST CORE DOT */}
      <div
        ref={dotRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: isHovering ? '8px' : '6px',
          height: isHovering ? '8px' : '6px',
          margin: isHovering ? '-4px 0 0 -4px' : '-3px 0 0 -3px',
          background: '#ffffff', // Pure white luminous core
          border: `1px solid ${targetColor}`,
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 2147483647,
          opacity: cursorOpacity,
          // 1.5px crisp black perimeter ring guarantees visibility over white/cyan particles!
          boxShadow: `
            0 0 0 1.5px rgba(0, 0, 0, 0.95),
            0 0 6px ${targetColor},
            0 0 2px #ffffff
          `,
          transition: 'width 0.2s ease, height 0.2s ease, margin 0.2s ease, opacity 0.15s ease',
          transform: 'translate3d(-100px, -100px, 0)',
          willChange: 'transform'
        }}
      />

      {/* HIGH-CONTRAST EXPANDING CLICK PULSE */}
      <div
        ref={pulseRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '26px',
          height: '26px',
          margin: '-13px 0 0 -13px',
          border: '1.5px solid #00e5ff',
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 2147483646,
          opacity: 0,
          boxSizing: 'border-box',
          transform: 'translate3d(-100px, -100px, 0)'
        }}
      />
    </>
  );
}
