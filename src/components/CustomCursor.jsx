import React, { useEffect, useState } from 'react';
import { Music } from 'lucide-react';

const CustomCursor = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseEnter = () => setHovered(true);
    const handleMouseLeave = () => setHovered(false);

    window.addEventListener('mousemove', handleMouseMove);

    const interactables = document.querySelectorAll('a, button, .course-card');
    interactables.forEach((el) => {
      el.addEventListener('mouseenter', handleMouseEnter);
      el.addEventListener('mouseleave', handleMouseLeave);
    });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      interactables.forEach((el) => {
        el.removeEventListener('mouseenter', handleMouseEnter);
        el.removeEventListener('mouseleave', handleMouseLeave);
      });
    };
  }, []);

  return (
    <>
      <div 
        className={`custom-cursor ${hovered ? 'hover' : ''}`} 
        style={{ 
          transform: `translate3d(${position.x - 12}px, ${position.y - 12}px, 0)` 
        }}
      >
        <Music size={18} strokeWidth={2.5} />
      </div>
    </>
  );
};

export default CustomCursor;
