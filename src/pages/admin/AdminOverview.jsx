import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  DollarSign,
  GraduationCap,
  TrendingUp,
  Users,
  BarChart3,
  PieChart,
} from 'lucide-react';
import Reveal from '../../components/Reveal';
import { formatCategoryLabel, formatInrCurrency } from '../../utils/category';
import { apiFetch } from '../../utils/apiClient';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const monthKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const buildLastSixMonths = () => {
  const series = [];
  const currentDate = new Date();

  for (let index = 5; index >= 0; index -= 1) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - index, 1);
    series.push({
      key: monthKey(date),
      label: MONTH_LABELS[date.getMonth()],
    });
  }

  return series;
};

const normalizeTrend = (rows = [], valueKey) => {
  const lookup = new Map(
    rows.map((row) => [
      row.month_start ? monthKey(new Date(row.month_start)) : row.month_key,
      Number(row[valueKey] || 0),
    ]),
  );

  return buildLastSixMonths().map((month) => ({
    label: month.label,
    value: lookup.get(month.key) || 0,
  }));
};

const buildPolylinePoints = (values, width = 320, height = 120, padding = 14) => {
  if (!values.length) return '';

  const maxValue = Math.max(...values, 1);
  const stepX = values.length > 1 ? (width - padding * 2) / (values.length - 1) : 0;

  return values
    .map((value, index) => {
      const x = padding + stepX * index;
      const y = height - padding - ((height - padding * 2) * value) / maxValue;
      return `${x},${y}`;
    })
    .join(' ');
};

const AdminOverview = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await apiFetch('/api/admin/overview');
      const responseData = await response.json();
      if (response.ok) {
        setData(responseData);
      } else {
        setError(responseData.message || 'Failed to fetch overview stats');
      }
    } catch (fetchError) {
      console.error(fetchError);
      setError('Connection to server failed');
    } finally {
      setLoading(false);
    }
  };

  const revenueTrend = useMemo(
    () => normalizeTrend(data?.revenueTrend, 'revenue'),
    [data?.revenueTrend],
  );

  const enrollmentTrend = useMemo(
    () => normalizeTrend(data?.enrollmentTrend, 'enrollments'),
    [data?.enrollmentTrend],
  );

  const topCourses = useMemo(
    () => (data?.topCourses || []).map((course) => ({
      ...course,
      enrollments: Number(course.enrollments || 0),
    })),
    [data?.topCourses],
  );

  if (loading) return <div>Loading statistics...</div>;
  if (error) return <div style={{ color: 'var(--danger)', padding: '20px' }}>{error}</div>;

  const { stats, recentUsers, recentEnrollments, categoryDistribution } = data || {};
  const revenuePoints = buildPolylinePoints(revenueTrend.map((item) => item.value));
  const maxEnrollmentValue = Math.max(...enrollmentTrend.map((item) => item.value), 1);
  const maxTopCourse = Math.max(...topCourses.map((course) => course.enrollments), 1);

  return (
    <div className="admin-overview-shell">
      <header className="admin-header">
        <Reveal>
          <div>
            <h1>Overview</h1>
            <p className="text-secondary">Real-time statistics, revenue, and active student signups across the white-labeled LMS.</p>
          </div>
        </Reveal>
      </header>

      <Reveal delay="0.1s">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-icon stat-icon-courses"><BookOpen size={16} /></span>
              <span>Total Courses</span>
            </div>
            <strong>{stats?.totalCourses || 0}</strong>
          </div>
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-icon stat-icon-users"><Users size={16} /></span>
              <span>Total Registered Users</span>
            </div>
            <strong>{stats?.totalUsers || 0}</strong>
          </div>
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-icon stat-icon-enrollments"><GraduationCap size={16} /></span>
              <span>Active Enrollments</span>
            </div>
            <strong>{stats?.totalEnrollments || 0}</strong>
          </div>
          <div className="stat-card stat-card-revenue">
            <div className="stat-card-header">
              <span className="stat-card-icon stat-icon-revenue"><DollarSign size={16} /></span>
              <span>Total Revenue (INR)</span>
            </div>
            <strong>{formatInrCurrency(stats?.totalRevenue || 0)}</strong>
          </div>
        </div>
      </Reveal>

      <div className="admin-analytics-grid">
        <Reveal delay="0.15s">
          <div className="admin-section analytics-card">
            <div className="analytics-header">
              <div>
                <h2 className="text-serif">Revenue Trend</h2>
                <p className="text-secondary">Revenue collected over the last 6 months.</p>
              </div>
              <TrendingUp size={18} />
            </div>
            <svg className="overview-chart" viewBox="0 0 320 140" role="img" aria-label="Revenue trend chart">
              <defs>
                <linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.03" />
                </linearGradient>
              </defs>
              <polyline
                points={revenuePoints}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polygon
                points={`14,126 ${revenuePoints} 306,126`}
                fill="url(#revenueFill)"
                opacity="0.9"
              />
            </svg>
            <div className="chart-axis">
              {revenueTrend.map((item) => (
                <span key={item.label}>{item.label}</span>
              ))}
            </div>
            <div className="analytics-summary-row">
              <strong>{formatInrCurrency(revenueTrend.reduce((sum, item) => sum + item.value, 0))}</strong>
              <span>6-month total</span>
            </div>
          </div>
        </Reveal>

        <Reveal delay="0.2s">
          <div className="admin-section analytics-card">
            <div className="analytics-header">
              <div>
                <h2 className="text-serif">Monthly Enrollments</h2>
                <p className="text-secondary">Enrollment volume across the same period.</p>
              </div>
              <BarChart3 size={18} />
            </div>
            <div className="chart-bars" role="img" aria-label="Monthly enrollment chart">
              {enrollmentTrend.map((item) => (
                  <div key={item.label} className="chart-bar-group">
                  <div className="chart-bar-track">
                    <div
                      className="chart-bar-fill chart-bar-enrollments"
                      style={{ height: `${Math.max(10, item.value ? (item.value / maxEnrollmentValue) * 100 : 10)}%` }}
                    />
                  </div>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
            <div className="analytics-summary-row">
              <strong>{enrollmentTrend.reduce((sum, item) => sum + item.value, 0)}</strong>
              <span>6-month total</span>
            </div>
          </div>
        </Reveal>
      </div>

      <div className="admin-analytics-grid admin-analytics-grid-bottom">
        <Reveal delay="0.25s">
          <div className="admin-section">
            <div className="analytics-header">
              <div>
                <h2 className="text-serif" style={{ fontSize: '24px', marginBottom: '4px' }}>Top Selling Courses</h2>
                <p className="text-secondary" style={{ margin: 0 }}>Most purchased courses across the platform.</p>
              </div>
              <PieChart size={18} />
            </div>
            <div className="top-course-list">
              {topCourses.length === 0 ? (
                <p style={{ opacity: 0.5 }}>No course sales recorded yet.</p>
              ) : (
                topCourses.map((course, index) => (
                  <div key={course.id} className="top-course-item">
                    <div className="top-course-rank">{index + 1}</div>
                    <div className="top-course-copy">
                      <strong>{course.title}</strong>
                      <span>{course.enrollments} enrollments</span>
                    </div>
                    <div className="top-course-meter">
                      <div
                        className="top-course-meter-fill"
                        style={{ width: `${Math.max(12, (course.enrollments / maxTopCourse) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Reveal>

        <Reveal delay="0.3s">
          <div className="admin-section">
            <h2 className="text-serif" style={{ fontSize: '24px', marginBottom: '18px' }}>Course Distribution by Category</h2>
            <div className="category-distribution-grid">
              {categoryDistribution?.map((cat, index) => (
                <div key={index} className="category-distribution-card">
                  <span>{formatCategoryLabel(cat.category)}</span>
                  <strong>{cat.count} courses</strong>
                </div>
              ))}
              {categoryDistribution?.length === 0 && (
                <p style={{ opacity: 0.5 }}>No courses loaded in categories.</p>
              )}
            </div>
          </div>
        </Reveal>
      </div>

      <div className="manager-split manager-split-overview">
        <Reveal delay="0.35s">
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
                    recentEnrollments?.map((item, index) => (
                      <tr key={index}>
                        <td><strong>{item.first_name} {item.last_name}</strong></td>
                        <td>{item.email}</td>
                        <td className="nowrap-cell" style={{ color: 'var(--accent)' }}>{item.course_title}</td>
                        <td>{new Date(item.purchased_at).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>

        <Reveal delay="0.4s">
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
    </div>
  );
};

export default AdminOverview;
