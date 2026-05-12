// ============================================
// Course Player Logic — Music Academy
// ============================================

// Auth guard
if (localStorage.getItem('lf_logged_in') !== 'true') {
  window.location.href = 'index.html';
}

// ---- Music Course Data ----
const courseData = {
  title: 'Piano Masterclass: Intermediate',
  totalLessons: 12,
  sections: [
    {
      title: 'Technique Foundations',
      lessons: [
        { id: 1, title: 'Posture & Hand Position', duration: '12 min', completed: true },
        { id: 2, title: 'Major Scales & Fingerings', duration: '18 min', completed: true },
        { id: 3, title: 'Minor Scales & Relative Keys', duration: '22 min', completed: true },
      ]
    },
    {
      title: 'Advanced Movements',
      lessons: [
        { id: 4, title: 'Mastering Arpeggios', duration: '25 min', completed: false, current: true },
        { id: 5, title: 'Chord Inversions', duration: '20 min', completed: false },
        { id: 6, title: 'Introduction to Hanon', duration: '30 min', completed: false },
      ]
    }
  ]
};

// ---- State ----
let currentLessonId = 4;

// ---- Build Curriculum ----
function buildCurriculum() {
  const list = document.getElementById('curriculum-list');
  if (!list) return;

  list.innerHTML = '';

  courseData.sections.forEach(section => {
    section.lessons.forEach(lesson => {
      const item = document.createElement('div');
      item.className = `curr-item ${lesson.current ? 'active' : ''}`;
      item.onclick = () => loadLesson(lesson.id);

      item.innerHTML = `
        <span class="num">${lesson.id < 10 ? '0' + lesson.id : lesson.id} /</span>
        <span class="title">${lesson.title}</span>
      `;

      list.appendChild(item);
    });
  });
}

// ---- Load Lesson ----
function loadLesson(id) {
  const allLessons = courseData.sections.flatMap(s => s.lessons);
  const lesson = allLessons.find(l => l.id === id);
  if (!lesson) return;

  currentLessonId = id;

  // Update UI
  document.getElementById('lesson-title').textContent = lesson.title;
  document.getElementById('nav-title').textContent = lesson.title;
  
  // Rebuild curriculum to update active state
  courseData.sections.forEach(s => s.lessons.forEach(l => l.current = (l.id === id)));
  buildCurriculum();
}

// ---- Tab Switching ----
function switchLessonTab(tabName) {
  // Update buttons
  const tabs = document.querySelectorAll('.ltab');
  tabs.forEach(t => {
    t.classList.remove('active');
    if (t.textContent.toLowerCase() === tabName) t.classList.add('active');
  });

  // Update content
  const content = document.getElementById('tab-overview');
  if (tabName === 'overview') {
    content.innerHTML = `
      <ul class="lesson-points">
        <li>Key techniques for this lesson</li>
        <li>Step-by-step practice guide</li>
        <li>Common challenges & solutions</li>
      </ul>
    `;
  } else if (tabName === 'resources') {
    content.innerHTML = `
      <ul class="lesson-points">
        <li>PDF Sheet Music</li>
        <li>MP3 Backing Track</li>
        <li>Practice Log Template</li>
      </ul>
    `;
  } else {
    content.innerHTML = `<p class="text-secondary">Your personal notes for this lesson will appear here.</p>`;
  }
}

// ---- Video Simulation ----
function startLesson() {
  const overlay = document.getElementById('play-overlay');
  overlay.style.opacity = '0';
  setTimeout(() => overlay.style.display = 'none', 500);
  
  // Simulated video load
  document.getElementById('video-player').style.background = '#111';
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  buildCurriculum();
});
