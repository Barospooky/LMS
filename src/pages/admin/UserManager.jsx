import React, { useEffect, useState } from 'react';
import Reveal from '../../components/Reveal';
import { apiFetch } from '../../utils/apiClient';

const UserManager = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await apiFetch('/api/admin/users');
      const data = await response.json();
      if (response.ok) {
        setUsers(data);
      } else {
        setError(data.message || 'Failed to fetch users');
      }
    } catch (err) {
      console.error(err);
      setError('Connection to server failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingId(userId);
    try {
      const response = await apiFetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await response.json();
      if (response.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        if (storedUser.id === userId) {
          storedUser.role = newRole;
          localStorage.setItem('user', JSON.stringify(storedUser));
        }
      } else {
        alert(data.message || 'Failed to update user role');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating user role');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = users.filter(u => {
    const fullName = `${u.first_name} ${u.last_name}`.toLowerCase();
    const email = u.email.toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || email.includes(query) || u.role.includes(query);
  });

  if (loading) return <div>Loading users...</div>;
  if (error) return <div style={{ color: 'var(--danger)', padding: '20px' }}>{error}</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header className="admin-header">
        <Reveal>
          <div>
            <h1>User Manager</h1>
            <p className="text-secondary">View registered student accounts, assign administrative privileges, or edit instructor roles.</p>
          </div>
        </Reveal>
      </header>

      <Reveal delay="0.1s">
        <div className="admin-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px' }}>
            <input
              type="text"
              placeholder="Filter by name, email, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-input"
              style={{ flex: 1, maxWidth: '400px' }}
            />
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Showing {filteredUsers.length} of {users.length} users</span>
          </div>

          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th style={{ minWidth: '120px' }}>Auth Provider</th>
                  <th>Date Joined</th>
                  <th>Role</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', opacity: 0.5 }}>No matching users found.</td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id}>
                      <td>{u.id}</td>
                      <td><strong>{u.first_name} {u.last_name}</strong></td>
                      <td title={u.email} style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</td>
                      <td style={{ textTransform: 'uppercase', fontSize: '12px', minWidth: '120px' }}>{u.auth_provider || 'local'}</td>
                      <td>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td>
                        <span className={`admin-badge badge-${u.role}`}>{u.role}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {updatingId === u.id ? (
                          <span style={{ fontSize: '13px', opacity: 0.6 }}>Saving...</span>
                        ) : (
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            className="admin-select"
                            style={{ padding: '6px 12px', fontSize: '13px', borderRadius: '12px' }}
                          >
                            <option value="student">Student</option>
                            <option value="instructor">Instructor</option>
                            <option value="admin">Administrator</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>
    </div>
  );
};

export default UserManager;
