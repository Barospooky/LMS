import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Award,
  BarChart3,
  BookOpen,
  BookOpenCheck,
  Compass,
  FolderOpen,
  Globe2,
  LayoutDashboard,
  LineChart,
  LogOut,
  MessageCircle,
  SearchX,
  Settings,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import '../styles/main.css';
import '../styles/dashboard.css';
import Reveal from '../components/Reveal';
import StudentSidebar from '../components/StudentSidebar';
import useMagnetic from '../hooks/useMagnetic';
import { buildCourseArtwork } from '../utils/courseArt';
import { formatCategoryLabel, getCategoryOptions } from '../utils/category';
import API_URL, { apiFetch } from '../utils/apiClient';

const getCourseProgress = (courseId) => {
  const raw = localStorage.getItem(`course_progress_${courseId}`);
  return raw ? JSON.parse(raw) : { completedLessons: [], currentLessonId: null, certificateEarned: false };
};

const formatPrice = (price) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(price) || 0);

const weekLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const buildSeries = (base, factors, min = 12, max = 96) =>
  factors.map((factor) => clamp(Math.round(base * factor), min, max));

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [activeNav, setActiveNav] = useState('dashboard');
  const btnResume = useMagnetic();

  const topRef = useRef(null);
  const progressRef = useRef(null);
  const myCoursesRef = useRef(null);
  const libraryRef = useRef(null);
  const resourcesRef = useRef(null);

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

      const response = await apiFetch(url.replace(API_URL, ''));
      const data = await response.json();
      if (response.ok) setCourses(data);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    apiFetch('/api/auth/logout', { method: 'POST' }, { retryOn401: false }).catch(() => {});
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const scrollToSection = (ref, navKey) => {
    setActiveNav(navKey);
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  const totalCompletedLessons = purchasedCourses.reduce(
    (sum, course) => sum + (getCourseProgress(course.id)?.completedLessons?.length || 0),
    0
  );
  const activeCourse = purchasedCourses[0];
  const activeProgress = activeCourse ? getCourseProgress(activeCourse.id) : null;
  const completedLessonsCount = activeProgress?.completedLessons?.length || 0;
  const activeLessonsCount = activeCourse?.lessonsCount || 0;
  const progressPercentage = activeLessonsCount
    ? Math.round((completedLessonsCount / activeLessonsCount) * 100)
    : 0;
  const resumeLessonId = activeProgress?.currentLessonId || activeCourse?.firstLessonId;
  const overallProgress = purchasedCourses.length
    ? Math.round(
        purchasedCourses.reduce((sum, course) => {
          const progress = getCourseProgress(course.id);
          const totalLessons = course.lessonsCount || 0;
          const completion = totalLessons
            ? Math.round((progress.completedLessons.length / totalLessons) * 100)
            : 0;
          return sum + completion;
        }, 0) / purchasedCourses.length
      )
    : 0;
  const weeklyActivitySeries = buildSeries(
    18 + (totalCompletedLessons * 5) + (certificateCount * 8) + (purchasedCourses.length * 4),
    [0.42, 0.56, 0.5, 0.78, 0.64, 0.72, 0.96]
  );
  const weeklyProgressSeries = buildSeries(
    24 + progressPercentage + (purchasedCourses.length * 6),
    [0.36, 0.52, 0.68, 0.58, 0.46, 0.62, 0.74]
  );

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const targetSection = location.state?.scrollTo;
    if (!targetSection) return;

    const sectionRefs = {
      dashboard: topRef,
      'my-courses': myCoursesRef,
      catalog: libraryRef,
      progress: progressRef,
      resources: resourcesRef,
      community: resourcesRef,
      settings: resourcesRef,
    };

    const targetRef = sectionRefs[targetSection];
    if (!targetRef?.current) return;

    const animationFrame = window.requestAnimationFrame(() => {
      targetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveNav(targetSection);
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [location.state]);

  const dashboardNavItems = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard size={16} />,
      active: activeNav === 'dashboard',
      onClick: () => scrollToSection(topRef, 'dashboard'),
    },
    {
      key: 'my-courses',
      label: 'My Courses',
      icon: <BookOpenCheck size={16} />,
      active: activeNav === 'my-courses',
      onClick: () => scrollToSection(myCoursesRef, 'my-courses'),
    },
    {
      key: 'catalog',
      label: 'Catalog',
      icon: <Compass size={16} />,
      active: activeNav === 'catalog',
      onClick: () => scrollToSection(libraryRef, 'catalog'),
    },
    {
      key: 'progress',
      label: 'Progress',
      icon: <BarChart3 size={16} />,
      active: activeNav === 'progress',
      onClick: () => scrollToSection(progressRef, 'progress'),
    },
    {
      key: 'resources',
      label: 'Resources',
      icon: <FolderOpen size={16} />,
      active: activeNav === 'resources',
      onClick: () => scrollToSection(resourcesRef, 'resources'),
    },
    {
      key: 'community',
      label: 'Community',
      icon: <Users size={16} />,
      active: activeNav === 'community',
      onClick: () => scrollToSection(resourcesRef, 'community'),
    },
    {
      key: 'settings',
      label: 'Settings',
      icon: <Settings size={16} />,
      active: activeNav === 'settings',
      onClick: () => navigate('/settings'),
    },
    ...(isAdmin
      ? [
          {
            key: 'admin-panel',
            label: 'Admin Panel',
            icon: <Globe2 size={16} />,
            className: 'admin-nav-label',
            onClick: () => navigate('/admin/overview'),
          },
        ]
      : []),
    {
      key: 'logout',
      label: 'Logout',
      icon: <LogOut size={16} />,
      className: 'logout-btn',
      onClick: handleLogout,
    },
  ];

  return (
    <div className="dashboard-page">
      <StudentSidebar
        user={user}
        title={user ? `${user.firstName}'s studio` : 'My study'}
        navItems={dashboardNavItems}
      />

      <main className="dash-main">
        <header className="dash-header" ref={topRef}>
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
                  <Sparkles size={16} />
                </div>
                <div className="summary-tile-text">
                  <span>Total Programs</span>
                  <strong>{courses.length}</strong>
                </div>
              </div>
              <div className="summary-tile summary-tile-accent">
                <div className="summary-tile-icon">
                  <LineChart size={16} />
                </div>
                <div className="summary-tile-text">
                  <span>Overall Progress</span>
                  <strong>{overallProgress}%</strong>
                </div>
              </div>
            </div>
          </Reveal>
        </header>

        <section className="dashboard-insights" ref={progressRef}>
          <Reveal delay="0.15s">
            <div className="insight-card insight-card-chart">
              <div className="insight-card-header">
                <div>
                  <div className="section-label">Learning Activity</div>
                  <h3 className="text-serif">Weekly engagement at a glance</h3>
                </div>
                <span className="insight-chip">This week</span>
              </div>
              {purchasedCourses.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[160px] opacity-60">
                  <BarChart3 size={40} className="mb-2" />
                  <p className="text-sm font-semibold">No Activity Data</p>
                </div>
              ) : (
                <div className="bar-chart" aria-hidden="true">
                  {weeklyActivitySeries.map((value, index) => (
                    <div key={`activity-${weekLabels[index]}`} className="bar-column">
                      <div className="bar-track">
                        <div className="bar-fill" style={{ height: `${value}%` }} />
                      </div>
                      <span>{weekLabels[index]}</span>
                    </div>
                  ))}
                </div>
              )}
              <p className="insight-copy">
                A polished activity view helps clients see momentum, consistency, and day-by-day learning rhythm without needing to open every course.
              </p>
            </div>
          </Reveal>
          <Reveal delay="0.2s">
            <div className="insight-card insight-card-chart insight-card-dark">
              <div className="insight-card-header">
                <div>
                  <div className="section-label">Weekly Progress</div>
                  <h3 className="text-serif">Completion trend across the week</h3>
                </div>
                <span className="insight-chip insight-chip-dark">Momentum</span>
              </div>
              {purchasedCourses.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[160px] opacity-60">
                  <LineChart size={40} className="mb-2" />
                  <p className="text-sm font-semibold">No Progress Data</p>
                </div>
              ) : (
                <div className="bar-chart bar-chart-alt" aria-hidden="true">
                  {weeklyProgressSeries.map((value, index) => (
                    <div key={`progress-${weekLabels[index]}`} className="bar-column">
                      <div className="bar-track">
                        <div className="bar-fill bar-fill-alt" style={{ height: `${value}%` }} />
                      </div>
                      <span>{weekLabels[index]}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="insight-metrics">
                <div>
                  <strong>{purchasedCourses.length}</strong>
                  <span>Active enrollments</span>
                </div>
                <div>
                  <strong>{certificateCount}</strong>
                  <span>Certificates earned</span>
                </div>
                <div>
                  <strong>{totalCompletedLessons}</strong>
                  <span>Lessons completed</span>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {activeCourse && resumeLessonId && (
          <Reveal delay="0.25s">
            <section className="progress-section">
              <div className="section-label">Continue Learning</div>
              <div className="progress-hero">
                <div className="progress-content">
                  <h2 className="text-serif">{activeCourse.title}</h2>
                  <p>Return to the next unlocked lesson, finish the quiz checkpoint, and move toward the final course certificate.</p>
                  <div className="progress-lesson-info">
                    Lesson {completedLessonsCount + 1} of {activeLessonsCount || '-'}
                    {activeProgress?.certificateEarned && (
                      <span className="cert-earned-badge"> - Certificate Earned</span>
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
                    <span>{activeProgress?.certificateEarned ? 'Certificate Earned' : 'Certificate Locked'}</span>
                  </div>
                </div>
              </div>
            </section>
          </Reveal>
        )}

        <section className="my-courses-section" ref={myCoursesRef}>
          <Reveal delay="0.28s">
            <div className="section-header section-header-stack">
              <div>
                <div className="section-label">My Courses</div>
                <h2 className="text-serif">Courses you already own.</h2>
              </div>
              <p>Showing purchased programs first gives the student a strong sense of ownership and makes the dashboard feel active from the moment they log in.</p>
            </div>
          </Reveal>

          {purchasedCourses.length === 0 ? (
            <Reveal delay="0.3s">
              <div className="empty-state">
                <div className="empty-state-icon">
                  <BookOpen size={40} />
                </div>
                <h3>No purchased courses yet</h3>
                <p>Once a student enrolls, this area becomes the primary quick-access launchpad for their learning journey.</p>
              </div>
            </Reveal>
          ) : (
            <div className="course-rail">
              {purchasedCourses.slice(0, 4).map((course, index) => {
                const progress = getCourseProgress(course.id);
                const totalLessons = course.lessonsCount || 0;
                const completion = totalLessons
                  ? Math.round((progress.completedLessons.length / totalLessons) * 100)
                  : 0;

                return (
                  <Reveal key={`owned-${course.id}`} delay={`${0.32 + index * 0.06}s`}>
                    <div
                      className="owned-course-card"
                      onClick={() => navigate(`/${course.category}/${course.id}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(`/${course.category}/${course.id}`);
                        }
                      }}
                    >
                      <div className="owned-course-thumb">
                        <img
                          src={course.thumbnail || buildCourseArtwork(course)}
                          alt={course.title}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = buildCourseArtwork(course);
                          }}
                        />
                      </div>
                      <div className="owned-course-body">
                        <div className="owned-course-top">
                          <span className="card-tag">{formatCategoryLabel(course.category)}</span>
                          <span className="owned-course-progress">{completion}%</span>
                        </div>
                        <h3 className="text-display card-title">{course.title}</h3>
                        <p className="card-description">{course.description}</p>
                        <div className="owned-course-footer">
                          <span>{progress.certificateEarned ? 'Certificate complete' : 'In progress'}</span>
                          <span>{totalLessons} lessons</span>
                        </div>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          )}
        </section>

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
                    type="button"
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
                <button className="clear-filters-btn" onClick={clearSearch} aria-label="Clear all filters" type="button">
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
              <button className="btn-primary" onClick={clearSearch} style={{ marginTop: '16px' }} type="button">
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
                      aria-label={`${course.title} - ${course.isPurchased ? 'Continue Learning' : 'View Details'}`}
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
                              ? (progress.certificateEarned ? 'Certified' : `${completion}% Done`)
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
                            {course.isPurchased ? 'Continue Learning ->' : 'View Details ->'}
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

        <section className="resource-section" ref={resourcesRef}>
          <Reveal delay="0.4s">
            <div className="section-header section-header-stack">
              <div>
                <div className="section-label">Support Hub</div>
                <h2 className="text-serif">Resources, community, and support.</h2>
              </div>
              <p>These compact cards make the dashboard feel complete even when the underlying pages are still being built.</p>
            </div>
          </Reveal>
          <div className="support-grid">
            <Reveal delay="0.45s">
              <div className="support-card">
                <div className="support-card-icon"><FolderOpen size={18} /></div>
                <strong>Resources</strong>
                <p>Syllabi, downloads, and course support links in one polished place.</p>
              </div>
            </Reveal>
            <Reveal delay="0.5s">
              <div className="support-card">
                <div className="support-card-icon"><MessageCircle size={18} /></div>
                <strong>Community</strong>
                <p>Discussion, peer motivation, and collaborative learning cues for the client demo.</p>
              </div>
            </Reveal>
            <Reveal delay="0.55s">
              <div className="support-card">
                <div className="support-card-icon"><Sparkles size={18} /></div>
                <strong>Help Center</strong>
                <p>Quick guidance for common learner questions, access issues, and course navigation.</p>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
