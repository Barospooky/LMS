import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music } from 'lucide-react';
import '../styles/main.css';
import '../styles/dashboard.css';
import Reveal from '../components/Reveal';
import useMagnetic from '../hooks/useMagnetic';
import { buildCourseArtwork } from '../utils/courseArt';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getCourseProgress = (courseId) => {
  const raw = localStorage.getItem(`course_progress_${courseId}`);
  return raw ? JSON.parse(raw) : { completedLessons: [], currentLessonId: null, certificateEarned: false };
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const btnResume = useMagnetic();

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
      if (queryParams.length > 0) {
        url += `?${queryParams.join('&')}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setCourses(data);
      }
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

  const purchasedCourses = courses.filter((course) => course.isPurchased);
  const certificateCount = purchasedCourses.filter((course) => getCourseProgress(course.id).certificateEarned).length;
  const activeCourse = purchasedCourses[0];
  const activeProgress = activeCourse ? getCourseProgress(activeCourse.id) : null;
  const completedLessonsCount = activeProgress?.completedLessons?.length || 0;
  const activeLessonsCount = activeCourse?.lessonsCount || 0;
  const progressPercentage = activeLessonsCount ? Math.round((completedLessonsCount / activeLessonsCount) * 100) : 0;
  const resumeLessonId = activeProgress?.currentLessonId || activeCourse?.firstLessonId;

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
          <a href="#" className="nav-item active" onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}>
            <span>01 / My Journey</span>
          </a>
          <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}>
            <span>02 / All Courses</span>
          </a>
          {user && user.role === 'admin' && (
            <a href="#" className="nav-item admin-link" onClick={(e) => { e.preventDefault(); navigate('/admin/overview'); }}>
              <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>⭐ Admin Panel</span>
            </a>
          )}
          <button
            className="nav-item logout-btn"
            onClick={handleLogout}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', textAlign: 'left', width: '100%', marginTop: 'auto' }}
          >
            <span>03 / Logout</span>
          </button>
        </nav>
        <div className="sidebar-user">
          <div className="user-avatar">{user ? user.firstName.charAt(0) : 'U'}</div>
          <div className="user-info">
            <strong>{user ? `${user.firstName} ${user.lastName}` : 'User'}</strong>
            <small>{user?.role === 'admin' ? 'Administrator' : 'Premium Student'}</small>
          </div>
        </div>
      </aside>

      <main className="dash-main">
        <header className="dash-header">
          <Reveal>
            <div className="header-greet">
              <h1 className="text-serif tracking-tighter">Welcome back, {user ? user.firstName : 'Learner'}.</h1>
              <p className="text-secondary">
                Your learning loop is now clear: discover a course, purchase it, watch the lessons, answer the module questions, and earn a certificate when the study program is complete.
              </p>
            </div>
          </Reveal>
          <Reveal delay="0.1s">
            <div className="header-aside">
              <div className="summary-tile">
                <span>Courses owned</span>
                <strong>{purchasedCourses.length}</strong>
              </div>
              <div className="summary-tile">
                <span>Certificates</span>
                <strong>{certificateCount}</strong>
              </div>
              <div className="summary-tile">
                <span>Total programs</span>
                <strong>{courses.length}</strong>
              </div>
            </div>
          </Reveal>
        </header>

        {activeCourse && resumeLessonId && (
          <Reveal delay="0.2s">
            <section className="progress-section">
              <div className="section-label">Continue Learning</div>
              <div className="progress-hero">
                <div className="progress-content">
                  <h2 className="text-serif">{activeCourse.title}</h2>
                  <p>Return to the next unlocked lesson, finish the quiz checkpoint, and move toward the final course certificate.</p>
                  <div className="progress-actions">
                    <button
                      ref={btnResume}
                      className="btn-primary magnetic"
                      onClick={() => navigate(`/course/${activeCourse.id}/${resumeLessonId}`)}
                    >
                      Resume Learning
                    </button>
                    <button className="btn-outline" onClick={() => navigate(`/${activeCourse.category}/${activeCourse.id}`)}>
                      View Curriculum
                    </button>
                  </div>
                </div>
                <div className="progress-visual">
                  <div className="circle-progress" style={{ '--progress': progressPercentage }}>
                    <span className="pct">{progressPercentage}%</span>
                  </div>
                  <div className="progress-meta">
                    <span>{completedLessonsCount} lessons completed</span>
                    <span>{activeLessonsCount} total modules in this path</span>
                    <span>{activeProgress?.certificateEarned ? 'Certificate earned' : 'Certificate still locked'}</span>
                  </div>
                </div>
              </div>
            </section>
          </Reveal>
        )}

        <section className="courses-section">
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
              <input 
                type="text" 
                placeholder="Search courses..." 
                value={search} 
                onChange={(e) => { setSearch(e.target.value); fetchCourses(e.target.value, selectedCategory, selectedDifficulty); }}
                className="search-input"
              />
              <select 
                value={selectedCategory} 
                onChange={(e) => { setSelectedCategory(e.target.value); fetchCourses(search, e.target.value, selectedDifficulty); }}
                className="filter-select"
              >
                <option value="">All Categories</option>
                <option value="development">Development</option>
                <option value="management">Management</option>
                <option value="datascience">Data Science</option>
                <option value="marketing">Marketing</option>
              </select>
              <select 
                value={selectedDifficulty} 
                onChange={(e) => { setSelectedDifficulty(e.target.value); fetchCourses(search, selectedCategory, e.target.value); }}
                className="filter-select"
              >
                <option value="">All Difficulties</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </Reveal>

          {loading ? (
            <p>Loading courses...</p>
          ) : (
            <div className="courses-grid">
              {courses.map((course, index) => {
                const progress = getCourseProgress(course.id);
                const totalLessons = course.lessonsCount || 0;
                const completion = totalLessons ? Math.round((progress.completedLessons.length / totalLessons) * 100) : 0;

                return (
                  <Reveal key={course.id} delay={`${0.35 + index * 0.08}s`}>
                    <div className="course-card" onClick={() => navigate(`/${course.category}/${course.id}`)}>
                      <div className="card-thumb">
                        <img src={course.thumbnail || buildCourseArtwork(course)} alt={course.title} />
                      </div>
                      <div className="card-body">
                        <div className="card-topline" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <span className="card-tag">{course.category}</span>
                          <span className="difficulty-tag">{course.difficulty}</span>
                          <span className="card-status" style={{ marginLeft: 'auto' }}>
                            {course.isPurchased ? (progress.certificateEarned ? 'Certified' : `${completion}% Complete`) : 'Available'}
                          </span>
                        </div>
                        <h3 className="text-display font-semibold">{course.title}</h3>
                        <p>{course.description}</p>
                        <div className="card-footer">
                          <span className="price">{course.isPurchased ? 'Owned' : `₹${course.price}`}</span>
                          <span className="buy-now">{course.isPurchased ? 'Open Course' : 'View Details'}</span>
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
