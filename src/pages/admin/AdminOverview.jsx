import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Users, BookOpen, GraduationCap, DollarSign, ArrowRight } from 'lucide-react';
import Reveal from '../../components/Reveal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AdminOverview = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/overview`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const resData = await response.json();
      if (response.ok) {
        setData(resData);
      } else {
        setError(resData.message || 'Failed to fetch overview stats');
      }
    } catch (err) {
      console.error(err);
      setError('Connection to server failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading statistics...</div>;
  if (error) return <div style={{ color: 'var(--danger)', padding: '20px' }}>{error}</div>;

  const { stats, recentUsers, recentEnrollments, categoryDistribution } = data || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header className="admin-header">
        <Reveal>
          <div>
            <h1>Overview</h1>
            <p className="text-secondary">Real-time statistics, revenue, and active student signups across the white-labeled LMS.</p>
          </div>
        </Reveal>
      </header>

      {/* Stats Widgets */}
      <Reveal delay="0.1s">
        <div className="stats-grid">
          <div className="stat-card">
            <span>Total Courses</span>
            <strong>{stats?.totalCourses || 0}</strong>
          </div>
          <div className="stat-card">
            <span>Total Registered Users</span>
            <strong>{stats?.totalUsers || 0}</strong>
          </div>
          <div className="stat-card">
            <span>Active Enrollments</span>
            <strong>{stats?.totalEnrollments || 0}</strong>
          </div>
          <div className="stat-card" style={{ borderLeft: '4px solid var(--accent)' }}>
            <span>Total Revenue (INR)</span>
            <strong>₹{(stats?.totalRevenue || 0).toLocaleString('en-IN')}</strong>
          </div>
        </div>
      </Reveal>

      {/* Split Details */}
      <div className="manager-split">
        <Reveal delay="0.2s">
          <div className="admin-section">
            <h2 className="text-serif" style={{ fontSize: '24px', marginBottom: '18px' }}>Recent Enrollments</h2>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Email</th>
                    <th>Course Purchased</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEnrollments?.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', opacity: 0.5 }}>No enrollments recorded yet.</td>
                    </tr>
                  ) : (
                    recentEnrollments?.map((item, idx) => (
                      <tr key={idx}>
                        <td><strong>{item.first_name} {item.last_name}</strong></td>
                        <td>{item.email}</td>
                        <td style={{ color: 'var(--accent)' }}>{item.course_title}</td>
                        <td>{new Date(item.purchased_at).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>

        <Reveal delay="0.3s">
          <div className="admin-section">
            <h2 className="text-serif" style={{ fontSize: '24px', marginBottom: '18px' }}>Recent Registrations</h2>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers?.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <strong>{u.first_name} {u.last_name}</strong>
                        <div style={{ fontSize: '12px', opacity: 0.6 }}>{u.email}</div>
                      </td>
                      <td>
                        <span className={`admin-badge badge-${u.role}`}>{u.role}</span>
                      </td>
                      <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>
      </div>

      {/* Category distribution overview */}
      <Reveal delay="0.4s">
        <div className="admin-section">
          <h2 className="text-serif" style={{ fontSize: '24px', marginBottom: '18px' }}>Course Distribution by Category</h2>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            {categoryDistribution?.map((cat, index) => (
              <div key={index} style={{ padding: '16px 24px', borderRadius: '18px', background: 'rgba(255,255,255,0.7)', border: '1px solid var(--line-soft)', flex: '1', minWidth: '150px' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', fontWeight: 'bold' }}>{cat.category}</span>
                <strong style={{ fontSize: '28px', color: 'var(--accent)' }}>{cat.count} courses</strong>
              </div>
            ))}
            {categoryDistribution?.length === 0 && (
              <p style={{ opacity: 0.5 }}>No courses loaded in categories.</p>
            )}
          </div>
        </div>
      </Reveal>
    </div>
  );
};

export default AdminOverview;
