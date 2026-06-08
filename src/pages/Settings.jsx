import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  BookOpenCheck,
  Compass,
  FolderOpen,
  Globe2,
  LayoutDashboard,
  LogOut,
  Settings as SettingsIcon,
  Users,
} from 'lucide-react';
import '../styles/main.css';
import '../styles/dashboard.css';
import Reveal from '../components/Reveal';
import StudentSidebar from '../components/StudentSidebar';
import { apiFetch } from '../utils/apiClient';

const Settings = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bio: '',
    emailUpdates: true,
    courseReminders: true,
    productNews: false,
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) return;

    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
    setForm({
      firstName: parsedUser.firstName || '',
      lastName: parsedUser.lastName || '',
      email: parsedUser.email || '',
      phone: parsedUser.phone || '',
      bio: parsedUser.bio || '',
      emailUpdates: parsedUser.preferences?.emailUpdates ?? true,
      courseReminders: parsedUser.preferences?.courseReminders ?? true,
      productNews: parsedUser.preferences?.productNews ?? false,
    });
  }, []);

  const handleLogout = () => {
    apiFetch('/api/auth/logout', { method: 'POST' }, { retryOn401: false }).catch(() => {});
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setMessage('');
  };

  const handleSave = () => {
    const updatedUser = {
      ...user,
      firstName: form.firstName.trim() || user?.firstName || 'User',
      lastName: form.lastName.trim() || user?.lastName || '',
      email: form.email.trim() || user?.email || '',
      phone: form.phone.trim(),
      bio: form.bio.trim(),
      preferences: {
        emailUpdates: form.emailUpdates,
        courseReminders: form.courseReminders,
        productNews: form.productNews,
      },
    };

    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setMessage('Profile and preferences saved on this device.');
  };

  const handleReset = () => {
    if (!user) return;

    setForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: user.phone || '',
      bio: user.bio || '',
      emailUpdates: user.preferences?.emailUpdates ?? true,
      courseReminders: user.preferences?.courseReminders ?? true,
      productNews: user.preferences?.productNews ?? false,
    });
    setMessage('Changes reset to your saved profile.');
  };

  const navItems = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard size={16} />,
      onClick: () => navigate('/dashboard'),
    },
    {
      key: 'my-courses',
      label: 'My Courses',
      icon: <BookOpenCheck size={16} />,
      onClick: () => navigate('/dashboard', { state: { scrollTo: 'my-courses' } }),
    },
    {
      key: 'catalog',
      label: 'Catalog',
      icon: <Compass size={16} />,
      onClick: () => navigate('/dashboard', { state: { scrollTo: 'catalog' } }),
    },
    {
      key: 'progress',
      label: 'Progress',
      icon: <BarChart3 size={16} />,
      onClick: () => navigate('/dashboard', { state: { scrollTo: 'progress' } }),
    },
    {
      key: 'resources',
      label: 'Resources',
      icon: <FolderOpen size={16} />,
      onClick: () => navigate('/dashboard', { state: { scrollTo: 'resources' } }),
    },
    {
      key: 'community',
      label: 'Community',
      icon: <Users size={16} />,
      onClick: () => navigate('/dashboard', { state: { scrollTo: 'community' } }),
    },
    {
      key: 'settings',
      label: 'Settings',
      icon: <SettingsIcon size={16} />,
      active: true,
      onClick: () => navigate('/settings'),
    },
    ...(user?.role === 'admin'
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
        navItems={navItems}
      />

      <main className="dash-main">
        <section className="settings-section">
          <Reveal>
            <div className="section-header section-header-stack">
              <div>
                <div className="section-label">Account Settings</div>
                <h2 className="text-serif">Profile and preferences.</h2>
              </div>
              <p>Use this area for the details a student normally expects to manage themselves: name, contact details, a short bio, and notification choices.</p>
            </div>
          </Reveal>

          <div className="settings-grid">
            <Reveal delay="0.05s">
              <div className="settings-panel settings-panel-profile">
                <div className="settings-panel-header">
                  <div>
                    <div className="section-label">Profile</div>
                    <h3 className="text-serif">Edit your account details</h3>
                  </div>
                  <div className="settings-avatar-large">
                    {form.firstName?.charAt(0) || user?.firstName?.charAt(0) || 'U'}
                  </div>
                </div>

                <div className="settings-form-grid">
                  <label className="settings-field">
                    <span>First name</span>
                    <input type="text" value={form.firstName} onChange={(e) => handleChange('firstName', e.target.value)} />
                  </label>
                  <label className="settings-field">
                    <span>Last name</span>
                    <input type="text" value={form.lastName} onChange={(e) => handleChange('lastName', e.target.value)} />
                  </label>
                  <label className="settings-field settings-field-wide">
                    <span>Email address</span>
                    <input type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} />
                  </label>
                  <label className="settings-field settings-field-wide">
                    <span>Phone number</span>
                    <input type="tel" value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} />
                  </label>
                  <label className="settings-field settings-field-wide">
                    <span>Bio</span>
                    <textarea rows="4" value={form.bio} onChange={(e) => handleChange('bio', e.target.value)} />
                  </label>
                </div>
              </div>
            </Reveal>

            <Reveal delay="0.1s">
              <div className="settings-panel">
                <div className="settings-panel-header">
                  <div>
                    <div className="section-label">Preferences</div>
                    <h3 className="text-serif">Notifications and learning updates</h3>
                  </div>
                </div>

                <div className="settings-toggle-list">
                  <label className="settings-toggle">
                    <div>
                      <strong>Email updates</strong>
                      <p>Receive course reminders, completion alerts, and platform emails.</p>
                    </div>
                    <input type="checkbox" checked={form.emailUpdates} onChange={(e) => handleChange('emailUpdates', e.target.checked)} />
                  </label>
                  <label className="settings-toggle">
                    <div>
                      <strong>Course reminders</strong>
                      <p>Get nudges when a lesson or quiz is waiting for you.</p>
                    </div>
                    <input type="checkbox" checked={form.courseReminders} onChange={(e) => handleChange('courseReminders', e.target.checked)} />
                  </label>
                  <label className="settings-toggle">
                    <div>
                      <strong>Product news</strong>
                      <p>Hear about new modules, releases, and LMS improvements.</p>
                    </div>
                    <input type="checkbox" checked={form.productNews} onChange={(e) => handleChange('productNews', e.target.checked)} />
                  </label>
                </div>

                <div className="settings-meta-card">
                  <strong>What this saves</strong>
                  <p>These values update the current user in browser storage so the sidebar and dashboard can reflect your profile immediately.</p>
                </div>

                {message && <div className="settings-status">{message}</div>}

                <div className="settings-actions">
                  <button type="button" className="btn-primary" onClick={handleSave}>
                    Save Changes
                  </button>
                  <button type="button" className="btn-outline" onClick={handleReset}>
                    Reset
                  </button>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Settings;
