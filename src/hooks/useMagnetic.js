import { useEffect, useRef } from 'react';

const useMagnetic = () => {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleMouseMove = (e) => {
      const { left, top, width, height } = el.getBoundingClientRect();
      const x = (e.clientX - left - width / 2) * 0.4;
      const y = (e.clientY - top - height / 2) * 0.4;
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };

    const handleMouseLeave = () => {
      el.style.transform = `translate3d(0, 0, 0)`;
    };

    el.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return ref;
};

export default useMagnetic;
