import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import API_URL from '../utils/apiClient';

const RoleRoute = ({ children, allowedRoles = [] }) => {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    let cancelled = false;

    const verifySession = async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          credentials: 'include',
        });

        if (!response.ok) {
          if (!cancelled) setStatus('blocked');
          return;
        }

        const data = await response.json();
        const hasAccess = allowedRoles.includes(data?.user?.role);

        if (!cancelled) {
          setStatus(hasAccess ? 'ok' : 'blocked');
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
  }, [allowedRoles]);

  if (status === 'checking') {
    return null;
  }

  if (status === 'blocked') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default RoleRoute;
