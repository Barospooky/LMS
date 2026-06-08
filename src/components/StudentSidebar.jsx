import React from 'react';

const StudentSidebar = ({
  user,
  kicker = 'Student hub',
  title = 'My study',
  description = 'Track progress, resume active modules, and unlock certificates.',
  navItems = [],
}) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img
          src="https://amplepro.in/wp-content/uploads/2024/06/new-logo-ap.webp"
          alt="Amplepro Logo"
          className="brand-logo-img-small"
        />
      </div>
{/* 
      <div className="sidebar-spotlight">
        <span className="sidebar-kicker">{kicker}</span>
        <strong>{title}</strong>
        <p>{description}</p>
      </div> */}

      <div className="sidebar-scroll">
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`nav-item ${item.active ? 'active' : ''} ${item.className || ''}`.trim()}
              onClick={item.onClick}
              aria-current={item.active ? 'page' : undefined}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-text">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="sidebar-user">
        <div className="user-avatar">{user ? user.firstName.charAt(0) : 'U'}</div>
        <div className="user-info">
          <strong>{user ? `${user.firstName} ${user.lastName}` : 'User'}</strong>
          <small>{user?.role === 'admin' ? 'Administrator' : 'Premium Student'}</small>
        </div>
      </div>
    </aside>
  );
};

export default StudentSidebar;
