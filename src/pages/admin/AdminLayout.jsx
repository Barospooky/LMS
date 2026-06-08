import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Users, LogOut, ArrowLeft } from 'lucide-react';
import './admin.css';
import { apiFetch } from '../../utils/apiClient';

const AdminLayout = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogout = () => {
    apiFetch('/api/auth/logout', { method: 'POST' }, { retryOn401: false }).catch(() => {});
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <img 
            src="https://amplepro.in/wp-content/uploads/2024/06/new-logo-ap.webp" 
            alt="Amplepro Logo" 
            className="brand-logo-img-small"
          />
        </div>
        
        <nav className="admin-sidebar-nav">
          <NavLink to={user?.role === 'instructor' ? '/instructor/overview' : '/admin/overview'} className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={18} />
            <span>Overview</span>
          </NavLink>
          <NavLink to={user?.role === 'instructor' ? '/instructor/courses' : '/admin/courses'} className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
            <BookOpen size={18} />
            <span>Course Manager</span>
          </NavLink>
          {user?.role === 'admin' && (
            <NavLink to="/admin/users" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
              <Users size={18} />
              <span>User Manager</span>
            </NavLink>
          )}
          
          <button
            onClick={() => navigate('/dashboard')}
            className="admin-nav-item"
            style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', marginTop: 'auto' }}
          >
            <ArrowLeft size={18} />
            <span>Student Dashboard</span>
          </button>
          
          <button
            onClick={handleLogout}
            className="admin-nav-item"
            style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </nav>

        <div className="sidebar-user" style={{ borderTop: '1px solid rgba(255, 248, 241, 0.12)', paddingTop: '20px', marginTop: '20px' }}>
          <div className="user-avatar" style={{ background: 'linear-gradient(145deg, var(--danger), var(--accent))' }}>
            {user ? user.firstName.charAt(0) : 'A'}
          </div>
          <div className="user-info">
            <strong>{user ? `${user.firstName} ${user.lastName}` : 'Admin'}</strong>
            <small style={{ color: 'var(--danger)', fontWeight: 'bold', textTransform: 'capitalize' }}>
              {user?.role || 'Administrator'}
            </small>
          </div>
        </div>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
