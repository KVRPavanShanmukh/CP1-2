import React, { useEffect, useRef } from 'react';

const InteractiveShape = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    let particles = [];
    const numParticles = 3000;
    
    let mouse = { x: width / 2, y: height / 2, radius: 150 };

    class Particle {
      constructor() {
        this.baseX = width / 2 + (Math.random() - 0.5) * 600;
        this.baseY = height / 2 + (Math.random() - 0.5) * 600;
        
        // Shape them into a rough circle
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 300;
        this.baseX = width / 2 + Math.cos(angle) * radius;
        this.baseY = height / 2 + Math.sin(angle) * radius;

        this.x = this.baseX;
        this.y = this.baseY;
        this.size = Math.random() * 1.5 + 0.5;
        this.density = (Math.random() * 30) + 1;
        this.color = `rgba(255, 255, 255, ${Math.random() * 0.8 + 0.2})`;
      }

      draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
      }

      update() {
        let dx = mouse.x - this.x;
        let dy = mouse.y - this.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        let forceDirectionX = dx / distance;
        let forceDirectionY = dy / distance;
        let maxDistance = mouse.radius;
        let force = (maxDistance - distance) / maxDistance;
        let directionX = forceDirectionX * force * this.density;
        let directionY = forceDirectionY * force * this.density;

        if (distance < mouse.radius) {
          // Repel from mouse
          this.x -= directionX;
          this.y -= directionY;
        } else {
          // Return to base position
          if (this.x !== this.baseX) {
            let dx = this.x - this.baseX;
            this.x -= dx / 10;
          }
          if (this.y !== this.baseY) {
            let dy = this.y - this.baseY;
            this.y -= dy / 10;
          }
        }
      }
    }

    const init = () => {
      particles = [];
      for (let i = 0; i < numParticles; i++) {
        particles.push(new Particle());
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < particles.length; i++) {
        particles[i].draw();
        particles[i].update();
      }
      requestAnimationFrame(animate);
    };

    init();
    animate();

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      init();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: -1,
      pointerEvents: 'none',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <canvas 
        ref={canvasRef} 
        style={{
          filter: 'blur(1px) drop-shadow(0 0 20px rgba(255, 255, 255, 0.4))',
          mixBlendMode: 'screen'
        }}
      />
    </div>
  );
};

export default InteractiveShape;
