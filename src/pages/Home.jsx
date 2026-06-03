import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, Music2, Mic2, Guitar, Piano, Drum, Sparkles, GraduationCap, PlayCircle, BookOpen } from 'lucide-react';
import '../styles/main.css';
import '../styles/auth.css';
import Reveal from '../components/Reveal';
import useMagnetic from '../hooks/useMagnetic';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_SCRIPT_ID = 'google-identity-services';

const Home = () => {
  const navigate = useNavigate();
  const [authTab, setAuthTab] = useState('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(Boolean(GOOGLE_CLIENT_ID));
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({ firstName: '', lastName: '', email: '', password: '' });

  const btnGetStarted = useMagnetic();
  const btnStartJourney = useMagnetic();

  const handleGoogleScriptError = () => {
    setGoogleReady(false);
    setGoogleLoading(false);
    setError('Google sign-in could not load. Check your internet connection, browser extensions, or blocked third-party scripts.');
  };

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      setGoogleLoading(false);
      return undefined;
    }

    let cancelled = false;

    const initializeGoogle = () => {
      if (cancelled || !window.google?.accounts?.id) return;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
      });
      setGoogleReady(true);
      setGoogleLoading(false);

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

  // Programmatically render official Google buttons
  useEffect(() => {
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
  }, [authTab, GOOGLE_CLIENT_ID]);

  const switchTab = (tab) => {
    setAuthTab(tab);
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
    <div className="auth-page">
      <nav className="main-nav">
        <div className="nav-brand">
          <img 
            src="https://amplepro.in/wp-content/uploads/2024/06/new-logo-ap.webp" 
            alt="Amplepro Logo" 
            className="brand-logo-img"
          />
        </div>
        <div className="nav-links">
          <button ref={btnGetStarted} className="btn-outline magnetic" onClick={() => switchTab('signup')}>Get Started</button>
        </div>
      </nav>

      <main className="hero">
        <section className="hero-panel">
          <div className="hero-copy">
            <Reveal>
              <div className="eyebrow">
                <Sparkles size={12} className="icon-accent" />
                Editorial music LMS
              </div>
            </Reveal>
            <Reveal delay="0.1s">
              <h1 className="hero-title text-serif tracking-tighter">
                Master your <br />
                <span className="text-accent">musical craft.</span>
              </h1>
            </Reveal>
            <Reveal delay="0.2s">
              <p className="hero-subtext">
                A premium music learning platform by Amplepro. Explore structured instrument programs, watch high-definition lessons, and earn professional certificates upon completion.
              </p>
            </Reveal>
          </div>

          <Reveal delay="0.4s">
            <div className="hero-strip">
              <div className="hero-metric">
                <div className="metric-icon">
                  <Music2 size={20} />
                </div>
                <strong>4</strong>
                <span>Instrument-led learning paths</span>
              </div>
              <div className="hero-metric">
                <div className="metric-icon">
                  <PlayCircle size={20} />
                </div>
                <strong>Module</strong>
                <span>Video + quiz structure for every lesson</span>
              </div>
              <div className="hero-metric">
                <div className="metric-icon">
                  <GraduationCap size={20} />
                </div>
                <strong>Certificate</strong>
                <span>Generated at the end of each course</span>
              </div>
            </div>
          </Reveal>

          {/* Decorative Music Symbols */}
          <div className="floating-symbols">
            <Music className="symbol s-1" size={40} />
            <Mic2 className="symbol s-2" size={32} />
            <Guitar className="symbol s-3" size={48} />
            <Piano className="symbol s-4" size={36} />
            <Drum className="symbol s-5" size={44} />
          </div>
        </section>

        <aside className="auth-shell">
          <div className="auth-container">
            <div className="auth-tabs">
              <button className={`tab-btn ${authTab === 'login' ? 'active' : ''}`} onClick={() => switchTab('login')}>
                Sign In
              </button>
              <button className={`tab-btn ${authTab === 'signup' ? 'active' : ''}`} onClick={() => switchTab('signup')}>
                Join
              </button>
            </div>

            <div className="auth-card">
              {error && <div className="auth-error">{error}</div>}

              {authTab === 'login' && (
                <form className="auth-form active" onSubmit={handleLogin}>
                  <div className="form-header">
                    <h2 className="text-serif">Welcome back</h2>
                    <p>Pick up your purchased courses, continue the next lesson, and finish your assessments.</p>
                  </div>
                  <div className="input-group">
                    <input
                      type="email"
                      placeholder="Email Address"
                      required
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    />
                  </div>
                  <div className="input-group">
                    <input
                      type="password"
                      placeholder="Password"
                      required
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="btn-primary auth-submit" disabled={loading}>
                    {loading ? 'Signing In...' : (
                      <>
                        <span>Sign In</span>
                        <Music2 size={16} />
                      </>
                    )}
                  </button>

                  <div className="social-divider"><span>Or continue with</span></div>

                  <div className="social-btns" style={{ display: 'flex', justifyContent: 'center', width: '100%', gridColumn: 'span 2' }}>
                    <div id="google-signin-btn-login" style={{ display: 'flex', justifyContent: 'center', width: '100%', minHeight: '40px' }}></div>
                  </div>
                  {!googleReady && GOOGLE_CLIENT_ID && (
                    <p className="auth-footnote">Loading Google sign-in...</p>
                  )}
                  <p className="auth-footnote">Once logged in, students can browse courses, purchase access, and unlock every module.</p>
                </form>
              )}

              {authTab === 'signup' && (
                <form className="auth-form active" onSubmit={handleSignup}>
                  <div className="form-header">
                    <h2 className="text-serif">Start learning</h2>
                    <p>Create your account and build your musical journey with structured lessons and completion certificates.</p>
                  </div>
                  <div className="input-row">
                    <input
                      type="text"
                      placeholder="First Name"
                      required
                      value={signupData.firstName}
                      onChange={(e) => setSignupData({ ...signupData, firstName: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="Last Name"
                      required
                      value={signupData.lastName}
                      onChange={(e) => setSignupData({ ...signupData, lastName: e.target.value })}
                    />
                  </div>
                  <div className="input-group">
                    <input
                      type="email"
                      placeholder="Email"
                      required
                      value={signupData.email}
                      onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                    />
                  </div>
                  <div className="input-group">
                    <input
                      type="password"
                      placeholder="Create Password"
                      required
                      value={signupData.password}
                      onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="btn-primary auth-submit" disabled={loading}>
                    {loading ? 'Creating Account...' : (
                      <>
                        <span>Create Account</span>
                        <Sparkles size={16} />
                      </>
                    )}
                  </button>

                  <div className="social-divider"><span>Or join with</span></div>

                  <div className="social-btns" style={{ display: 'flex', justifyContent: 'center', width: '100%', gridColumn: 'span 2' }}>
                    <div id="google-signin-btn-signup" style={{ display: 'flex', justifyContent: 'center', width: '100%', minHeight: '40px' }}></div>
                  </div>
                  {!googleReady && GOOGLE_CLIENT_ID && (
                    <p className="auth-footnote">Loading Google sign-in...</p>
                  )}
                  <p className="auth-footnote">Students unlock video modules, complete quizzes, and receive a certificate at the end.</p>
                </form>
              )}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
};

export default Home;
