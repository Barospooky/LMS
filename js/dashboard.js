// ============================================
// Dashboard Logic — Awwwards Inspired
// ============================================

// Auth guard
if (localStorage.getItem('lf_logged_in') !== 'true') {
  window.location.href = 'index.html';
}

// Load user
const user = JSON.parse(localStorage.getItem('lf_user') || '{}');

// Set UI
const userFirst = document.getElementById('user-first');
const sidebarName = document.getElementById('sidebar-name');
const sidebarAvatar = document.getElementById('sidebar-avatar');

if (userFirst) userFirst.textContent = user.firstName || 'Learner';
if (sidebarName) sidebarName.textContent = user.name || 'Learner';
if (sidebarAvatar) sidebarAvatar.textContent = (user.firstName || 'L')[0].toUpperCase();

// Logout
function logout() {
  localStorage.removeItem('lf_logged_in');
  window.location.href = 'index.html';
}

// Any additional interactive logic can go here
