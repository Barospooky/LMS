/* ============================================
   Global Interactions — Awwwards Inspired
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  initCustomCursor();
  initScrollReveals();
  initMagneticElements();
});

/**
 * Custom Cursor Logic
 */
function initCustomCursor() {
  const cursor = document.createElement('div');
  const follower = document.createElement('div');
  cursor.className = 'custom-cursor';
  follower.className = 'custom-cursor-follower';
  document.body.appendChild(cursor);
  document.body.appendChild(follower);

  document.addEventListener('mousemove', (e) => {
    cursor.style.transform = `translate3d(${e.clientX - 4}px, ${e.clientY - 4}px, 0)`;
    follower.style.transform = `translate3d(${e.clientX - 20}px, ${e.clientY - 20}px, 0)`;
  });

  // Hover states
  const interactables = document.querySelectorAll('a, button, .course-card');
  interactables.forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursor.style.transform += ' scale(2)';
      follower.style.transform += ' scale(1.5)';
      follower.style.background = 'rgba(255, 255, 255, 0.1)';
    });
    el.addEventListener('mouseleave', () => {
      cursor.style.transform = cursor.style.transform.replace(' scale(2)', '');
      follower.style.transform = follower.style.transform.replace(' scale(1.5)', '');
      follower.style.background = 'transparent';
    });
  });
}

/**
 * Scroll Reveal Animations
 */
function initScrollReveals() {
  const reveals = document.querySelectorAll('.reveal');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
      }
    });
  }, { threshold: 0.1 });
  
  reveals.forEach(reveal => {
    observer.observe(reveal);
  });
}

/**
 * Magnetic Buttons
 */
function initMagneticElements() {
  const magneticEls = document.querySelectorAll('.magnetic');
  magneticEls.forEach(el => {
    el.addEventListener('mousemove', (e) => {
      const { left, top, width, height } = el.getBoundingClientRect();
      const x = (e.clientX - left - width / 2) * 0.4;
      const y = (e.clientY - top - height / 2) * 0.4;
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform = `translate3d(0, 0, 0)`;
    });
  });
}

