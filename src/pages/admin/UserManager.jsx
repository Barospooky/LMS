import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Reveal from '../../components/Reveal';
import useAuth from '../../hooks/useAuth';
import { apiFetch } from '../../utils/apiClient';

const UserManager = () => {
  const [updatingId, setUpdatingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, setUser } = useAuth();
  const queryClient = useQueryClient();

  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const response = await apiFetch('/api/admin/users');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch users');
      }
      return data;
    },
    enabled: Boolean(user),
  });

  const roleMutation = useMutation({
    mutationFn: async ({ userId, newRole }) => {
      const response = await apiFetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update user role');
      }
      return { userId, newRole, data };
    },
    onMutate: ({ userId }) => {
      setUpdatingId(userId);
    },
    onSuccess: async ({ userId, newRole }) => {
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      if (user?.id === userId) {
        setUser({ ...user, role: newRole });
      }
    },
    onError: (err) => {
      alert(err.message || 'Error updating user role');
    },
    onSettled: () => {
      setUpdatingId(null);
    },
  });

  const handleRoleChange = async (userId, newRole) => {
    roleMutation.mutate({ userId, newRole });
  };

  const users = usersQuery.data || [];

  const filteredUsers = users.filter(u => {
    const fullName = `${u.first_name} ${u.last_name}`.toLowerCase();
    const email = u.email.toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || email.includes(query) || u.role.includes(query);
  });

  if (usersQuery.isLoading) return <div>Loading users...</div>;
  if (usersQuery.isError) return <div style={{ color: 'var(--danger)', padding: '20px' }}>{usersQuery.error?.message || 'Error loading users'}</div>;

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
