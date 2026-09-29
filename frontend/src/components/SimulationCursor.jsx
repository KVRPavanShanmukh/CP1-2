import React, { useEffect, useRef, useState } from 'react';

const COLORS = {
  0: '#ffffff', // 00: CONFIGURATION (neutral white)
  1: '#9b59b6', // 01: NETWORK FORMATION (violet / purple)
  2: '#e6e6fa', // 02: BLOCK PROPAGATION (lavender / white)
  3: '#00ffff', // 03: CONSENSUS (cyan / teal)
  4: '#00a8ff', // 04: NETWORK ANALYSIS (turquoise)
  5: '#ff00ff', // 05: SIMULATION COMPLETE (pink / magenta)
};

export default function SimulationCursor({ activeSection }) {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const pulseRef = useRef(null);
  
  const mousePos = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const smoothPos = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  
  const [isHovering, setIsHovering] = useState(false);
  const [isOverInput, setIsOverInput] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Scene Color matching
  const targetColor = COLORS[activeSection] || '#ffffff';

  useEffect(() => {
    // Check if the user prefers reduced motion or is on a touch device
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    
    if (isTouch) {
      setIsVisible(false);
      return;
    }

    const onMouseMove = (e) => {
      mousePos.current.x = e.clientX;
      mousePos.current.y = e.clientY;
    };

    const onMouseOver = (e) => {
      const tag = e.target.tagName.toLowerCase();
      // Handle Native Inputs
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'option') {
        setIsOverInput(true);
        setIsHovering(false);
        return;
      }
      setIsOverInput(false);

      // Handle Interactive Hovers
      if (
        tag === 'button' ||
        tag === 'a' ||
        e.target.closest('button') ||
        e.target.closest('a') ||
        e.target.classList.contains('nav-indicator') ||
        e.target.classList.contains('monogram')
      ) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    const onClick = (e) => {
      if (mediaQuery.matches) return; // Disable pulse on reduced motion
      
      if (pulseRef.current) {
        pulseRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) scale(1)`;
        pulseRef.current.style.opacity = '0.8';
        pulseRef.current.style.borderColor = targetColor;
        
        // Trigger pulse animation
        requestAnimationFrame(() => {
          pulseRef.current.style.transition = 'transform 0.4s ease-out, opacity 0.4s ease-out';
          pulseRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) scale(2.5)`;
          pulseRef.current.style.opacity = '0';
          
          setTimeout(() => {
            if (pulseRef.current) {
              pulseRef.current.style.transition = 'none';
            }
          }, 400);
        });
      }
    };

    const onMouseLeave = () => setIsVisible(false);
    const onMouseEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseover', onMouseOver, { passive: true });
    window.addEventListener('mousedown', onClick, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('mouseenter', onMouseEnter);

    let animationFrameId;

    const render = () => {
      // Fast center dot
      if (dotRef.current && isVisible && !isOverInput) {
        dotRef.current.style.transform = `translate3d(${mousePos.current.x}px, ${mousePos.current.y}px, 0)`;
      }

      // Smooth outer ring (lerp)
      if (ringRef.current && isVisible && !isOverInput) {
        if (!mediaQuery.matches) {
           smoothPos.current.x += (mousePos.current.x - smoothPos.current.x) * 0.15;
           smoothPos.current.y += (mousePos.current.y - smoothPos.current.y) * 0.15;
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
      window.removeEventListener('mousedown', onClick);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('mouseenter', onMouseEnter);
      cancelAnimationFrame(animationFrameId);
    };
  }, [targetColor, isVisible, isOverInput]);

  if (!isVisible || isOverInput) return null;

  return (
    <>
      <div
        ref={ringRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: isHovering ? '32px' : '20px',
          height: isHovering ? '32px' : '20px',
          border: `1px solid ${targetColor}`,
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 9999,
          margin: isHovering ? '-16px 0 0 -16px' : '-10px 0 0 -10px',
          transition: 'width 0.25s ease-out, height 0.25s ease-out, margin 0.25s ease-out, border-color 0.4s ease, box-shadow 0.25s ease-out',
          boxShadow: isHovering ? `0 0 10px ${targetColor}40` : 'none',
          opacity: 0.6,
          boxSizing: 'border-box'
        }}
      >
        {/* Tiny tick marks around the ring */}
        <div style={{ position: 'absolute', top: '-4px', left: '50%', width: '1px', height: '4px', background: targetColor, opacity: 0.5 }}></div>
        <div style={{ position: 'absolute', bottom: '-4px', left: '50%', width: '1px', height: '4px', background: targetColor, opacity: 0.5 }}></div>
        <div style={{ position: 'absolute', left: '-4px', top: '50%', width: '4px', height: '1px', background: targetColor, opacity: 0.5 }}></div>
        <div style={{ position: 'absolute', right: '-4px', top: '50%', width: '4px', height: '1px', background: targetColor, opacity: 0.5 }}></div>
      </div>
      
      <div
        ref={dotRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '4px',
          height: '4px',
          background: targetColor,
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 10000,
          margin: '-2px 0 0 -2px',
          opacity: isHovering ? 0 : 0.9,
          transition: 'opacity 0.2s ease, background-color 0.4s ease',
          boxShadow: `0 0 5px ${targetColor}`
        }}
      />

      <div
        ref={pulseRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '24px',
          height: '24px',
          border: '1px solid',
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 9998,
          margin: '-12px 0 0 -12px',
          opacity: 0,
        }}
      />
    </>
  );
}
