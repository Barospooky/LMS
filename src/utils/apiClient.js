const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AUTH_ENDPOINTS = new Set([
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/google',
  '/api/auth/forgot-password',
  '/api/auth/validate-token',
  '/api/auth/reset-password',
  '/api/auth/refresh',
  '/api/auth/logout',
]);

const refreshSession = async () => {
  try {
    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    return response.ok;
  } catch (error) {
    return false;
  }
};

export const apiFetch = async (path, options = {}, { retryOn401 = true } = {}) => {
  const url = path.startsWith('http') ? path : `${API_URL}${path}`;
  const headers = new Headers(options.headers || {});

  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status !== 401 || !retryOn401 || AUTH_ENDPOINTS.has(path)) {
    return response;
  }

  const refreshed = await refreshSession();
  if (!refreshed) {
    clearStoredUser();
    return response;
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
};

export const clearStoredUser = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  window.dispatchEvent(new Event('auth:session-expired'));
};

export default API_URL;
