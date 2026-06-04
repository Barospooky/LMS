import React, { useEffect, useState } from 'react';
import { Plus, Edit3, Trash2, BookOpen, Layers, Video, AlignLeft, RefreshCw } from 'lucide-react';
import Reveal from '../../components/Reveal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CourseManager = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Course Form Modal States
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [isEditingCourse, setIsEditingCourse] = useState(false);
  const [courseFormData, setCourseFormData] = useState({
    title: '', description: '', price: '', category: 'development', difficulty: 'beginner', thumbnail: ''
  });

  // Lesson Form Modal States
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [isEditingLesson, setIsEditingLesson] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState(null);
  const [lessonFormData, setLessonFormData] = useState({
    title: '', video_url: '', lesson_order: 1, transcript: ''
  });

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
      const data = await response.json();
      if (response.ok) {
        setCourses(data);
      } else {
        setError(data.message || 'Failed to load courses');
      }
    } catch (err) {
      console.error(err);
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
      const data = await response.json();
      if (response.ok) {
        setSelectedCourse(data);
      } else {
        alert(data.message || 'Failed to fetch course details');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectCourse = (course) => {
    fetchCourseDetails(course.id);
  };

  // Course Submit
  const handleCourseSubmit = async (e) => {
    e.preventDefault();
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

      const data = await response.json();
      if (response.ok) {
        setShowCourseForm(false);
        fetchCourses();
        if (isEditingCourse && selectedCourse?.id === courseFormData.id) {
          fetchCourseDetails(courseFormData.id);
        }
        alert(isEditingCourse ? 'Course updated successfully' : 'Course created successfully');
      } else {
        alert(data.message || 'Failed to save course');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving course');
    }
  };

  // Course Edit Press
  const handleEditCoursePress = (course, e) => {
    e.stopPropagation();
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

  // Course Delete Press
  const handleDeleteCourse = async (courseId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this course?')) return;

    try {
      const response = await fetch(`${API_URL}/api/admin/courses/${courseId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        alert('Course deleted successfully');
        fetchCourses();
        if (selectedCourse?.id === courseId) {
          setSelectedCourse(null);
        }
      } else {
        alert(data.message || 'Failed to delete course');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting course');
    }
  };

  // Lesson Submit
  const handleLessonSubmit = async (e) => {
    e.preventDefault();
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

      const data = await response.json();
      if (response.ok) {
        setShowLessonForm(false);
        fetchCourseDetails(selectedCourse.id);
        alert(isEditingLesson ? 'Lesson updated successfully' : 'Lesson added successfully');
      } else {
        alert(data.message || 'Failed to save lesson');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving lesson');
    }
  };

  // Lesson Edit Press
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

  // Lesson Delete Press
  const handleDeleteLesson = async (lessonId) => {
    if (!window.confirm('Are you sure you want to delete this lesson?')) return;

    try {
      const response = await fetch(`${API_URL}/api/admin/lessons/${lessonId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        alert('Lesson deleted successfully');
        fetchCourseDetails(selectedCourse.id);
      } else {
        alert(data.message || 'Failed to delete lesson');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting lesson');
    }
  };

  if (loading) return <div>Loading courses...</div>;
  if (error) return <div style={{ color: 'var(--danger)', padding: '20px' }}>{error}</div>;

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
            setIsEditingCourse(false);
            setCourseFormData({ title: '', description: '', price: '', category: 'development', difficulty: 'beginner', thumbnail: '' });
            setShowCourseForm(true);
          }}
          className="btn-primary"
          style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
        >
          <Plus size={16} /> Create Course
        </button>
      </header>

      <div className="manager-split">
        {/* Left Side: Course List */}
        <Reveal delay="0.1s">
          <div className="admin-section">
            <h2 className="text-serif" style={{ fontSize: '24px', marginBottom: '18px' }}>Available Courses</h2>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => (
                    <tr
                      key={course.id}
                      onClick={() => handleSelectCourse(course)}
                      style={{
                        cursor: 'pointer',
                        background: selectedCourse?.id === course.id ? 'rgba(0,174,177,0.06)' : 'transparent',
                        fontWeight: selectedCourse?.id === course.id ? 'bold' : 'normal'
                      }}
                    >
                      <td>{course.title}</td>
                      <td style={{ textTransform: 'capitalize' }}>{course.category}</td>
                      <td>₹{course.price}</td>
                      <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <button onClick={(e) => handleEditCoursePress(course, e)} className="btn-sm btn-edit"><Edit3 size={12} /></button>
                        <button onClick={(e) => handleDeleteCourse(course.id, e)} className="btn-sm btn-delete"><Trash2 size={12} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>

        {/* Right Side: Selected Course Details & Syllabus */}
        <Reveal delay="0.2s">
          <div className="admin-section">
            {selectedCourse ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--line-soft)', paddingBottom: '16px', marginBottom: '16px' }}>
                  <div>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 'bold' }}>{selectedCourse.category} - {selectedCourse.difficulty}</span>
                    <h2 className="text-serif" style={{ fontSize: '28px', margin: '4px 0 8px' }}>{selectedCourse.title}</h2>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>{selectedCourse.description}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Layers size={18} /> Syllabus ({selectedCourse.lessons?.length || 0} Lessons)
                  </h3>
                  <button
                    onClick={() => {
                      setIsEditingLesson(false);
                      setLessonFormData({ title: '', video_url: '', lesson_order: (selectedCourse.lessons?.length || 0) + 1, transcript: '' });
                      setShowLessonForm(true);
                    }}
                    className="btn-sm btn-edit"
                    style={{ display: 'flex', gap: '4px', alignItems: 'center' }}
                  >
                    <Plus size={12} /> Add Lesson
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {selectedCourse.lessons?.length === 0 ? (
                    <p style={{ opacity: 0.5, textAlign: 'center', padding: '20px' }}>This course has no lessons yet. Click "Add Lesson" to get started.</p>
                  ) : (
                    selectedCourse.lessons?.map((lesson, idx) => (
                      <div key={lesson.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderRadius: '18px', background: 'rgba(255,255,255,0.6)', border: '1px solid var(--line-soft)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ width: '28px', height: '28px', background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifycontent: 'center', fontSize: '12px', fontWeight: 'bold', justifyContent: 'center' }}>
                            {lesson.lesson_order}
                          </span>
                          <div>
                            <strong style={{ display: 'block', fontSize: '14px' }}>{lesson.title}</strong>
                            <small style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '280px', whiteSpace: 'nowrap' }}>{lesson.video_url}</small>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => handleEditLessonPress(lesson)} className="btn-sm btn-edit" style={{ padding: '6px 12px' }}>Edit</button>
                          <button onClick={() => handleDeleteLesson(lesson.id)} className="btn-sm btn-delete" style={{ padding: '6px 12px' }}>Delete</button>
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

      {/* Course Form Modal */}
      {showCourseForm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px', textAlign: 'left' }}>
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
                  onChange={(e) => setCourseFormData({ ...courseFormData, title: e.target.value })}
                  className="admin-input"
                />
              </div>

              <div className="admin-form-group">
                <label>Description</label>
                <textarea
                  required
                  value={courseFormData.description}
                  onChange={(e) => setCourseFormData({ ...courseFormData, description: e.target.value })}
                  className="admin-textarea"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="admin-form-group">
                  <label>Price (INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={courseFormData.price}
                    onChange={(e) => setCourseFormData({ ...courseFormData, price: e.target.value })}
                    className="admin-input"
                  />
                </div>
                <div className="admin-form-group">
                  <label>Difficulty</label>
                  <select
                    value={courseFormData.difficulty}
                    onChange={(e) => setCourseFormData({ ...courseFormData, difficulty: e.target.value })}
                    className="admin-select"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="admin-form-group">
                  <label>Category</label>
                  <select
                    value={courseFormData.category}
                    onChange={(e) => setCourseFormData({ ...courseFormData, category: e.target.value })}
                    className="admin-select"
                  >
                    <option value="development">Development</option>
                    <option value="management">Management</option>
                    <option value="datascience">Data Science</option>
                    <option value="marketing">Marketing</option>
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>Thumbnail URL</label>
                  <input
                    type="text"
                    value={courseFormData.thumbnail}
                    onChange={(e) => setCourseFormData({ ...courseFormData, thumbnail: e.target.value })}
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

      {/* Lesson Form Modal */}
      {showLessonForm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '560px', textAlign: 'left' }}>
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
                  onChange={(e) => setLessonFormData({ ...lessonFormData, title: e.target.value })}
                  className="admin-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '12px' }}>
                <div className="admin-form-group">
                  <label>Video URL (YouTube)</label>
                  <input
                    type="text"
                    required
                    value={lessonFormData.video_url}
                    onChange={(e) => setLessonFormData({ ...lessonFormData, video_url: e.target.value })}
                    className="admin-input"
                  />
                </div>
                <div className="admin-form-group">
                  <label>Order No.</label>
                  <input
                    type="number"
                    required
                    value={lessonFormData.lesson_order}
                    onChange={(e) => setLessonFormData({ ...lessonFormData, lesson_order: e.target.value })}
                    className="admin-input"
                  />
                </div>
              </div>

              <div className="admin-form-group">
                <label>Lesson Transcript / Content Study Guide</label>
                <textarea
                  value={lessonFormData.transcript}
                  onChange={(e) => setLessonFormData({ ...lessonFormData, transcript: e.target.value })}
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
    </div>
  );
};

export default CourseManager;
