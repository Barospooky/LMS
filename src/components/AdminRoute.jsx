import React from 'react';
import { Navigate } from 'react-router-dom';

const AdminRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  let user = null;

  try {
    if (userStr) {
      user = JSON.parse(userStr);
    }
  } catch (e) {
    console.error('Error parsing user from localStorage', e);
  }

  if (!token || !user || user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default AdminRoute;
