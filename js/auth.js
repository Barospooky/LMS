// ============================================
// Auth Page Logic — Awwwards Inspired
// ============================================

const overlay = document.getElementById('auth-overlay');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const tabLogin = document.getElementById('tab-login');
const tabSignup = document.getElementById('tab-signup');

function showAuth(type = 'login') {
  overlay.classList.add('active');
  switchTab(type);
}

function hideAuth() {
  overlay.classList.remove('active');
}

function switchTab(type) {
  if (type === 'login') {
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
    loginForm.classList.add('active');
    signupForm.classList.remove('active');
  } else {
    tabSignup.classList.add('active');
    tabLogin.classList.remove('active');
    signupForm.classList.add('active');
    loginForm.classList.remove('active');
  }
}

// Close on overlay click
overlay.addEventListener('click', (e) => {
  if (e.target === overlay) hideAuth();
});

// Login handler
function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    showToast('Please fill in all fields', 'error');
    return;
  }

  const nameRaw = email.split('@')[0];
  const name = nameRaw.charAt(0).toUpperCase() + nameRaw.slice(1);

  const user = {
    name: name,
    email: email,
    firstName: name.split('.')[0] || name,
    lastName: name.split('.')[1] || '',
  };

  localStorage.setItem('lf_user', JSON.stringify(user));
  localStorage.setItem('lf_logged_in', 'true');

  showToast('Welcome back, ' + user.firstName + '!', 'success');

  setTimeout(() => {
    window.location.href = 'dashboard.html';
  }, 800);
}

// Signup handler
function handleSignup() {
  const fname = document.getElementById('signup-fname').value.trim();
  const lname = document.getElementById('signup-lname').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;

  if (!fname || !email || !password) {
    showToast('Please fill in required fields', 'error');
    return;
  }

  const user = { name: fname + (lname ? ' ' + lname : ''), email, firstName: fname, lastName: lname };
  localStorage.setItem('lf_user', JSON.stringify(user));
  localStorage.setItem('lf_logged_in', 'true');

  showToast('Account created! Welcome, ' + fname + '!', 'success');

  setTimeout(() => {
    window.location.href = 'dashboard.html';
  }, 800);
}

// Toast notifications
function showToast(msg, type = 'info') {
  const existing = document.querySelector('.lf-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'lf-toast';
  toast.style.cssText = `
    position: fixed;
    bottom: 40px;
    left: 50%;
    transform: translateX(-50%);
    background: #000;
    color: #fff;
    padding: 16px 32px;
    font-size: 14px;
    font-weight: 600;
    z-index: 10000;
    font-family: var(--font-display);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.5s';
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

// Check if already logged in
if (localStorage.getItem('lf_logged_in') === 'true' && window.location.pathname.includes('index.html')) {
  window.location.href = 'dashboard.html';
}
