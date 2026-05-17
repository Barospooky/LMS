import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import jsPDF from 'jspdf';
import '../styles/main.css';
import '../styles/course.css';
import Reveal from '../components/Reveal';
import useMagnetic from '../hooks/useMagnetic';
import YouTubeLessonPlayer from '../components/YouTubeLessonPlayer';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getStoredProgress = (courseId) => {
  const raw = localStorage.getItem(`course_progress_${courseId}`);
  return raw ? JSON.parse(raw) : { completedLessons: [], currentLessonId: null, certificateEarned: false };
};

const Course = () => {
  const navigate = useNavigate();
  const { courseId, lessonId } = useParams();
  const [course, setCourse] = useState(null);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [quiz, setQuiz] = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');
  const [courseProgress, setCourseProgress] = useState(getStoredProgress(courseId));
  const [showCertificate, setShowCertificate] = useState(false);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [isDownloadingCertificate, setIsDownloadingCertificate] = useState(false);
  const btnBack = useMagnetic();
  const certificateRef = useRef(null);

  const downloadCertificate = async () => {
    if (!course || isDownloadingCertificate) return;

    try {
      setIsDownloadingCertificate(true);
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const innerMargin = 16;
      const accent = '#c7772d';
      const textColor = '#1a1a1a';
      const subtitleColor = '#666666';
      const studentName = `${user?.firstName || 'Student'} ${user?.lastName || ''}`.trim();
      const completionDate = new Date().toLocaleDateString('en-GB');

      pdf.setFillColor(255, 250, 240);
      pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
      pdf.setDrawColor(215, 197, 168);
      pdf.setLineWidth(0.5);
      pdf.rect(margin, margin, pdfWidth - (margin * 2), pdfHeight - (margin * 2));
      pdf.setDrawColor(60, 60, 60);
      pdf.setLineWidth(0.2);
      pdf.rect(innerMargin, innerMargin, pdfWidth - (innerMargin * 2), pdfHeight - (innerMargin * 2));

      pdf.setTextColor(textColor);
      pdf.setFont('times', 'bolditalic');
      pdf.setFontSize(22);
      pdf.text('MELODY.', pdfWidth / 2, 34, { align: 'center' });

      pdf.setTextColor(accent);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text('CERTIFICATE OF MUSICAL COMPLETION', pdfWidth / 2, 44, { align: 'center' });

      pdf.setTextColor(subtitleColor);
      pdf.setFontSize(14);
      pdf.text('This certifies that', pdfWidth / 2, 72, { align: 'center' });

      pdf.setTextColor(textColor);
      pdf.setFont('times', 'bold');
      pdf.setFontSize(28);
      pdf.text(studentName, pdfWidth / 2, 92, { align: 'center' });

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(subtitleColor);
      pdf.setFontSize(13);
      pdf.text('has successfully completed the course', pdfWidth / 2, 108, { align: 'center' });

      pdf.setTextColor(textColor);
      pdf.setFontSize(20);
      pdf.text(course.title, pdfWidth / 2, 124, { align: 'center' });

      pdf.setTextColor(subtitleColor);
      pdf.setFontSize(12);
      pdf.text('including all lesson videos and their related quiz modules.', pdfWidth / 2, 140, { align: 'center' });

      pdf.setDrawColor(accent);
      pdf.setLineWidth(0.6);
      pdf.circle(pdfWidth / 2, 164, 10);
      pdf.setTextColor(accent);
      pdf.setFont('times', 'bold');
      pdf.setFontSize(18);
      pdf.text('\u266A', pdfWidth / 2, 167, { align: 'center' });

      pdf.setDrawColor(120, 120, 120);
      pdf.setLineWidth(0.25);
      pdf.line(36, 178, 82, 178);
      pdf.line(pdfWidth - 82, 178, pdfWidth - 36, 178);

      pdf.setTextColor(textColor);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text('Lead Instructor', 36, 186);
      pdf.text('Melody Conservatory', 36, 192);

      pdf.text(completionDate, pdfWidth - 82, 186);
      pdf.text('Date of completion', pdfWidth - 82, 192);

      const pdfBlob = pdf.output('blob');
      const downloadUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${course.title.replace(/\s+/g, '_')}_Certificate.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('PDF Error:', err);
      alert('Unable to download the certificate as a PDF right now. Please try again.');
    } finally {
      setIsDownloadingCertificate(false);
    }
  };

  const handleVideoComplete = React.useCallback(() => {
    setVideoCompleted(true);
    setActiveTab('quiz');
  }, []);

  const user = useMemo(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  }, []);

  useEffect(() => {
    fetchCourseDetails();
  }, [courseId]);

  useEffect(() => {
    setCourseProgress(getStoredProgress(courseId));
  }, [courseId]);

  useEffect(() => {
    if (course && lessonId) {
      const lesson = course.lessons.find((item) => item.id === Number.parseInt(lessonId, 10));
      setCurrentLesson(lesson);
      fetchQuiz(lessonId);
      setQuizSubmitted(false);
      setSelectedAnswers({});
      setVideoCompleted(false);
      setActiveTab('overview');
    } else if (course && course.lessons.length > 0) {
      navigate(`/course/${courseId}/${course.lessons[0].id}`, { replace: true });
    }
  }, [course, lessonId]);

  useEffect(() => {
    if (!currentLesson) return;

    const nextState = {
      ...getStoredProgress(courseId),
      currentLessonId: currentLesson.id,
    };
    localStorage.setItem(`course_progress_${courseId}`, JSON.stringify(nextState));
    setCourseProgress(nextState);
  }, [courseId, currentLesson]);

  const fetchCourseDetails = async () => {
    try {
      const response = await fetch(`${API_URL}/api/courses/${courseId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setCourse(data);
      }
    } catch (error) {
      console.error('Error fetching course details:', error);
    }
  };

  const fetchQuiz = async (selectedLessonId) => {
    try {
      const response = await fetch(`${API_URL}/api/courses/quiz/${selectedLessonId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setQuiz(data);
      }
    } catch (error) {
      console.error('Error fetching quiz:', error);
    }
  };

  const handleAnswerSelect = (quizId, answer) => {
    setSelectedAnswers((prev) => ({ ...prev, [quizId]: answer }));
  };

  const handleQuizSubmit = () => {
    let newScore = 0;
    quiz.forEach((item) => {
      if (selectedAnswers[item.id] === item.correct_answer) {
        newScore += 1;
      }
    });

    setScore(newScore);
    setQuizSubmitted(true);

    if (course && currentLesson) {
      const existingProgress = getStoredProgress(courseId);
      const completedLessons = Array.from(new Set([...existingProgress.completedLessons, currentLesson.id]));
      const certificateEarned = completedLessons.length === course.lessons.length || existingProgress.certificateEarned;

      const nextState = {
        completedLessons,
        currentLessonId: currentLesson.id,
        certificateEarned,
      };

      localStorage.setItem(`course_progress_${courseId}`, JSON.stringify(nextState));
      setCourseProgress(nextState);
    }
  };

  const handleNextLesson = () => {
    if (!course || !currentLesson) return;

    const currentIndex = course.lessons.findIndex((lesson) => lesson.id === currentLesson.id);
    const nextLesson = course.lessons[currentIndex + 1];

    if (nextLesson) {
      navigate(`/course/${courseId}/${nextLesson.id}`);
    } else {
      setShowCertificate(true);
    }
  };

  if (!course || !currentLesson) return <div className="course-page">Loading...</div>;

  const completedCount = courseProgress.completedLessons.length;
  const progressPercentage = course.lessons.length ? Math.round((completedCount / course.lessons.length) * 100) : 0;
  const scorePercentage = quiz.length ? Math.round((score / quiz.length) * 100) : 0;
  const isCurrentLessonComplete = courseProgress.completedLessons.includes(currentLesson.id);
  const canAccessQuiz = videoCompleted || isCurrentLessonComplete;
  const isFinalLesson = course.lessons[course.lessons.length - 1]?.id === currentLesson.id;
  const shouldShowCertificateBlock = courseProgress.certificateEarned;

  return (
    <div className="course-page">
      <div className="course-shell">
        <nav className="course-nav">
          <div className="nav-left">
            <button ref={btnBack} className="nav-back magnetic" onClick={() => navigate('/dashboard')}>&larr; Dashboard</button>
          </div>
          <div className="nav-center">
            <span className="text-display font-semibold tracking-tight">{course.title}</span>
          </div>
          <div className="nav-right">
            <div className="course-badge">{course.instrument}</div>
            <div className="progress-pill">Lesson {currentLesson.lesson_order} / {course.lessons.length}</div>
          </div>
        </nav>

        <div className="course-layout">
          <aside className="curriculum-sidebar">
            <div className="curr-header">
              <h3 className="text-display font-bold">Curriculum</h3>
              <p className="curr-subtitle">Active lesson stays highlighted. Finish the current video, answer its question set, then continue into the next module.</p>
            </div>
            <div className="curr-list">
              {course.lessons.map((lesson) => {
                const isCompleted = courseProgress.completedLessons.includes(lesson.id);
                const isActive = lesson.id === Number.parseInt(lessonId, 10);

                return (
                  <div
                    key={lesson.id}
                    className={`curr-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                    onClick={() => navigate(`/course/${courseId}/${lesson.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className="curr-status"></span>
                    <div className="curr-copy">
                      <span className="curr-step">Module {lesson.lesson_order}</span>
                      <span className="curr-title">{lesson.title}</span>
                      <span className="curr-note">{isCompleted ? 'Completed' : isActive ? 'Now playing' : 'Upcoming'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          <section className="video-section">
            <Reveal>
              <div className="video-wrapper">
                <YouTubeLessonPlayer
                  key={lessonId}
                  videoUrl={currentLesson.video_url}
                  title={currentLesson.title}
                  onComplete={handleVideoComplete}
                />
              </div>
            </Reveal>

            <div className="lesson-info">
              <Reveal delay="0.1s">
                <div className="lesson-hero">
                  <div>
                    <span className="lesson-meta">Module {currentLesson.lesson_order} - {progressPercentage}% complete</span>
                    <h2 className="text-serif tracking-tighter">{currentLesson.title}</h2>
                    <p>Watch the lesson carefully, practice the technique, and when the video ends the related question set becomes the immediate next step for the learner.</p>
                  </div>
                  <div className="lesson-summary">
                    <div className="summary-box">
                      <span>Completed modules</span>
                      <strong>{completedCount} / {course.lessons.length}</strong>
                    </div>
                    <div className="summary-box">
                      <span>Current lesson</span>
                      <strong>{isCurrentLessonComplete ? 'Completed' : 'In Progress'}</strong>
                    </div>
                    <div className="summary-box">
                      <span>Video status</span>
                      <strong>{videoCompleted ? 'Finished' : isCurrentLessonComplete ? 'Review Mode' : 'Watching'}</strong>
                    </div>
                    <div className="summary-box">
                      <span>Certificate</span>
                      <strong>{courseProgress.certificateEarned ? 'Ready' : 'Locked'}</strong>
                    </div>
                  </div>
                </div>
              </Reveal>

              {courseProgress.certificateEarned && (
                <Reveal delay="0.15s">
                  <div className="completion-card" style={{ marginBottom: '20px' }}>
                    <strong>Certificate unlocked</strong>
                    <p className="text-secondary" style={{ marginTop: '8px' }}>
                      Your certificate stays available even when you come back to rewatch lessons or retake quizzes.
                    </p>
                    <div className="completion-actions">
                      <button className="btn-primary" onClick={() => setShowCertificate(true)}>Open Certificate</button>
                    </div>
                  </div>
                </Reveal>
              )}

              <div className="lesson-tabs">
                <button className={`ltab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
                <button className={`ltab ${activeTab === 'quiz' ? 'active' : ''}`} onClick={() => setActiveTab('quiz')} disabled={!canAccessQuiz}>Quiz</button>
              </div>

              {activeTab === 'overview' && (
                <Reveal delay="0.2s">
                  <div className="ltab-content active">
                    <p className="text-secondary">This lesson player is structured like a proper LMS: lesson navigation, embedded video, checkpoint quiz, and progress tied to the student profile on the device.</p>
                    <ul className="lesson-points">
                      <li>Watch the full module before the related questions become active.</li>
                      <li>Practice the shown technique alongside the instructor.</li>
                      <li>Submit the quiz to mark the lesson complete and move forward.</li>
                    </ul>
                    {!canAccessQuiz && (
                      <div className="video-gate">
                        <strong>Quiz unlocks after the video ends</strong>
                        <p className="text-secondary">The learner watches first, then the system moves attention to the related assessment for that exact lesson.</p>
                      </div>
                    )}
                    {isCurrentLessonComplete && (
                      <div className="video-gate">
                        <strong>Lesson already completed</strong>
                        <p className="text-secondary">This module stays open for review, so the learner can rewatch the video and retake the quiz anytime.</p>
                      </div>
                    )}
                  </div>
                </Reveal>
              )}

              {activeTab === 'quiz' && (
                <Reveal delay="0.2s">
                  <div className="ltab-content active">
                    {!canAccessQuiz ? (
                      <div className="quiz-locked">
                        <strong>Finish the lesson video first</strong>
                        <p className="text-secondary">As soon as the video completes, this lesson’s question set will open automatically.</p>
                      </div>
                    ) : quiz.length > 0 ? (
                      <div className="quiz-container">
                        {!quizSubmitted ? (
                          <>
                            {quiz.map((item) => (
                              <div key={item.id} className="quiz-question">
                                <h4 style={{ marginBottom: '15px' }}>{item.question}</h4>
                                <div className="options-grid">
                                  {item.options.map((opt) => (
                                    <button
                                      key={opt}
                                      className={`btn-outline quiz-option ${selectedAnswers[item.id] === opt ? 'active' : ''}`}
                                      onClick={() => handleAnswerSelect(item.id, opt)}
                                    >
                                      {opt}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                            <button className="btn-primary" onClick={handleQuizSubmit} disabled={Object.keys(selectedAnswers).length < quiz.length}>
                              Submit Quiz
                            </button>
                          </>
                        ) : (
                          <div className="quiz-results">
                            <h3 className="text-serif">Quiz Completed</h3>
                            <div className="quiz-score" style={{ '--score': scorePercentage }}>
                              {score} / {quiz.length}
                            </div>
                            <p>
                              {isFinalLesson
                                ? 'You finished the last checkpoint. The course certificate is now available.'
                                : 'This lesson is complete. Move to the next module to continue the program.'}
                            </p>
                            <div className="completion-actions">
                              <button className="btn-outline" onClick={() => { setQuizSubmitted(false); setSelectedAnswers({}); }}>
                                Retake Quiz
                              </button>
                              <button className="btn-primary" onClick={handleNextLesson}>
                                {isFinalLesson ? 'View Certificate' : 'Next Lesson'}
                              </button>
                            </div>

                            {shouldShowCertificateBlock && (
                              <div className="completion-card">
                                <strong>Certificate unlocked</strong>
                                <p className="text-secondary" style={{ marginTop: '8px' }}>
                                  Every lesson module and assessment for this music course has been completed successfully.
                                </p>
                                <div className="completion-actions">
                                  <button className="btn-primary" onClick={() => setShowCertificate(true)}>Open Certificate</button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p>No quiz available for this lesson.</p>
                    )}
                  </div>
                </Reveal>
              )}
            </div>
          </section>
        </div>
      </div>

      {showCertificate && (
        <div className="cert-modal">
          <div className="cert-overlay" onClick={() => setShowCertificate(false)}></div>
          <div className="cert-container">
            <div className="certificate" ref={certificateRef}>
              <div className="cert-border-outer">
                <div className="cert-border-inner">
                  <div className="cert-top">
                    <div className="cert-logo brand-logo">MELODY.</div>
                    <div className="cert-subtitle">Certificate of Musical Completion</div>
                  </div>
                  <div className="cert-divider"></div>
                  <div className="cert-body">
                    <p className="cert-presented">This certifies that</p>
                    <h2 className="cert-name">{user?.firstName || 'Student'} {user?.lastName || ''}</h2>
                    <p className="cert-course-label">has successfully completed the course</p>
                    <div className="cert-course">{course.title}</div>
                    <p className="cert-detail">including all lesson videos and their related quiz modules.</p>
                  </div>
                  <div className="cert-footer">
                    <div className="cert-sig">
                      <div className="sig-line"></div>
                      <span>Lead Instructor</span>
                      <small>Melody Conservatory</small>
                    </div>
                    <div className="cert-seal">
                      <div className="seal-ring">♪</div>
                    </div>
                    <div className="cert-sig">
                      <div className="sig-line"></div>
                      <span>{new Date().toLocaleDateString()}</span>
                      <small>Date of completion</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="cert-actions">
              <button className="btn-primary" onClick={downloadCertificate} disabled={isDownloadingCertificate}>
                {isDownloadingCertificate ? 'Preparing PDF...' : 'Download Certificate'}
              </button>
              <button className="btn-outline" onClick={() => setShowCertificate(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Course;
