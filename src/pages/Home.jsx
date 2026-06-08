import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Sparkles, GraduationCap, PlayCircle, BookOpen, Layers,
  ShieldCheck, Award, Star, Compass, Users, Brain, BadgeCheck,
  ChevronDown, Mail, MapPin, Phone, Globe, ArrowRight, Clock, Shield, Zap,
  Eye, EyeOff
} from 'lucide-react';

const Linkedin = ({ size = 16, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
    <rect x="2" y="9" width="4" height="12"></rect>
    <circle cx="4" cy="4" r="2"></circle>
  </svg>
);

const Twitter = ({ size = 16, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
  </svg>
);

const Instagram = ({ size = 16, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

const Youtube = ({ size = 16, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path>
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon>
  </svg>
);
import '../styles/main.css';
import '../styles/auth.css';
import '../styles/dashboard.css';
import Reveal from '../components/Reveal';
import useMagnetic from '../hooks/useMagnetic';
import useAuth from '../hooks/useAuth';
import { buildCourseArtwork } from '../utils/courseArt';
import { formatCategoryLabel } from '../utils/category';
import API_URL from '../utils/apiClient';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_SCRIPT_ID = 'google-identity-services';

/* ─── Testimonial Data ─── */
const TESTIMONIALS = [
  {
    name: 'Priya Sharma',
    role: 'Software Engineer at TCS',
    initials: 'PS',
    quote: 'The AI Agents course completely transformed how I approach automation. Within weeks I was building intelligent workflows that saved my team 20+ hours monthly.',
    rating: 5,
  },
  {
    name: 'Arjun Mehta',
    role: 'Product Manager at Flipkart',
    initials: 'AM',
    quote: 'Amplepro\'s product strategy modules are incredibly well-structured. The AI-driven assessments gave me real-time feedback that no other platform offers.',
    rating: 5,
  },
  {
    name: 'Sneha Reddy',
    role: 'Data Analyst at Wipro',
    initials: 'SR',
    quote: 'I earned my data analytics certificate in just 4 weeks. The structured learning paths and checkpoint quizzes made sure I truly understood every concept.',
    rating: 5,
  },
];

/* ─── FAQ Data ─── */
const FAQ_DATA = [
  {
    q: 'Is a certificate provided upon completion?',
    a: 'Yes! Upon successfully completing all modules and passing the AI-driven assessments, you receive a high-fidelity PDF certificate with a verifiable digital signature that you can share on LinkedIn and your portfolio.',
  },
  {
    q: 'How long do the courses take to complete?',
    a: 'Course duration varies from 2 to 8 weeks depending on the program. All courses are self-paced, so you can learn at your own speed. Most learners complete courses within 4 weeks with 5-6 hours of weekly study.',
  },
  {
    q: 'Is there a refund policy?',
    a: 'We offer a 7-day money-back guarantee on all courses. If you\'re not satisfied with the content within the first 7 days of purchase, contact our support team for a full refund — no questions asked.',
  },
  {
    q: 'Do I get lifetime access to course materials?',
    a: 'Absolutely! Once you enroll, you get lifetime access to all course videos, resources, and future updates. You can revisit any module at any time, even after completing the course.',
  },
  {
    q: 'How are the AI-driven assessments different?',
    a: 'Our assessments are powered by Google Gemini AI. They evaluate your understanding through dynamic checkpoints, verbal practice exercises, and contextual quizzes — providing personalized feedback instead of generic multiple-choice tests.',
  },
];

const Home = () => {
  const navigate = useNavigate();
  const { login, signup, googleLogin } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [openFaq, setOpenFaq] = useState(null);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const btnGetStarted = useMagnetic();
  const btnStartJourney = useMagnetic();

  const handleGoogleScriptError = () => {
    setGoogleReady(false);
    setError('Google sign-in could not load. Check your internet connection or browser settings.');
  };

  const landingCoursesQuery = useQuery({
    queryKey: ['landing-courses'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/courses/landing`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Error fetching public courses');
      }
      return data;
    },
  });

  const landingCourses = landingCoursesQuery.data || [];

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

  // Handle ESC key close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowAuthModal(false);
      }
    };
    if (showAuthModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showAuthModal]);

  // Focus trap
  useEffect(() => {
    if (!showAuthModal) return;
    
    const modalElement = document.querySelector('.auth-modal-content');
    if (!modalElement) return;

    const focusableElements = modalElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabTrap = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) { // Shift + Tab
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else { // Tab
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleTabTrap);
    
    // Auto-focus first input when modal opens
    const firstInput = modalElement.querySelector('input');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }

    return () => {
      window.removeEventListener('keydown', handleTabTrap);
    };
  }, [showAuthModal, authTab]);

  const switchTab = (tab) => {
    setAuthTab(tab);
    setError('');
  };

  const openAuth = (tab = 'login') => {
    setAuthTab(tab);
    setShowAuthModal(true);
    setError('');
  };

  const handleLoginChange = (field, value) => {
    setLoginData({ ...loginData, [field]: value });
    if (fieldErrors[field]) {
      setFieldErrors({ ...fieldErrors, [field]: '' });
    }
  };

  const handleSignupChange = (field, value) => {
    setSignupData({ ...signupData, [field]: value });
    if (fieldErrors[field]) {
      setFieldErrors({ ...fieldErrors, [field]: '' });
    }
  };

  const handleForgotPassword = () => {
    setError('A password reset notification has been sent. Please check your inbox or contact support@amplepro.in.');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    const errors = {};
    if (!loginData.email.trim()) {
      errors.email = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(loginData.email)) {
        errors.email = 'Please enter a valid email address';
      }
    }
    if (!loginData.password.trim()) {
      errors.password = 'Password is required';
    } else if (loginData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setLoading(true);

    try {
      const user = await login(loginData);
      setShowAuthModal(false);
      if (user.role === 'admin') navigate('/admin/overview');
      else if (user.role === 'instructor') navigate('/instructor/overview');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Connection to server failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    const errors = {};
    if (!signupData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    if (!signupData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }
    if (!signupData.email.trim()) {
      errors.email = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(signupData.email)) {
        errors.email = 'Please enter a valid email address';
      }
    }
    if (!signupData.password.trim()) {
      errors.password = 'Password is required';
    } else if (signupData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setLoading(true);

    try {
      const user = await signup(signupData);
      setShowAuthModal(false);
      if (user.role === 'admin') navigate('/admin/overview');
      else if (user.role === 'instructor') navigate('/instructor/overview');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Connection to server failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (response) => {
    setLoading(true);
    setError('');

    try {
      const user = await googleLogin(response.credential);
      setShowAuthModal(false);
      if (user.role === 'admin') navigate('/admin/overview');
      else if (user.role === 'instructor') navigate('/instructor/overview');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="auth-page" style={{ overflowY: 'auto' }}>
      {/* Header */}
      <nav className="main-nav" role="navigation" aria-label="Main navigation">
        <div className="nav-brand">
          <img 
            src="https://amplepro.in/wp-content/uploads/2024/06/new-logo-ap.webp" 
            alt="Amplepro Academy Logo" 
            className="brand-logo-img"
          />
        </div>
        <div className="nav-links">
          <a href="#courses" className="btn-text" style={{ textDecoration: 'none' }}>Courses</a>
          <a href="#about" className="btn-text" style={{ textDecoration: 'none' }}>About</a>
          <a href="#faq" className="btn-text" style={{ textDecoration: 'none' }}>FAQ</a>
          <a href="#contact" className="btn-text" style={{ textDecoration: 'none' }}>Contact</a>
          <button className="btn-text" style={{ cursor: 'pointer', outline: 'none' }} onClick={() => openAuth('login')} aria-label="Sign in to your account">Sign In</button>
          <button ref={btnGetStarted} className="btn-primary magnetic" onClick={() => openAuth('signup')} aria-label="Create a new account">Get Started</button>
        </div>
      </nav>

      <div className="landing-page">
        {/* ═══════ Hero Section ═══════ */}
        <section className="hero-section" aria-labelledby="hero-heading">
          <div className="hero-copy">
            <Reveal>
              <div className="eyebrow" style={{ color: 'var(--accent)' }}>
                <Sparkles size={12} className="icon-accent" aria-hidden="true" />
                AI-Powered Professional LMS
              </div>
            </Reveal>
            <Reveal delay="0.1s">
              <h1 id="hero-heading" className="hero-title text-serif tracking-tighter" style={{ margin: '20px 0', fontSize: 'clamp(48px, 6vw, 76px)' }}>
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
              <div className="hero-actions" style={{ display: 'flex', gap: '14px', marginTop: '28px' }}>
                <button
                  ref={btnStartJourney}
                  className="btn-primary magnetic"
                  onClick={() => openAuth('signup')}
                  aria-label="Start learning - create account"
                >
                  Start Learning
                </button>
                <a href="#courses" className="btn-outline" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                  Explore Programs
                </a>
              </div>
            </Reveal>

            {/* Issue #4: Hero Stats */}
            <Reveal delay="0.4s">
              <div className="hero-stats-strip">
                <div className="hero-stat-item">
                  <div className="hero-stat-icon"><Users size={16} /></div>
                  <div className="hero-stat-text">
                    <strong>5000+</strong>
                    <span>Learners</span>
                  </div>
                </div>
                <div className="hero-stat-item">
                  <div className="hero-stat-icon"><BookOpen size={16} /></div>
                  <div className="hero-stat-text">
                    <strong>25+</strong>
                    <span>Courses</span>
                  </div>
                </div>
                <div className="hero-stat-item">
                  <div className="hero-stat-icon"><Award size={16} /></div>
                  <div className="hero-stat-text">
                    <strong>Verified</strong>
                    <span>Certificates</span>
                  </div>
                </div>
                <div className="hero-stat-item">
                  <div className="hero-stat-icon"><Brain size={16} /></div>
                  <div className="hero-stat-text">
                    <strong>AI</strong>
                    <span>Powered</span>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Issue #13: Platform screenshot instead of stock photo */}
          <Reveal delay="0.5s">
            <div className="hero-img-container">
              <img 
                src="/lms-dashboard-hero.png" 
                alt="Amplepro Academy Learning Dashboard showing course progress, modules, and AI assessments" 
                className="academy-photo"
              />
            </div>
          </Reveal>
        </section>

        {/* ═══════ Trust Indicators ═══════ */}
        <Reveal>
          <section className="trust-section" aria-label="Trust indicators">
            <div className="trust-badge">
              <ShieldCheck size={16} />
              Trusted by 1000+ professionals across India
            </div>
            <div className="trust-logos">
              <div className="trust-logo-item">
                <div className="trust-logo-icon"><Globe size={20} /></div>
                Global Reach
              </div>
              <div className="trust-logo-item">
                <div className="trust-logo-icon"><ShieldCheck size={20} /></div>
                ISO Certified
              </div>
              <div className="trust-logo-item">
                <div className="trust-logo-icon"><Brain size={20} /></div>
                AI Verified
              </div>
              <div className="trust-logo-item">
                <div className="trust-logo-icon"><Award size={20} /></div>
                Industry Certs
              </div>
              <div className="trust-logo-item">
                <div className="trust-logo-icon"><BadgeCheck size={20} /></div>
                Quality Assured
              </div>
            </div>
          </section>
        </Reveal>

        {/* ═══════ About Section ═══════ */}
        <section id="about" className="about-section" aria-labelledby="about-heading">
          <Reveal>
            <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
              <div className="section-label">Our Academy</div>
              <h2 id="about-heading" className="text-serif" style={{ fontSize: '42px', marginTop: '10px' }}>Designed for Educational Excellence</h2>
              <p className="text-secondary" style={{ fontSize: '16px', lineHeight: '1.7', marginTop: '16px' }}>
                Amplepro Academy provides a state-of-the-art corporate learning environment. Our courses are structured by industry practitioners and verified using artificial intelligence, guaranteeing structured outcomes and verifiable certificates.
              </p>
            </div>
          </Reveal>

          <div className="about-grid">
            <Reveal delay="0.1s">
              <div className="about-card">
                <div className="metric-icon"><Compass aria-hidden="true" /></div>
                <h3>Structured Curriculums</h3>
                <p className="text-secondary" style={{ fontSize: '14px' }}>Syllabus pathways optimized for professional integration. Learn at your own pace with structured video logs and checkpoints.</p>
              </div>
            </Reveal>
            <Reveal delay="0.2s">
              <div className="about-card">
                <div className="metric-icon"><Star aria-hidden="true" /></div>
                <h3>AI-Driven Assessments</h3>
                <p className="text-secondary" style={{ fontSize: '14px' }}>Dynamic checkpoints and verbal practice exercises check your understanding in real-time, evaluated using Google Gemini AI.</p>
              </div>
            </Reveal>
            <Reveal delay="0.3s">
              <div className="about-card">
                <div className="metric-icon"><Award aria-hidden="true" /></div>
                <h3>Verifiable Credentials</h3>
                <p className="text-secondary" style={{ fontSize: '14px' }}>Earn a high-fidelity PDF certificate bearing your custom digital signature upon successful completion of the course syllabus.</p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ═══════ Courses Showcase ═══════ */}
        <section id="courses" className="landing-courses-section" aria-labelledby="courses-heading">
          <Reveal>
            <div className="landing-courses-header" style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 36px' }}>
              <div className="section-label">Programs Catalog</div>
              <h2 id="courses-heading" className="text-serif" style={{ fontSize: '42px', marginTop: '10px' }}>Our Educational Programs</h2>
              <p className="text-secondary" style={{ fontSize: '15px' }}>Browse through our self-paced paths, view course details, and enroll to unlock modules.</p>
            </div>
          </Reveal>

          <div className="courses-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
            {landingCourses.length === 0 ? (
              <p style={{ gridColumn: 'span 3', textAlign: 'center', opacity: 0.5 }}>Loading available programs...</p>
            ) : (
              landingCourses.map((course, idx) => (
                <Reveal key={course.id} delay={`${0.1 * idx}s`}>
                  <div className="course-card" onClick={() => openAuth('login')} style={{ cursor: 'pointer' }} role="button" tabIndex={0} aria-label={`View ${course.title} course`} onKeyDown={(e) => e.key === 'Enter' && openAuth('login')}>
                    <div className="card-thumb" style={{ height: '200px' }}>
                      <img 
                        src={course.thumbnail || buildCourseArtwork(course)} 
                        alt={course.title} 
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = buildCourseArtwork(course);
                        }}
                      />
                    </div>
                    <div className="card-body">
                      <div className="card-topline" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span className="card-tag">{formatCategoryLabel(course.category)}</span>
                        <span className="difficulty-tag" style={{ background: 'rgba(23, 20, 17, 0.04)' }}>{course.difficulty}</span>
                        <span className="card-status" style={{ marginLeft: 'auto' }}>Available</span>
                      </div>
                      <h3 className="text-display font-semibold" style={{ fontSize: '22px', margin: '8px 0' }}>{course.title}</h3>
                      {/* Issue #9: Limit description to 2 lines */}
                      <p className="text-secondary" style={{ fontSize: '13px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{course.description}</p>
                      {/* Issue #8: Enhanced price display */}
                      <div className="card-badges">
                        <span className="card-badge"><Clock size={10} /> Lifetime Access</span>
                        <span className="card-badge"><Award size={10} /> Certificate</span>
                      </div>
                      <div className="card-footer" style={{ borderTop: '1px solid var(--line-soft)', paddingTop: '14px', marginTop: 'auto' }}>
                        <div className="card-price-block">
                          <span className="price">₹{Math.round(parseFloat(course.price)).toLocaleString('en-IN')}</span>
                          <span className="price-sub">One-time payment</span>
                        </div>
                        <span className="buy-now" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          Enroll & Start <ArrowRight size={12} />
                        </span>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))
            )}
          </div>
        </section>

        {/* ═══════ Testimonials Section ═══════ */}
        <section className="testimonials-section" aria-labelledby="testimonials-heading">
          <Reveal>
            <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
              <div className="section-label">What Learners Say</div>
              <h2 id="testimonials-heading" className="text-serif" style={{ fontSize: '42px', marginTop: '10px' }}>Student Success Stories</h2>
              <p className="text-secondary" style={{ fontSize: '15px' }}>Hear from professionals who transformed their careers with Amplepro Academy.</p>
            </div>
          </Reveal>

          <div className="testimonials-grid">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={i} delay={`${0.1 * i}s`}>
                <div className="testimonial-card">
                  <div className="testimonial-stars" aria-label={`${t.rating} out of 5 stars`}>
                    {'★'.repeat(t.rating)}
                  </div>
                  <p className="testimonial-quote">"{t.quote}"</p>
                  <div className="testimonial-author">
                    <div className="testimonial-avatar">{t.initials}</div>
                    <div className="testimonial-info">
                      <strong>{t.name}</strong>
                      <span>{t.role}</span>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ═══════ FAQ Section ═══════ */}
        <section id="faq" className="faq-section" aria-labelledby="faq-heading">
          <Reveal>
            <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
              <div className="section-label">FAQ</div>
              <h2 id="faq-heading" className="text-serif" style={{ fontSize: '42px', marginTop: '10px' }}>Frequently Asked Questions</h2>
              <p className="text-secondary" style={{ fontSize: '15px' }}>Everything you need to know before getting started.</p>
            </div>
          </Reveal>

          <div className="faq-list" role="list">
            {FAQ_DATA.map((faq, i) => (
              <Reveal key={i} delay={`${0.05 * i}s`}>
                <div className={`faq-item ${openFaq === i ? 'open' : ''}`} role="listitem">
                  <button
                    className="faq-question"
                    onClick={() => toggleFaq(i)}
                    aria-expanded={openFaq === i}
                    aria-controls={`faq-answer-${i}`}
                  >
                    <span>{faq.q}</span>
                    <ChevronDown size={18} className="faq-chevron" aria-hidden="true" />
                  </button>
                  <div className="faq-answer" id={`faq-answer-${i}`} role="region">
                    <p>{faq.a}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ═══════ Comprehensive Footer ═══════ */}
        <footer id="contact" className="landing-footer" role="contentinfo">
          <div className="footer-grid">
            <div className="footer-brand">
              <img 
                src="https://amplepro.in/wp-content/uploads/2024/06/new-logo-ap.webp" 
                alt="Amplepro Logo" 
                className="brand-logo-img-small"
              />
              <p>Amplepro Academy delivers premium professional development courses powered by AI-driven assessments and verifiable credentials.</p>
              <div className="footer-social">
                <a href="#" className="footer-social-link" aria-label="LinkedIn"><Linkedin size={16} /></a>
                <a href="#" className="footer-social-link" aria-label="Twitter"><Twitter size={16} /></a>
                <a href="#" className="footer-social-link" aria-label="Instagram"><Instagram size={16} /></a>
                <a href="#" className="footer-social-link" aria-label="YouTube"><Youtube size={16} /></a>
              </div>
            </div>

            <div className="footer-column">
              <h4>Quick Links</h4>
              <ul className="footer-links">
                <li><a href="#about">About Us</a></li>
                <li><a href="#courses">Courses</a></li>
                <li><a href="#faq">FAQ</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); openAuth('signup'); }}>Get Started</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); openAuth('login'); }}>Sign In</a></li>
              </ul>
            </div>

            <div className="footer-column">
              <h4>Support</h4>
              <ul className="footer-links">
                <li><a href="#">Help Center</a></li>
                <li><a href="#">Privacy Policy</a></li>
                <li><a href="#">Terms & Conditions</a></li>
                <li><a href="#">Refund Policy</a></li>
              </ul>
            </div>

            <div className="footer-column">
              <h4>Contact</h4>
              <ul className="footer-links">
                <li><a href="mailto:support@amplepro.in"><Mail size={14} /> support@amplepro.in</a></li>
                <li><a href="#"><MapPin size={14} /> India</a></li>
                <li><a href="#"><Globe size={14} /> amplepro.in</a></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} Amplepro Technologies. All rights reserved.</p>
            <div className="footer-bottom-links">
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
              <a href="#">Sitemap</a>
            </div>
          </div>
        </footer>
      </div>

      {/* Glassmorphic Auth Modal */}
      {showAuthModal && (
        <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="modal-content auth-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowAuthModal(false)} aria-label="Close authentication modal">&times;</button>
            
            <div className="auth-container">
              <div className="auth-card">
                {error && <div className="auth-error" role="alert">{error}</div>}

                {authTab === 'login' && (
                  <form className="auth-form active" onSubmit={handleLogin} noValidate>
                    <div className="form-header">
                      <h2 className="text-serif" style={{ fontSize: '28px', marginBottom: '8px' }}>Welcome back</h2>
                      <p style={{ fontSize: '13px' }}>Continue your learning journey and access your courses.</p>
                    </div>
                    <div className="input-group">
                      <label htmlFor="login-email" className="auth-label">Email Address <span className="required-star">*</span></label>
                      <input
                        id="login-email"
                        type="email"
                        placeholder="Enter your email address"
                        value={loginData.email}
                        onChange={(e) => handleLoginChange('email', e.target.value)}
                        style={{ padding: '14px 16px', borderRadius: '14px', borderColor: fieldErrors.email ? 'var(--danger)' : '' }}
                        aria-label="Email address"
                        aria-invalid={!!fieldErrors.email}
                      />
                      {fieldErrors.email && <div className="field-error" style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px', textAlign: 'left' }}>{fieldErrors.email}</div>}
                    </div>
                    <div className="input-group" style={{ position: 'relative' }}>
                      <label htmlFor="login-password" className="auth-label">Password <span className="required-star">*</span></label>
                      <div style={{ position: 'relative' }}>
                        <input
                          id="login-password"
                          type={showLoginPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          value={loginData.password}
                          onChange={(e) => handleLoginChange('password', e.target.value)}
                          style={{ padding: '14px 44px 14px 16px', borderRadius: '14px', width: '100%', borderColor: fieldErrors.password ? 'var(--danger)' : '' }}
                          aria-label="Password"
                          aria-invalid={!!fieldErrors.password}
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '4px',
                            zIndex: 2
                          }}
                          aria-label={showLoginPassword ? "Hide password" : "Show password"}
                        >
                          {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {fieldErrors.password && <div className="field-error" style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px', textAlign: 'left' }}>{fieldErrors.password}</div>}
                    </div>
                    
                    <div className="forgot-password-container" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-4px', marginBottom: '14px' }}>
                      <button 
                        type="button" 
                        className="forgot-password-btn" 
                        onClick={handleForgotPassword} 
                        style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '13px', cursor: 'pointer', padding: 0, fontWeight: '600' }}
                      >
                        Forgot Password?
                      </button>
                    </div>

                    <button type="submit" className="btn-primary auth-submit" disabled={loading} style={{ padding: '14px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <span>{loading ? 'Signing In...' : 'Sign In'}</span>
                      {loading && <div className="spinner"></div>}
                    </button>

                    <div className="social-divider"><span>or continue with</span></div>

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
                  <form className="auth-form active" onSubmit={handleSignup} noValidate>
                    <div className="form-header">
                      <h2 className="text-serif" style={{ fontSize: '28px', marginBottom: '8px' }}>Start learning</h2>
                      <p style={{ fontSize: '13px' }}>Create an account and start learning today.</p>
                    </div>
                    <div className="input-row" style={{ gap: '10px', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                      <div className="input-group">
                        <label htmlFor="signup-first-name" className="auth-label">First Name <span className="required-star">*</span></label>
                        <input
                          id="signup-first-name"
                          type="text"
                          placeholder="First Name"
                          value={signupData.firstName}
                          onChange={(e) => handleSignupChange('firstName', e.target.value)}
                          style={{ padding: '14px 16px', borderRadius: '14px', borderColor: fieldErrors.firstName ? 'var(--danger)' : '' }}
                          aria-label="First name"
                          aria-invalid={!!fieldErrors.firstName}
                        />
                        {fieldErrors.firstName && <div className="field-error" style={{ color: 'var(--danger)', fontSize: '11px', marginTop: '4px', textAlign: 'left' }}>{fieldErrors.firstName}</div>}
                      </div>
                      <div className="input-group">
                        <label htmlFor="signup-last-name" className="auth-label">Last Name <span className="required-star">*</span></label>
                        <input
                          id="signup-last-name"
                          type="text"
                          placeholder="Last Name"
                          value={signupData.lastName}
                          onChange={(e) => handleSignupChange('lastName', e.target.value)}
                          style={{ padding: '14px 16px', borderRadius: '14px', borderColor: fieldErrors.lastName ? 'var(--danger)' : '' }}
                          aria-label="Last name"
                          aria-invalid={!!fieldErrors.lastName}
                        />
                        {fieldErrors.lastName && <div className="field-error" style={{ color: 'var(--danger)', fontSize: '11px', marginTop: '4px', textAlign: 'left' }}>{fieldErrors.lastName}</div>}
                      </div>
                    </div>
                    <div className="input-group">
                      <label htmlFor="signup-email" className="auth-label">Email <span className="required-star">*</span></label>
                      <input
                        id="signup-email"
                        type="email"
                        placeholder="Enter your email"
                        value={signupData.email}
                        onChange={(e) => handleSignupChange('email', e.target.value)}
                        style={{ padding: '14px 16px', borderRadius: '14px', borderColor: fieldErrors.email ? 'var(--danger)' : '' }}
                        aria-label="Email address"
                        aria-invalid={!!fieldErrors.email}
                      />
                      {fieldErrors.email && <div className="field-error" style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px', textAlign: 'left' }}>{fieldErrors.email}</div>}
                    </div>
                    <div className="input-group" style={{ position: 'relative' }}>
                      <label htmlFor="signup-password" className="auth-label">Create Password <span className="required-star">*</span></label>
                      <div style={{ position: 'relative' }}>
                        <input
                          id="signup-password"
                          type={showSignupPassword ? 'text' : 'password'}
                          placeholder="Create Password"
                          value={signupData.password}
                          onChange={(e) => handleSignupChange('password', e.target.value)}
                          style={{ padding: '14px 44px 14px 16px', borderRadius: '14px', width: '100%', borderColor: fieldErrors.password ? 'var(--danger)' : '' }}
                          aria-label="Create password"
                          aria-invalid={!!fieldErrors.password}
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignupPassword(!showSignupPassword)}
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '4px',
                            zIndex: 2
                          }}
                          aria-label={showSignupPassword ? "Hide password" : "Show password"}
                        >
                          {showSignupPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {fieldErrors.password && <div className="field-error" style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px', textAlign: 'left' }}>{fieldErrors.password}</div>}
                    </div>
                    <button type="submit" className="btn-primary auth-submit" disabled={loading} style={{ padding: '14px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
                      {loading && <div className="spinner"></div>}
                    </button>

                    <div className="social-divider"><span>or join with</span></div>

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
