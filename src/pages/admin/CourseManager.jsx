import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Edit3, Trash2, BookOpen, Layers, Video, Search, Upload, Link2, Image, Film } from 'lucide-react';
import Reveal from '../../components/Reveal';
import { formatCategoryLabel, formatInrCurrency, getCategoryOptions } from '../../utils/category';
import API_URL, { apiFetch } from '../../utils/apiClient';

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
  const [courseThumbnailMode, setCourseThumbnailMode] = useState('url');
  const [courseThumbnailFile, setCourseThumbnailFile] = useState(null);
  const [courseThumbnailPreview, setCourseThumbnailPreview] = useState('');

  const [showLessonForm, setShowLessonForm] = useState(false);
  const [isEditingLesson, setIsEditingLesson] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState(null);
  const [lessonFormData, setLessonFormData] = useState(emptyLessonForm);
  const [lessonVideoMode, setLessonVideoMode] = useState('url');
  const [lessonVideoFile, setLessonVideoFile] = useState(null);
  const [lessonVideoPreview, setLessonVideoPreview] = useState('');

  const [pendingDelete, setPendingDelete] = useState(null);
  const [notice, setNotice] = useState(null);
  const noticeTimeoutRef = useRef(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    return () => {
      if (courseThumbnailPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(courseThumbnailPreview);
      }
      if (lessonVideoPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(lessonVideoPreview);
      }
      if (noticeTimeoutRef.current) {
        clearTimeout(noticeTimeoutRef.current);
      }
    };
  }, [courseThumbnailPreview, lessonVideoPreview]);

  const showNotice = (message, type = 'success') => {
    if (noticeTimeoutRef.current) {
      clearTimeout(noticeTimeoutRef.current);
    }

    setNotice({ message, type });
    noticeTimeoutRef.current = setTimeout(() => {
      setNotice(null);
    }, 3200);
  };

  const fetchCourses = async () => {
    try {
      const response = await apiFetch('/api/admin/courses');
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
      const response = await apiFetch(`/api/courses/${courseId}`);
      const responseData = await response.json();
      if (response.ok) {
        setSelectedCourse(responseData);
      } else {
        showNotice(responseData.message || 'Failed to fetch course details', 'error');
      }
    } catch (fetchError) {
      console.error(fetchError);
      showNotice('Connection failed while loading course details', 'error');
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
    setCourseThumbnailMode('url');
    setCourseThumbnailFile(null);
    setCourseThumbnailPreview('');
  };

  const resetLessonForm = () => {
    setIsEditingLesson(false);
    setEditingLessonId(null);
    setLessonFormData(emptyLessonForm);
    setLessonVideoMode('url');
    setLessonVideoFile(null);
    setLessonVideoPreview('');
  };

  const handleCourseThumbnailChange = (event) => {
    const file = event.target.files?.[0] || null;
    setCourseThumbnailFile(file);
    if (courseThumbnailPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(courseThumbnailPreview);
    }
    setCourseThumbnailPreview(file ? URL.createObjectURL(file) : '');
  };

  const handleLessonVideoChange = (event) => {
    const file = event.target.files?.[0] || null;
    setLessonVideoFile(file);
    if (lessonVideoPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(lessonVideoPreview);
    }
    setLessonVideoPreview(file ? URL.createObjectURL(file) : '');
  };

  const handleSelectCourse = (course) => {
    fetchCourseDetails(course.id);
  };

  const handleCourseSubmit = async (event) => {
    event.preventDefault();
    const method = isEditingCourse ? 'PUT' : 'POST';
    const endpoint = isEditingCourse
      ? `/api/admin/courses/${courseFormData.id}`
      : '/api/admin/courses';
    const useMultipart = courseThumbnailMode === 'upload';

    if (useMultipart && !courseThumbnailFile) {
      showNotice('Please choose a thumbnail image or switch back to URL mode.', 'warning');
      return;
    }

    try {
      const payload = useMultipart ? new FormData() : JSON.stringify(courseFormData);
      if (useMultipart) {
        Object.entries(courseFormData).forEach(([key, value]) => {
          if (key === 'thumbnail') return;
          payload.append(key, value ?? '');
        });
        if (!courseThumbnailFile && courseFormData.thumbnail) {
          payload.append('thumbnail', courseFormData.thumbnail);
        }
        if (courseThumbnailFile) {
          payload.append('thumbnail_file', courseThumbnailFile);
        }
      }

      const response = await apiFetch(endpoint, {
        method,
        headers: useMultipart
          ? {}
          : { 'Content-Type': 'application/json' },
        body: payload,
      });

      const responseData = await response.json();
      if (response.ok) {
        setShowCourseForm(false);
        resetCourseForm();
        fetchCourses();
        if (isEditingCourse && selectedCourse?.id === courseFormData.id) {
          fetchCourseDetails(courseFormData.id);
        }
        showNotice(isEditingCourse ? 'Course updated successfully' : 'Course created successfully');
      } else {
        showNotice(responseData.message || 'Failed to save course', 'error');
      }
    } catch (saveError) {
      console.error(saveError);
      showNotice('Error saving course', 'error');
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
      const response = await apiFetch(endpoint.replace(API_URL, ''), {
        method: 'DELETE',
      });

      const responseData = await response.json();
      if (response.ok) {
        showNotice(isCourseDelete ? 'Course deleted successfully' : 'Lesson deleted successfully');
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
        showNotice(responseData.message || `Failed to delete ${pendingDelete.type}`, 'error');
      }
    } catch (deleteError) {
      console.error(deleteError);
      showNotice(`Error deleting ${pendingDelete.type}`, 'error');
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
    setCourseThumbnailMode('url');
    setCourseThumbnailFile(null);
    setCourseThumbnailPreview(course.thumbnail || '');
    setShowCourseForm(true);
  };

  const handleLessonSubmit = async (event) => {
    event.preventDefault();
    const method = isEditingLesson ? 'PUT' : 'POST';
    const endpoint = isEditingLesson
      ? `/api/admin/lessons/${editingLessonId}`
      : `/api/admin/courses/${selectedCourse.id}/lessons`;
    const useMultipart = lessonVideoMode === 'upload';

    if (useMultipart && !lessonVideoFile) {
      showNotice('Please choose a lesson video file or switch back to YouTube/link mode.', 'warning');
      return;
    }

    try {
      const payload = useMultipart ? new FormData() : JSON.stringify(lessonFormData);
      if (useMultipart) {
        Object.entries(lessonFormData).forEach(([key, value]) => {
          if (key === 'video_url') return;
          payload.append(key, value ?? '');
        });
        if (!lessonVideoFile && lessonFormData.video_url) {
          payload.append('video_url', lessonFormData.video_url);
        }
        if (lessonVideoFile) {
          payload.append('video_file', lessonVideoFile);
        }
      }

      const response = await apiFetch(endpoint, {
        method,
        headers: useMultipart
          ? {}
          : { 'Content-Type': 'application/json' },
        body: payload,
      });

      const responseData = await response.json();
      if (response.ok) {
        setShowLessonForm(false);
        resetLessonForm();
        fetchCourseDetails(selectedCourse.id);
        showNotice(isEditingLesson ? 'Lesson updated successfully' : 'Lesson added successfully');
      } else {
        showNotice(responseData.message || 'Failed to save lesson', 'error');
      }
    } catch (saveError) {
      console.error(saveError);
      showNotice('Error saving lesson', 'error');
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
    setLessonVideoMode('url');
    setLessonVideoFile(null);
    setLessonVideoPreview(lesson.video_url || '');
    setShowLessonForm(true);
  };

  if (loading) return <div>Loading courses...</div>;
  if (error) return <div style={{ color: 'var(--danger)', padding: '20px' }}>{error}</div>;

  const categoryOptions = getCategoryOptions();
  const lessonItems = selectedCourse?.lessons || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {notice && (
        <div className={`admin-toast admin-toast-${notice.type}`} role="status" aria-live="polite">
          <span className="admin-toast-dot" />
          <span>{notice.message}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss notification">
            &times;
          </button>
        </div>
      )}

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
            <button
              type="button"
              className="admin-modal-close"
              onClick={() => setShowCourseForm(false)}
              aria-label="Close course settings"
            >
              &times;
            </button>
            <h2 className="text-serif admin-modal-title">
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

              <div className="course-settings-grid">
                <div className="course-settings-fields">
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
                <div className="admin-form-group course-thumbnail-field">
                  <label>Thumbnail Source</label>
                  <div className="source-toggle">
                    <button
                      type="button"
                      className={`source-toggle-btn ${courseThumbnailMode === 'url' ? 'active' : ''}`}
                      onClick={() => {
                        setCourseThumbnailMode('url');
                        setCourseThumbnailFile(null);
                        setCourseThumbnailPreview(courseFormData.thumbnail || '');
                      }}
                    >
                      <Link2 size={14} /> Paste URL
                    </button>
                    <button
                      type="button"
                      className={`source-toggle-btn ${courseThumbnailMode === 'upload' ? 'active' : ''}`}
                      onClick={() => {
                        setCourseThumbnailMode('upload');
                        setCourseFormData({ ...courseFormData, thumbnail: courseFormData.thumbnail || '' });
                      }}
                    >
                      <Upload size={14} /> Upload from PC
                    </button>
                  </div>

                  {courseThumbnailMode === 'url' ? (
                    <input
                      type="text"
                      placeholder="https://..."
                      value={courseFormData.thumbnail}
                      onChange={(event) => {
                        setCourseFormData({ ...courseFormData, thumbnail: event.target.value });
                        setCourseThumbnailPreview(event.target.value);
                        setCourseThumbnailFile(null);
                      }}
                      className="admin-input"
                      style={{ wordBreak: 'break-all' }}
                    />
                  ) : (
                    <input
                      type="file"
                      accept="image/*"
                      required={courseThumbnailMode === 'upload'}
                      onChange={handleCourseThumbnailChange}
                      className="admin-input"
                    />
                  )}

                  {(courseThumbnailPreview || courseFormData.thumbnail) && (
                    <div className="source-preview">
                      <img
                        src={courseThumbnailPreview || courseFormData.thumbnail}
                        alt="Thumbnail preview"
                        className="source-preview-image"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none';
                        }}
                      />
                      <span className="source-preview-label">
                        {courseThumbnailFile ? courseThumbnailFile.name : 'Current thumbnail preview'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-actions" style={{ gap: '16px' }}>
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
            <button
              type="button"
              className="admin-modal-close"
              onClick={() => setShowLessonForm(false)}
              aria-label="Close lesson settings"
            >
              &times;
            </button>
            <h2 className="text-serif admin-modal-title">
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
                  <label>Video Source</label>
                  <div className="source-toggle">
                    <button
                      type="button"
                      className={`source-toggle-btn ${lessonVideoMode === 'url' ? 'active' : ''}`}
                      onClick={() => {
                        setLessonVideoMode('url');
                        setLessonVideoFile(null);
                        setLessonVideoPreview(lessonFormData.video_url || '');
                      }}
                    >
                      <Link2 size={14} /> YouTube / Link
                    </button>
                    <button
                      type="button"
                      className={`source-toggle-btn ${lessonVideoMode === 'upload' ? 'active' : ''}`}
                      onClick={() => {
                        setLessonVideoMode('upload');
                      }}
                    >
                      <Upload size={14} /> Upload Video
                    </button>
                  </div>

                  {lessonVideoMode === 'url' ? (
                    <input
                      type="url"
                      required
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={lessonFormData.video_url}
                      onChange={(event) => {
                        setLessonFormData({ ...lessonFormData, video_url: event.target.value });
                        setLessonVideoPreview(event.target.value);
                        setLessonVideoFile(null);
                      }}
                      className="admin-input"
                    />
                  ) : (
                    <input
                      type="file"
                      accept="video/*"
                      required={lessonVideoMode === 'upload'}
                      onChange={handleLessonVideoChange}
                      className="admin-input"
                    />
                  )}

                  {(lessonVideoPreview || lessonFormData.video_url) && (
                    <div className="source-preview source-preview-compact">
                      <div className="source-preview-icon">
                        <Film size={14} />
                      </div>
                      <div className="source-preview-copy">
                        <strong>{lessonVideoFile ? lessonVideoFile.name : 'Video source ready'}</strong>
                        <span>{lessonVideoFile ? 'Uploaded file will be stored and served from the server.' : 'YouTube links load directly and quickly.'}</span>
                      </div>
                    </div>
                  )}
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

              <div className="modal-actions" style={{ gap: '16px' }}>
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
            <div className="modal-actions" style={{ gap: '16px' }}>
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
