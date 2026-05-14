import React, { useEffect, useState } from 'react';

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
          transform: `translate3d(${position.x - 4}px, ${position.y - 4}px, 0) scale(${hovered ? 2 : 1})` 
        }}
      ></div>
      <div 
        className={`custom-cursor-follower ${hovered ? 'hover' : ''}`} 
        style={{ 
          transform: `translate3d(${position.x - 20}px, ${position.y - 20}px, 0) scale(${hovered ? 1.5 : 1})`,
          background: hovered ? 'rgba(255, 255, 255, 0.1)' : 'transparent'
        }}
      ></div>
    </>
  );
};

export default CustomCursor;
