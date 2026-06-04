import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, GraduationCap, PlayCircle, BookOpen, Layers, ShieldAlert, Award, Star, Compass } from 'lucide-react';
import '../styles/main.css';
import '../styles/auth.css';
import '../styles/dashboard.css'; // For the course cards
import Reveal from '../components/Reveal';
import useMagnetic from '../hooks/useMagnetic';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_SCRIPT_ID = 'google-identity-services';

const Home = () => {
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [landingCourses, setLandingCourses] = useState([]);

  const btnGetStarted = useMagnetic();
  const btnStartJourney = useMagnetic();

  const handleGoogleScriptError = () => {
    setGoogleReady(false);
    setError('Google sign-in could not load. Check your internet connection or browser settings.');
  };

  useEffect(() => {
    fetchPublicCourses();
  }, []);

  const fetchPublicCourses = async () => {
    try {
      const response = await fetch(`${API_URL}/api/courses/landing`);
      const data = await response.json();
      if (response.ok) {
        setLandingCourses(data);
      }
    } catch (err) {
      console.error('Error fetching public courses:', err);
    }
  };

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return undefined;

    let cancelled = false;

    const initializeGoogle = () => {
      if (cancelled || !window.google?.accounts?.id) return;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
      });
      setGoogleReady(true);
      window.dispatchEvent(new Event('google-sdk-loaded'));
    };

    if (window.google?.accounts?.id) {
      initializeGoogle();
      return () => {
        cancelled = true;
      };
    }

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener('load', initializeGoogle);
      existingScript.addEventListener('error', handleGoogleScriptError);

      return () => {
        cancelled = true;
        existingScript.removeEventListener('load', initializeGoogle);
        existingScript.removeEventListener('error', handleGoogleScriptError);
      };
    }

    const script = document.createElement('script');
    script.id = GOOGLE_SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogle;
    script.onerror = handleGoogleScriptError;
    document.body.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!showAuthModal) return;

    const renderGoogleButtons = () => {
      if (!GOOGLE_CLIENT_ID || !window.google?.accounts?.id) return;

      const loginContainer = document.getElementById('google-signin-btn-login');
      if (loginContainer) {
        window.google.accounts.id.renderButton(loginContainer, {
          theme: 'outline',
          size: 'large',
          width: loginContainer.offsetWidth || 340,
          text: 'continue_with',
          shape: 'pill',
        });
      }

      const signupContainer = document.getElementById('google-signin-btn-signup');
      if (signupContainer) {
        window.google.accounts.id.renderButton(signupContainer, {
          theme: 'outline',
          size: 'large',
          width: signupContainer.offsetWidth || 340,
          text: 'signup_with',
          shape: 'pill',
        });
      }
    };

    renderGoogleButtons();
    window.addEventListener('google-sdk-loaded', renderGoogleButtons);
    const timer = setTimeout(renderGoogleButtons, 200);

    return () => {
      window.removeEventListener('google-sdk-loaded', renderGoogleButtons);
      clearTimeout(timer);
    };
  }, [showAuthModal, authTab, GOOGLE_CLIENT_ID]);

  const switchTab = (tab) => {
    setAuthTab(tab);
    setError('');
  };

  const openAuth = (tab = 'login') => {
    setAuthTab(tab);
    setShowAuthModal(true);
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setShowAuthModal(false);
        navigate('/dashboard');
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Connection to server failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setShowAuthModal(false);
        navigate('/dashboard');
      } else {
        setError(data.message || 'Signup failed');
      }
    } catch (err) {
      setError('Connection to server failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (response) => {
    setLoading(true);
    setError('');

    try {
      const apiResponse = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });

      const data = await apiResponse.json();

      if (apiResponse.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setShowAuthModal(false);
        navigate('/dashboard');
      } else {
        setError(data.message || 'Google login failed');
      }
    } catch (err) {
      setError('Google login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" style={{ overflowY: 'auto' }}>
      {/* Header */}
      <nav className="main-nav">
        <div className="nav-brand">
          <img 
            src="https://amplepro.in/wp-content/uploads/2024/06/new-logo-ap.webp" 
            alt="Amplepro Logo" 
            className="brand-logo-img"
          />
        </div>
        <div className="nav-links">
          <button className="btn-text" style={{ cursor: 'pointer', outline: 'none' }} onClick={() => openAuth('login')}>Sign In</button>
          <button ref={btnGetStarted} className="btn-primary magnetic" onClick={() => openAuth('signup')}>Get Started</button>
        </div>
      </nav>

      <div className="landing-page">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-copy">
            <Reveal>
              <div className="eyebrow" style={{ color: 'var(--accent)' }}>
                <Sparkles size={12} className="icon-accent" />
                White-Label Professional LMS
              </div>
            </Reveal>
            <Reveal delay="0.1s">
              <h1 className="hero-title text-serif tracking-tighter" style={{ margin: '20px 0', fontSize: 'clamp(48px, 6vw, 76px)' }}>
                Accelerate your <br />
                <span className="text-accent">professional growth.</span>
              </h1>
            </Reveal>
            <Reveal delay="0.2s">
              <p className="hero-subtext" style={{ fontSize: '18px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Amplepro Academy delivers premium training courses covering software engineering, product strategy, data analytics, and digital marketing. Build your career with verifiable credentials and interactive learning paths.
              </p>
            </Reveal>
            <Reveal delay="0.3s">
              <div className="hero-actions" style={{ display: 'flex', gap: '14px', marginTop: '32px' }}>
                <button
                  ref={btnStartJourney}
                  className="btn-primary magnetic"
                  onClick={() => openAuth('signup')}
                >
                  Start Learning
                </button>
                <a href="#courses" className="btn-outline" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                  Explore Programs
                </a>
              </div>
            </Reveal>
          </div>

          <Reveal delay="0.4s">
            <div className="hero-img-container">
              <img 
                src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1200" 
                alt="Amplepro Academy Learning" 
                className="academy-photo"
              />
            </div>
          </Reveal>
        </section>

        {/* About Section */}
        <section id="about" className="about-section">
          <Reveal>
            <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
              <div className="section-label" style={{ color: 'var(--accent)', fontWeight: 'bold' }}>Our Academy</div>
              <h2 className="text-serif" style={{ fontSize: '42px', marginTop: '10px' }}>Designed for Educational Excellence</h2>
              <p className="text-secondary" style={{ fontSize: '16px', lineHeight: '1.7', marginTop: '16px' }}>
                Amplepro Academy provides a state-of-the-art corporate learning environment. Our courses are structured by industry practitioners and verified using artificial intelligence, guaranteeing structured outcomes and verifiable certificates.
              </p>
            </div>
          </Reveal>

          <div className="about-grid">
            <Reveal delay="0.1s">
              <div className="about-card">
                <div className="metric-icon"><Compass /></div>
                <h3>Structured Curriculums</h3>
                <p className="text-secondary" style={{ fontSize: '14px' }}>Syllabus pathways optimized for professional integration. Learn at your own pace with structured video logs and checkpoints.</p>
              </div>
            </Reveal>
            <Reveal delay="0.2s">
              <div className="about-card">
                <div className="metric-icon"><Star /></div>
                <h3>AI-Driven Assessments</h3>
                <p className="text-secondary" style={{ fontSize: '14px' }}>Dynamic checkpoints and verbal practice exercises check your understanding in real-time, evaluated using Google Gemini AI.</p>
              </div>
            </Reveal>
            <Reveal delay="0.3s">
              <div className="about-card">
                <div className="metric-icon"><Award /></div>
                <h3>Verifiable Credentials</h3>
                <p className="text-secondary" style={{ fontSize: '14px' }}>Earn a high-fidelity PDF certificate bearing your custom digital signature upon successful completion of the course syllabus.</p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Courses Showcase Section */}
        <section id="courses" className="landing-courses-section">
          <Reveal>
            <div className="landing-courses-header" style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 48px' }}>
              <div className="section-label" style={{ color: 'var(--accent)', fontWeight: 'bold' }}>Programs Catalog</div>
              <h2 className="text-serif" style={{ fontSize: '42px', marginTop: '10px' }}>Our Educational Programs</h2>
              <p className="text-secondary" style={{ fontSize: '15px' }}>Browse through our self-paced paths, view course details, and enroll to unlock modules.</p>
            </div>
          </Reveal>

          <div className="courses-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
            {landingCourses.length === 0 ? (
              <p style={{ gridColumn: 'span 3', textAlign: 'center', opacity: 0.5 }}>Loading available programs...</p>
            ) : (
              landingCourses.map((course, idx) => (
                <Reveal key={course.id} delay={`${0.1 * idx}s`}>
                  <div className="course-card" onClick={() => openAuth('login')} style={{ cursor: 'pointer' }}>
                    <div className="card-thumb" style={{ height: '200px' }}>
                      <img src={course.thumbnail} alt={course.title} />
                    </div>
                    <div className="card-body">
                      <div className="card-topline" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span className="card-tag">{course.category}</span>
                        <span className="difficulty-tag" style={{ background: 'rgba(23, 20, 17, 0.04)' }}>{course.difficulty}</span>
                        <span className="card-status" style={{ marginLeft: 'auto' }}>Available</span>
                      </div>
                      <h3 className="text-display font-semibold" style={{ fontSize: '22px', margin: '8px 0' }}>{course.title}</h3>
                      <p className="text-secondary" style={{ fontSize: '13px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{course.description}</p>
                      <div className="card-footer" style={{ borderTop: '1px solid var(--line-soft)', paddingTop: '14px', marginTop: 'auto' }}>
                        <span className="price" style={{ fontSize: '18px', fontWeight: 'bold' }}>₹{course.price}</span>
                        <span className="buy-now" style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: '11px' }}>Enroll &amp; Start</span>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="landing-footer">
          <img 
            src="https://amplepro.in/wp-content/uploads/2024/06/new-logo-ap.webp" 
            alt="Amplepro Logo" 
            className="brand-logo-img-small"
            style={{ marginBottom: '16px' }}
          />
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>&copy; {new Date().getFullYear()} Amplepro Technologies. All rights reserved.</p>
        </footer>
      </div>

      {/* Glassmorphic Auth Modal */}
      {showAuthModal && (
        <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="modal-content auth-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowAuthModal(false)}>&times;</button>
            
            <div className="auth-container">
              <div className="auth-card">
                {error && <div className="auth-error">{error}</div>}

                {authTab === 'login' && (
                  <form className="auth-form active" onSubmit={handleLogin}>
                    <div className="form-header">
                      <h2 className="text-serif" style={{ fontSize: '28px', marginBottom: '8px' }}>Welcome back</h2>
                      <p style={{ fontSize: '13px' }}>Pick up your purchased courses, continue lessons, and complete assessments.</p>
                    </div>
                    <div className="input-group">
                      <input
                        type="email"
                        placeholder="Email Address"
                        required
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        style={{ padding: '14px 16px', borderRadius: '14px' }}
                      />
                    </div>
                    <div className="input-group">
                      <input
                        type="password"
                        placeholder="Password"
                        required
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        style={{ padding: '14px 16px', borderRadius: '14px' }}
                      />
                    </div>
                    <button type="submit" className="btn-primary auth-submit" disabled={loading} style={{ padding: '14px', borderRadius: '14px' }}>
                      {loading ? 'Signing In...' : 'Sign In'}
                    </button>

                    <div className="social-divider"><span>Or continue with</span></div>

                    <div className="social-btns" style={{ display: 'flex', justifyContent: 'center', width: '100%', gridColumn: 'span 2' }}>
                      <div id="google-signin-btn-login" style={{ display: 'flex', justifyContent: 'center', width: '100%', minHeight: '40px' }}></div>
                    </div>
                    {!googleReady && GOOGLE_CLIENT_ID && (
                      <p className="auth-footnote">Loading Google sign-in...</p>
                    )}

                    <div className="auth-switch">
                      Don&apos;t have an account?{' '}
                      <button type="button" className="auth-switch-btn" onClick={() => switchTab('signup')}>
                        Sign up
                      </button>
                    </div>
                  </form>
                )}

                {authTab === 'signup' && (
                  <form className="auth-form active" onSubmit={handleSignup}>
                    <div className="form-header">
                      <h2 className="text-serif" style={{ fontSize: '28px', marginBottom: '8px' }}>Start learning</h2>
                      <p style={{ fontSize: '13px' }}>Create your account to unlock self-paced professional development modules.</p>
                    </div>
                    <div className="input-row" style={{ gap: '10px' }}>
                      <input
                        type="text"
                        placeholder="First Name"
                        required
                        value={signupData.firstName}
                        onChange={(e) => setSignupData({ ...signupData, firstName: e.target.value })}
                        style={{ padding: '14px 16px', borderRadius: '14px' }}
                      />
                      <input
                        type="text"
                        placeholder="Last Name"
                        required
                        value={signupData.lastName}
                        onChange={(e) => setSignupData({ ...signupData, lastName: e.target.value })}
                        style={{ padding: '14px 16px', borderRadius: '14px' }}
                      />
                    </div>
                    <div className="input-group">
                      <input
                        type="email"
                        placeholder="Email"
                        required
                        value={signupData.email}
                        onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                        style={{ padding: '14px 16px', borderRadius: '14px' }}
                      />
                    </div>
                    <div className="input-group">
                      <input
                        type="password"
                        placeholder="Create Password"
                        required
                        value={signupData.password}
                        onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                        style={{ padding: '14px 16px', borderRadius: '14px' }}
                      />
                    </div>
                    <button type="submit" className="btn-primary auth-submit" disabled={loading} style={{ padding: '14px', borderRadius: '14px' }}>
                      {loading ? 'Creating Account...' : 'Create Account'}
                    </button>

                    <div className="social-divider"><span>Or join with</span></div>

                    <div className="social-btns" style={{ display: 'flex', justifyContent: 'center', width: '100%', gridColumn: 'span 2' }}>
                      <div id="google-signin-btn-signup" style={{ display: 'flex', justifyContent: 'center', width: '100%', minHeight: '40px' }}></div>
                    </div>
                    {!googleReady && GOOGLE_CLIENT_ID && (
                      <p className="auth-footnote">Loading Google sign-in...</p>
                    )}

                    <div className="auth-switch">
                      Already have an account?{' '}
                      <button type="button" className="auth-switch-btn" onClick={() => switchTab('login')}>
                        Sign in
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
