import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Edit3, Trash2, BookOpen, Layers, Video, Search } from 'lucide-react';
import Reveal from '../../components/Reveal';
import { formatCategoryLabel, formatInrCurrency, getCategoryOptions } from '../../utils/category';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const emptyCourseForm = {
  title: '',
  description: '',
  price: '',
  category: 'development',
  difficulty: 'beginner',
  thumbnail: '',
};

const emptyLessonForm = {
  title: '',
  video_url: '',
  lesson_order: 1,
  transcript: '',
};

const CourseManager = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [courseQuery, setCourseQuery] = useState('');

  const [showCourseForm, setShowCourseForm] = useState(false);
  const [isEditingCourse, setIsEditingCourse] = useState(false);
  const [courseFormData, setCourseFormData] = useState(emptyCourseForm);

  const [showLessonForm, setShowLessonForm] = useState(false);
  const [isEditingLesson, setIsEditingLesson] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState(null);
  const [lessonFormData, setLessonFormData] = useState(emptyLessonForm);

  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await fetch(`${API_URL}/api/courses`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const responseData = await response.json();
      if (response.ok) {
        setCourses(responseData);
      } else {
        setError(responseData.message || 'Failed to load courses');
      }
    } catch (fetchError) {
      console.error(fetchError);
      setError('Connection to server failed');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseDetails = async (courseId) => {
    try {
      const response = await fetch(`${API_URL}/api/courses/${courseId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const responseData = await response.json();
      if (response.ok) {
        setSelectedCourse(responseData);
      } else {
        alert(responseData.message || 'Failed to fetch course details');
      }
    } catch (fetchError) {
      console.error(fetchError);
    }
  };

  const filteredCourses = useMemo(() => {
    const query = courseQuery.trim().toLowerCase();
    if (!query) return courses;

    return courses.filter((course) => {
      const title = (course.title || '').toLowerCase();
      const description = (course.description || '').toLowerCase();
      const category = formatCategoryLabel(course.category).toLowerCase();
      const difficulty = (course.difficulty || '').toLowerCase();
      return (
        title.includes(query) ||
        description.includes(query) ||
        category.includes(query) ||
        difficulty.includes(query)
      );
    });
  }, [courseQuery, courses]);

  const formatRowPrice = (price) => formatInrCurrency(price);

  const resetCourseForm = () => {
    setIsEditingCourse(false);
    setCourseFormData(emptyCourseForm);
  };

  const resetLessonForm = () => {
    setIsEditingLesson(false);
    setEditingLessonId(null);
    setLessonFormData(emptyLessonForm);
  };

  const handleSelectCourse = (course) => {
    fetchCourseDetails(course.id);
  };

  const handleCourseSubmit = async (event) => {
    event.preventDefault();
    const method = isEditingCourse ? 'PUT' : 'POST';
    const endpoint = isEditingCourse
      ? `${API_URL}/api/admin/courses/${courseFormData.id}`
      : `${API_URL}/api/admin/courses`;

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(courseFormData),
      });

      const responseData = await response.json();
      if (response.ok) {
        setShowCourseForm(false);
        resetCourseForm();
        fetchCourses();
        if (isEditingCourse && selectedCourse?.id === courseFormData.id) {
          fetchCourseDetails(courseFormData.id);
        }
        alert(isEditingCourse ? 'Course updated successfully' : 'Course created successfully');
      } else {
        alert(responseData.message || 'Failed to save course');
      }
    } catch (saveError) {
      console.error(saveError);
      alert('Error saving course');
    }
  };

  const requestCourseDelete = (courseId, courseTitle, event) => {
    event.stopPropagation();
    setPendingDelete({ type: 'course', id: courseId, title: courseTitle });
  };

  const requestLessonDelete = (lessonId, lessonTitle) => {
    setPendingDelete({ type: 'lesson', id: lessonId, title: lessonTitle });
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;

    const isCourseDelete = pendingDelete.type === 'course';
    const endpoint = isCourseDelete
      ? `${API_URL}/api/admin/courses/${pendingDelete.id}`
      : `${API_URL}/api/admin/lessons/${pendingDelete.id}`;

    try {
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const responseData = await response.json();
      if (response.ok) {
        alert(isCourseDelete ? 'Course deleted successfully' : 'Lesson deleted successfully');
        setPendingDelete(null);
        fetchCourses();
        if (isCourseDelete) {
          if (selectedCourse?.id === pendingDelete.id) {
            setSelectedCourse(null);
          }
        } else if (selectedCourse?.id) {
          fetchCourseDetails(selectedCourse.id);
        }
      } else {
        alert(responseData.message || `Failed to delete ${pendingDelete.type}`);
      }
    } catch (deleteError) {
      console.error(deleteError);
      alert(`Error deleting ${pendingDelete.type}`);
    }
  };

  const handleEditCoursePress = (course, event) => {
    event.stopPropagation();
    setIsEditingCourse(true);
    setCourseFormData({
      id: course.id,
      title: course.title,
      description: course.description || '',
      price: course.price,
      category: course.category || 'development',
      difficulty: course.difficulty || 'beginner',
      thumbnail: course.thumbnail || '',
    });
    setShowCourseForm(true);
  };

  const handleLessonSubmit = async (event) => {
    event.preventDefault();
    const method = isEditingLesson ? 'PUT' : 'POST';
    const endpoint = isEditingLesson
      ? `${API_URL}/api/admin/lessons/${editingLessonId}`
      : `${API_URL}/api/admin/courses/${selectedCourse.id}/lessons`;

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(lessonFormData),
      });

      const responseData = await response.json();
      if (response.ok) {
        setShowLessonForm(false);
        resetLessonForm();
        fetchCourseDetails(selectedCourse.id);
        alert(isEditingLesson ? 'Lesson updated successfully' : 'Lesson added successfully');
      } else {
        alert(responseData.message || 'Failed to save lesson');
      }
    } catch (saveError) {
      console.error(saveError);
      alert('Error saving lesson');
    }
  };

  const handleEditLessonPress = (lesson) => {
    setIsEditingLesson(true);
    setEditingLessonId(lesson.id);
    setLessonFormData({
      title: lesson.title,
      video_url: lesson.video_url,
      lesson_order: lesson.lesson_order,
      transcript: lesson.transcript || '',
    });
    setShowLessonForm(true);
  };

  if (loading) return <div>Loading courses...</div>;
  if (error) return <div style={{ color: 'var(--danger)', padding: '20px' }}>{error}</div>;

  const categoryOptions = getCategoryOptions();
  const lessonItems = selectedCourse?.lessons || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header className="admin-header">
        <Reveal>
          <div>
            <h1>Course Manager</h1>
            <p className="text-secondary">Create or edit educational courses, structure learning syllabus modules, and view lesson transcripts.</p>
          </div>
        </Reveal>
        <button
          onClick={() => {
            resetCourseForm();
            setShowCourseForm(true);
          }}
          className="btn-primary"
          style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
        >
          <Plus size={16} /> Create Course
        </button>
      </header>

      <div className="manager-split">
        <Reveal delay="0.1s">
          <div className="admin-section">
            <div className="section-toolbar">
              <div>
                <h2 className="text-serif" style={{ fontSize: '24px', marginBottom: '8px' }}>Available Courses</h2>
                <p className="text-secondary" style={{ margin: 0 }}>Search, edit, or remove courses from the library.</p>
              </div>
              <div className="section-search">
                <Search size={14} />
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={courseQuery}
                  onChange={(event) => setCourseQuery(event.target.value)}
                  className="admin-input"
                />
              </div>
            </div>

            <div className="admin-table-container">
              <table className="admin-table admin-table-course-manager">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCourses.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', opacity: 0.5 }}>No matching courses found.</td>
                    </tr>
                  ) : (
                    filteredCourses.map((course) => (
                      <tr
                        key={course.id}
                        onClick={() => handleSelectCourse(course)}
                        style={{
                          cursor: 'pointer',
                          background: selectedCourse?.id === course.id ? 'rgba(0,174,177,0.06)' : 'transparent',
                          fontWeight: selectedCourse?.id === course.id ? 'bold' : 'normal',
                        }}
                      >
                        <td className="course-title-cell">
                          <strong>{course.title}</strong>
                        </td>
                        <td>{formatCategoryLabel(course.category)}</td>
                        <td>{formatRowPrice(course.price)}</td>
                        <td style={{ textAlign: 'right' }} onClick={(event) => event.stopPropagation()}>
                          <button onClick={(event) => handleEditCoursePress(course, event)} className="btn-sm btn-edit" aria-label={`Edit ${course.title}`}>
                            <Edit3 size={12} />
                          </button>
                          <button
                            onClick={(event) => requestCourseDelete(course.id, course.title, event)}
                            className="btn-sm btn-delete"
                            aria-label={`Delete ${course.title}`}
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>

        <Reveal delay="0.2s">
          <div className="admin-section">
            {selectedCourse ? (
              <div>
                <div className="course-detail-header">
                  <div>
                    <span className="course-detail-kicker">
                      {formatCategoryLabel(selectedCourse.category)} - {String(selectedCourse.difficulty || '').replace(/^\w/, (letter) => letter.toUpperCase())}
                    </span>
                    <h2 className="text-serif course-detail-title">{selectedCourse.title}</h2>
                    <p className="course-detail-description">{selectedCourse.description}</p>
                  </div>
                </div>

                <div className="course-syllabus-toolbar">
                  <h3 className="course-syllabus-title">
                    <Layers size={18} /> Syllabus ({lessonItems.length} Lessons)
                  </h3>
                  <button
                    onClick={() => {
                      setIsEditingLesson(false);
                      setEditingLessonId(null);
                      setLessonFormData({
                        title: '',
                        video_url: '',
                        lesson_order: lessonItems.length + 1,
                        transcript: '',
                      });
                      setShowLessonForm(true);
                    }}
                    className="btn-sm btn-edit"
                  >
                    <Plus size={12} /> Add Lesson
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {lessonItems.length === 0 ? (
                    <p style={{ opacity: 0.5, textAlign: 'center', padding: '20px' }}>This course has no lessons yet. Click "Add Lesson" to get started.</p>
                  ) : (
                    lessonItems.map((lesson) => (
                      <div key={lesson.id} className="lesson-card">
                        <div className="lesson-card-copy">
                          <span className="lesson-order-badge">{lesson.lesson_order}</span>
                          <div>
                            <strong className="lesson-title">{lesson.title}</strong>
                            <div className="lesson-meta-row">
                              <Video size={12} />
                              <span>Video Lesson</span>
                            </div>
                            <small className="lesson-transcript-preview">
                              {lesson.transcript ? 'Transcript / study guide attached' : 'No transcript attached'}
                            </small>
                          </div>
                        </div>
                        <div className="lesson-card-actions">
                          {lesson.video_url ? (
                            <a
                              href={lesson.video_url}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-sm btn-outline lesson-open-link"
                            >
                              Open Resource
                            </a>
                          ) : (
                            <span className="btn-sm btn-outline lesson-open-link" style={{ opacity: 0.6, cursor: 'not-allowed' }}>
                              No Resource
                            </span>
                          )}
                          <button onClick={() => handleEditLessonPress(lesson)} className="btn-sm btn-edit">
                            Edit
                          </button>
                          <button onClick={() => requestLessonDelete(lesson.id, lesson.title)} className="btn-sm btn-delete">
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 20px', opacity: 0.5 }}>
                <BookOpen size={48} style={{ margin: '0 auto 16px', display: 'block' }} />
                <p>Select a course from the library list to edit its syllabus structure and view lesson settings.</p>
              </div>
            )}
          </div>
        </Reveal>
      </div>

      {showCourseForm && (
        <div className="modal-overlay">
          <div className="modal-content admin-modal-content course-modal" style={{ textAlign: 'left' }}>
            <h2 className="text-serif" style={{ fontSize: '28px', marginBottom: '20px' }}>
              {isEditingCourse ? 'Edit Course Settings' : 'Create New Course'}
            </h2>
            <form onSubmit={handleCourseSubmit}>
              <div className="admin-form-group">
                <label>Course Title</label>
                <input
                  type="text"
                  required
                  value={courseFormData.title}
                  onChange={(event) => setCourseFormData({ ...courseFormData, title: event.target.value })}
                  className="admin-input"
                />
              </div>

              <div className="admin-form-group">
                <label>Description</label>
                <textarea
                  required
                  value={courseFormData.description}
                  onChange={(event) => setCourseFormData({ ...courseFormData, description: event.target.value })}
                  className="admin-textarea"
                />
              </div>

              <div className="admin-grid-2">
                <div className="admin-form-group">
                  <label>Price (INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={courseFormData.price}
                    onChange={(event) => setCourseFormData({ ...courseFormData, price: event.target.value })}
                    className="admin-input"
                  />
                </div>
                <div className="admin-form-group">
                  <label>Difficulty</label>
                  <select
                    value={courseFormData.difficulty}
                    onChange={(event) => setCourseFormData({ ...courseFormData, difficulty: event.target.value })}
                    className="admin-select"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div className="admin-grid-2">
                <div className="admin-form-group">
                  <label>Category</label>
                  <select
                    value={courseFormData.category}
                    onChange={(event) => setCourseFormData({ ...courseFormData, category: event.target.value })}
                    className="admin-select"
                  >
                    {categoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>Thumbnail URL</label>
                  <input
                    type="text"
                    value={courseFormData.thumbnail}
                    onChange={(event) => setCourseFormData({ ...courseFormData, thumbnail: event.target.value })}
                    className="admin-input"
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowCourseForm(false)} className="btn-outline">Cancel</button>
                <button type="submit" className="btn-primary">Save Course</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLessonForm && (
        <div className="modal-overlay">
          <div className="modal-content admin-modal-content lesson-modal" style={{ textAlign: 'left' }}>
            <h2 className="text-serif" style={{ fontSize: '28px', marginBottom: '20px' }}>
              {isEditingLesson ? 'Edit Lesson Parameters' : 'Add New Lesson to Syllabus'}
            </h2>
            <form onSubmit={handleLessonSubmit}>
              <div className="admin-form-group">
                <label>Lesson Title</label>
                <input
                  type="text"
                  required
                  value={lessonFormData.title}
                  onChange={(event) => setLessonFormData({ ...lessonFormData, title: event.target.value })}
                  className="admin-input"
                />
              </div>

              <div className="admin-grid-lesson">
                <div className="admin-form-group">
                  <label>Video URL (YouTube)</label>
                  <input
                    type="url"
                    required
                    value={lessonFormData.video_url}
                    onChange={(event) => setLessonFormData({ ...lessonFormData, video_url: event.target.value })}
                    className="admin-input"
                  />
                </div>
                <div className="admin-form-group">
                  <label>Order No.</label>
                  <input
                    type="number"
                    required
                    value={lessonFormData.lesson_order}
                    onChange={(event) => setLessonFormData({ ...lessonFormData, lesson_order: event.target.value })}
                    className="admin-input"
                  />
                </div>
              </div>

              <div className="admin-form-group">
                <label>Lesson Transcript / Content Study Guide</label>
                <textarea
                  value={lessonFormData.transcript}
                  onChange={(event) => setLessonFormData({ ...lessonFormData, transcript: event.target.value })}
                  className="admin-textarea"
                  placeholder="Insert transcript paragraphs here to guide the automated AI quiz generator engine..."
                  style={{ minHeight: '140px' }}
                />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowLessonForm(false)} className="btn-outline">Cancel</button>
                <button type="submit" className="btn-primary">Save Lesson</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pendingDelete && (
        <div className="modal-overlay">
          <div className="modal-content confirm-modal">
            <h2 className="text-serif" style={{ fontSize: '28px', marginBottom: '12px' }}>Are you sure?</h2>
            <p className="text-secondary" style={{ marginTop: 0 }}>
              This will permanently delete <strong>{pendingDelete.title}</strong>.
            </p>
            <p className="text-secondary" style={{ marginBottom: '0' }}>
              Please confirm before removing this {pendingDelete.type}.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn-outline" onClick={() => setPendingDelete(null)}>Cancel</button>
              <button type="button" className="btn-primary" onClick={confirmDelete}>Delete Permanently</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseManager;
