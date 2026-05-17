import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../styles/main.css';
import '../styles/dashboard.css';
import Reveal from '../components/Reveal';
import useMagnetic from '../hooks/useMagnetic';
import { buildCourseArtwork } from '../utils/courseArt';
import SuccessModal from '../components/SuccessModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const Curriculum = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const btnBack = useMagnetic();
  const btnPurchase = useMagnetic();

  useEffect(() => {
    fetchCourseDetails();
  }, [id]);

  const fetchCourseDetails = async () => {
    try {
      const response = await fetch(`${API_URL}/api/courses/${id}`, {
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
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        alert('Unable to load Razorpay checkout. Please try again.');
        return;
      }

      const response = await fetch(`${API_URL}/api/payments/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ courseId: id }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || 'Unable to start payment');
        return;
      }

      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');

      const options = {
        key: data.key,
        amount: data.amount,
        currency: data.currency,
        name: 'MELODY.',
        description: `Purchase ${data.course.title}`,
        order_id: data.razorpayOrderId,
        handler: async (paymentResult) => {
          try {
            const verifyResponse = await fetch(`${API_URL}/api/payments/verify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token')}`,
              },
              body: JSON.stringify({
                orderId: data.orderId,
                ...paymentResult,
              }),
            });

            const verifyData = await verifyResponse.json();

            if (!verifyResponse.ok) {
              alert(verifyData.message || 'Payment verification failed');
              return;
            }

            await fetchCourseDetails();
            setShowSuccessModal(true);
          } catch (verifyError) {
            console.error('Error verifying payment:', verifyError);
            alert('Payment verification failed');
          }
        },
        prefill: {
          name: `${storedUser.firstName || ''} ${storedUser.lastName || ''}`.trim(),
          email: storedUser.email || '',
        },
        notes: {
          courseId: String(id),
        },
        theme: {
          color: '#171411',
        },
        modal: {
          ondismiss: () => {
            setPurchasing(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
      return;
    } catch (error) {
      console.error('Error purchasing course:', error);
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) return <div className="dashboard-page"><main className="dash-main">Loading...</main></div>;
  if (!course) return <div className="dashboard-page"><main className="dash-main">Course not found</main></div>;

  return (
    <div className="dashboard-page">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="text-display font-bold tracking-tighter">MELODY.</span>
          <small>Conservatory dashboard</small>
        </div>
        <div className="sidebar-spotlight">
          <span className="sidebar-kicker">Selected program</span>
          <strong>{course?.title || 'Course details'}</strong>
          <p>Purchase unlocks every video, each related module question, and the final course certificate.</p>
        </div>
        <nav className="sidebar-nav">
          <a href="#" className="nav-item active" onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}>
            <span>01 / My Journey</span>
          </a>
          <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}>
            <span>02 / All Courses</span>
          </a>
        </nav>
      </aside>

      <main className="dash-main">
        <header className="dash-header">
          <Reveal>
            <div className="header-greet">
              <button ref={btnBack} className="nav-back magnetic" style={{ marginBottom: '24px', display: 'inline-flex' }} onClick={() => navigate('/dashboard')}>
                &larr; Back to Dashboard
              </button>
              <h1 className="text-serif tracking-tighter">{course.title}</h1>
              <p className="text-secondary">
                {course.description} Purchase the course once to unlock all lesson videos, complete each quiz checkpoint, and generate a final certificate for this musical path.
              </p>
            </div>
          </Reveal>
          <Reveal delay="0.1s">
            <div className="header-aside">
              <div className="summary-tile">
                <span>Instrument</span>
                <strong>{course.instrument}</strong>
              </div>
              <div className="summary-tile">
                <span>Lessons</span>
                <strong>{course.lessons?.length || 0}</strong>
              </div>
            </div>
          </Reveal>
        </header>

        <section className="course-detail-section">
          <div className="curriculum-list">
            <h2 className="text-serif" style={{ marginBottom: '20px' }}>Course Content</h2>
            <div className="lessons-container">
              {course.lessons?.map((lesson, index) => (
                <div key={lesson.id} className="lesson-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span className="lesson-order">{String(index + 1).padStart(2, '0')}</span>
                    <span style={{ fontWeight: 500 }}>{lesson.title}</span>
                  </div>
                  {course.isPurchased ? (
                    <button className="btn-text" onClick={() => navigate(`/course/${id}/${lesson.id}`)}>Watch</button>
                  ) : (
                    <span style={{ opacity: 0.35 }}>Locked</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <aside className="purchase-card" style={{ height: 'fit-content', position: 'sticky', top: '40px' }}>
            <img src={buildCourseArtwork(course)} alt={course.title} />
            <div className="price-tag">{course.isPurchased ? 'Already Owned' : `₹${course.price}`}</div>
            <p className="text-secondary" style={{ marginBottom: '16px' }}>
              {course.isPurchased
                ? 'This course is unlocked. Continue into the lesson player and keep building progress.'
                : 'Unlock every lesson video, module quiz, and the final completion certificate with a single purchase.'}
            </p>
            {course.isPurchased ? (
              <button className="btn-primary" style={{ width: '100%' }} onClick={() => navigate(`/course/${id}/${course.lessons[0]?.id}`)}>
                Continue Learning
              </button>
            ) : (
              <button ref={btnPurchase} className="btn-primary magnetic" style={{ width: '100%' }} onClick={handlePurchase} disabled={purchasing}>
                {purchasing ? 'Processing...' : 'Purchase Course'}
              </button>
            )}
            <div className="purchase-points">
              <span>Full lifetime access</span>
              <span>Interactive lesson quizzes</span>
              <span>Certificate of completion</span>
              <span>Use UPI or netbanking in Razorpay test mode for demo purchases</span>
            </div>
          </aside>
        </section>
      </main>

      <SuccessModal 
        isOpen={showSuccessModal} 
        onClose={() => setShowSuccessModal(false)}
        title="Purchase Confirmed"
        message="You have successfully purchased the course."
      />
    </div>
  );
};

export default Curriculum;
