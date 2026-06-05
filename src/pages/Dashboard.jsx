import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Award, Layers, X, SearchX } from 'lucide-react';
import '../styles/main.css';
import '../styles/dashboard.css';
import Reveal from '../components/Reveal';
import useMagnetic from '../hooks/useMagnetic';
import { buildCourseArtwork } from '../utils/courseArt';
import { formatCategoryLabel, getCategoryOptions } from '../utils/category';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getCourseProgress = (courseId) => {
  const raw = localStorage.getItem(`course_progress_${courseId}`);
  return raw ? JSON.parse(raw) : { completedLessons: [], currentLessonId: null, certificateEarned: false };
};

const formatPrice = (price) =>
  `₹${Math.round(parseFloat(price)).toLocaleString('en-IN')}`;

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [activeNav, setActiveNav] = useState('journey');
  const btnResume = useMagnetic();

  const libraryRef = useRef(null);
  const topRef = useRef(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    fetchCourses();
  }, []);

  const fetchCourses = async (searchTerm = '', cat = '', diff = '') => {
    try {
      let url = `${API_URL}/api/courses`;
      const queryParams = [];
      if (searchTerm) queryParams.push(`search=${encodeURIComponent(searchTerm)}`);
      if (cat) queryParams.push(`category=${encodeURIComponent(cat)}`);
      if (diff) queryParams.push(`difficulty=${encodeURIComponent(diff)}`);
      if (queryParams.length > 0) url += `?${queryParams.join('&')}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json();
      if (response.ok) setCourses(data);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleNavJourney = (e) => {
    e.preventDefault();
    setActiveNav('journey');
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleNavCourses = (e) => {
    e.preventDefault();
    setActiveNav('courses');
    libraryRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const clearSearch = () => {
    setSearch('');
    setSelectedCategory('');
    setSelectedDifficulty('');
    fetchCourses('', '', '');
  };

  const hasActiveFilters = search || selectedCategory || selectedDifficulty;

  const purchasedCourses = courses.filter((c) => c.isPurchased);
  const certificateCount = purchasedCourses.filter((c) => getCourseProgress(c.id).certificateEarned).length;
  const activeCourse = purchasedCourses[0];
  const activeProgress = activeCourse ? getCourseProgress(activeCourse.id) : null;
  const completedLessonsCount = activeProgress?.completedLessons?.length || 0;
  const activeLessonsCount = activeCourse?.lessonsCount || 0;
  const progressPercentage = activeLessonsCount
    ? Math.round((completedLessonsCount / activeLessonsCount) * 100)
    : 0;
  const resumeLessonId = activeProgress?.currentLessonId || activeCourse?.firstLessonId;

  // Dynamic nav numbering based on admin status
  const isAdmin = user?.role === 'admin';
  const logoutNum = isAdmin ? '04' : '03';

  return (
    <div className="dashboard-page">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img
            src="https://amplepro.in/wp-content/uploads/2024/06/new-logo-ap.webp"
            alt="Amplepro Logo"
            className="brand-logo-img-small"
          />
        </div>
        <div className="sidebar-spotlight">
          <span className="sidebar-kicker">Member area</span>
          <strong>{user ? `${user.firstName}'s studio` : 'My study'}</strong>
          <p>Track progress, resume active modules, and unlock certificates.</p>
        </div>
        <nav className="sidebar-nav">
          <a
            href="#"
            className={`nav-item ${activeNav === 'journey' ? 'active' : ''}`}
            onClick={handleNavJourney}
          >
            <span>01 / My Journey</span>
          </a>
          <a
            href="#"
            className={`nav-item ${activeNav === 'courses' ? 'active' : ''}`}
            onClick={handleNavCourses}
          >
            <span>02 / All Courses</span>
          </a>
          {isAdmin && (
            <a
              href="#"
              className="nav-item"
              onClick={(e) => { e.preventDefault(); navigate('/admin/overview'); }}
            >
              <span className="admin-nav-label">03 / Admin Panel</span>
            </a>
          )}
          <button
            className="nav-item logout-btn"
            onClick={handleLogout}
          >
            <span>{logoutNum} / Logout</span>
          </button>
        </nav>
        <div className="sidebar-user">
          <div className="user-avatar">{user ? user.firstName.charAt(0) : 'U'}</div>
          <div className="user-info">
            <strong>{user ? `${user.firstName} ${user.lastName}` : 'User'}</strong>
            <small>{isAdmin ? 'Administrator' : 'Premium Student'}</small>
          </div>
        </div>
      </aside>

      <main className="dash-main" ref={topRef}>
        {/* ═══════ Dashboard Header ═══════ */}
        <header className="dash-header">
          <Reveal>
            <div className="header-greet">
              <h1 className="text-serif tracking-tighter">
                Welcome back, {user ? user.firstName : 'Learner'}.
              </h1>
              <p className="text-secondary">
                Continue your courses and track your progress.
              </p>
            </div>
          </Reveal>
          <Reveal delay="0.1s">
            <div className="header-aside">
              <div className="summary-tile">
                <div className="summary-tile-icon">
                  <BookOpen size={16} />
                </div>
                <div className="summary-tile-text">
                  <span>Courses Owned</span>
                  <strong>{purchasedCourses.length}</strong>
                </div>
              </div>
              <div className="summary-tile">
                <div className="summary-tile-icon">
                  <Award size={16} />
                </div>
                <div className="summary-tile-text">
                  <span>Certificates</span>
                  <strong>{certificateCount}</strong>
                </div>
              </div>
              <div className="summary-tile">
                <div className="summary-tile-icon">
                  <Layers size={16} />
                </div>
                <div className="summary-tile-text">
                  <span>Total Programs</span>
                  <strong>{courses.length}</strong>
                </div>
              </div>
            </div>
          </Reveal>
        </header>

        {/* ═══════ Continue Learning ═══════ */}
        {activeCourse && resumeLessonId && (
          <Reveal delay="0.2s">
            <section className="progress-section">
              <div className="section-label">Continue Learning</div>
              <div className="progress-hero">
                <div className="progress-content">
                  <h2 className="text-serif">{activeCourse.title}</h2>
                  <p>Return to the next unlocked lesson, finish the quiz checkpoint, and move toward the final course certificate.</p>
                  <div className="progress-lesson-info">
                    Lesson {completedLessonsCount + 1} of {activeLessonsCount || '—'}
                    {activeProgress?.certificateEarned && (
                      <span className="cert-earned-badge"> · Certificate Earned ✓</span>
                    )}
                  </div>
                  <div className="progress-actions">
                    <button
                      ref={btnResume}
                      className="btn-primary magnetic"
                      onClick={() => navigate(`/course/${activeCourse.id}/${resumeLessonId}`)}
                    >
                      Resume Learning
                    </button>
                    <button
                      className="btn-outline"
                      onClick={() => navigate(`/${activeCourse.category}/${activeCourse.id}`)}
                    >
                      View Curriculum
                    </button>
                  </div>
                </div>
                <div className="progress-visual">
                  <div className="circle-progress" style={{ '--progress': progressPercentage }}>
                    <div className="circle-progress-inner">
                      <span className="pct">{progressPercentage}%</span>
                      <span className="pct-label">Complete</span>
                    </div>
                  </div>
                  <div className="progress-meta">
                    <span>{completedLessonsCount} / {activeLessonsCount} Lessons Done</span>
                    <span>{activeProgress?.certificateEarned ? '🏆 Certificate Earned' : '🔒 Certificate Locked'}</span>
                  </div>
                </div>
              </div>
            </section>
          </Reveal>
        )}

        {/* ═══════ Course Library ═══════ */}
        <section className="courses-section" ref={libraryRef}>
          <Reveal delay="0.3s">
            <div className="section-header">
              <div>
                <div className="section-label">Course Library</div>
                <h2 className="text-serif">Choose your learning journey.</h2>
              </div>
              <p>Each card is designed like a premium program: visible pricing, ownership state, and fast access into the curriculum experience.</p>
            </div>
          </Reveal>

          <Reveal delay="0.32s">
            <div className="filter-controls">
              <div className="search-wrapper">
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    fetchCourses(e.target.value, selectedCategory, selectedDifficulty);
                  }}
                  className="search-input"
                  aria-label="Search courses"
                />
                {search && (
                  <button
                    className="search-clear-btn"
                    onClick={clearSearch}
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  fetchCourses(search, e.target.value, selectedDifficulty);
                }}
                className="filter-select"
                aria-label="Filter by category"
              >
                <option value="">All Categories</option>
                {getCategoryOptions().map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <select
                value={selectedDifficulty}
                onChange={(e) => {
                  setSelectedDifficulty(e.target.value);
                  fetchCourses(search, selectedCategory, e.target.value);
                }}
                className="filter-select"
                aria-label="Filter by difficulty"
              >
                <option value="">All Difficulties</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
              {hasActiveFilters && (
                <button className="clear-filters-btn" onClick={clearSearch} aria-label="Clear all filters">
                  <X size={14} /> Clear Filters
                </button>
              )}
            </div>
          </Reveal>

          {loading ? (
            <div className="courses-loading">
              <div className="loading-pulse"></div>
              <div className="loading-pulse"></div>
              <div className="loading-pulse"></div>
            </div>
          ) : courses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <SearchX size={40} />
              </div>
              <h3>No courses found</h3>
              <p>Try adjusting your search or filters to find what you're looking for.</p>
              <button className="btn-primary" onClick={clearSearch} style={{ marginTop: '16px' }}>
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="courses-grid">
              {courses.map((course, index) => {
                const progress = getCourseProgress(course.id);
                const totalLessons = course.lessonsCount || 0;
                const completion = totalLessons
                  ? Math.round((progress.completedLessons.length / totalLessons) * 100)
                  : 0;

                return (
                  <Reveal key={course.id} delay={`${0.35 + index * 0.08}s`}>
                    <div
                      className="course-card"
                      onClick={() => navigate(`/${course.category}/${course.id}`)}
                      role="button"
                      tabIndex={0}
                      aria-label={`${course.title} – ${course.isPurchased ? 'Continue Learning' : 'View Details'}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(`/${course.category}/${course.id}`);
                        }
                      }}
                    >
                      <div className="card-thumb">
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
                          <span className="difficulty-tag">{course.difficulty}</span>
                          <span className="card-status" style={{ marginLeft: 'auto' }}>
                            {course.isPurchased
                              ? (progress.certificateEarned ? 'Certified ✓' : `${completion}% Done`)
                              : 'Available'}
                          </span>
                        </div>
                        <h3 className="text-display font-semibold card-title">{course.title}</h3>
                        <p className="card-description">{course.description}</p>
                        <div className="card-footer">
                          <span className="price">
                            {course.isPurchased ? 'Owned' : formatPrice(course.price)}
                          </span>
                          <span className="buy-now">
                            {course.isPurchased ? 'Continue Learning →' : 'View Details →'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
