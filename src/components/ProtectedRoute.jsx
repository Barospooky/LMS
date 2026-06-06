import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import API_URL from '../utils/apiClient';

const ProtectedRoute = ({ children }) => {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    let cancelled = false;

    const verifySession = async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          credentials: 'include',
        });

        if (!cancelled) {
          setStatus(response.ok ? 'ok' : 'blocked');
        }
      } catch (error) {
        if (!cancelled) {
          setStatus('blocked');
        }
      }
    };

    verifySession();

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === 'checking') {
    return null;
  }

  if (status === 'blocked') {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
