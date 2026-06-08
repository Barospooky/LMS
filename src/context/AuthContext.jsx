import React, { createContext, useEffect, useMemo, useReducer } from 'react';
import { apiFetch, clearStoredUser } from '../utils/apiClient';

const AuthContext = createContext(null);

const initialState = {
  user: null,
  status: 'loading',
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'HYDRATE':
      return {
        user: action.payload,
        status: 'authenticated',
      };
    case 'SET_LOADING':
      return {
        ...state,
        status: 'loading',
      };
    case 'SET_USER':
      return {
        user: action.payload,
        status: action.payload ? 'authenticated' : 'anonymous',
      };
    case 'CLEAR_USER':
      return {
        user: null,
        status: 'anonymous',
      };
    default:
      return state;
  }
};

const persistUser = (user) => {
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
  } else {
    localStorage.removeItem('user');
  }
};

const fetchCurrentUser = async () => {
  const response = await apiFetch('/api/auth/me');
  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.user || null;
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    let cancelled = false;

    const bootstrapAuth = async () => {
      dispatch({ type: 'SET_LOADING' });

      try {
        const cachedUser = localStorage.getItem('user');
        if (cachedUser && !cancelled) {
          dispatch({ type: 'HYDRATE', payload: JSON.parse(cachedUser) });
        }

        const currentUser = await fetchCurrentUser();
        if (cancelled) return;

        if (currentUser) {
          persistUser(currentUser);
          dispatch({ type: 'SET_USER', payload: currentUser });
        } else {
          persistUser(null);
          dispatch({ type: 'CLEAR_USER' });
        }
      } catch (error) {
        if (!cancelled) {
          persistUser(null);
          dispatch({ type: 'CLEAR_USER' });
        }
      }
    };

    bootstrapAuth();

    const handleSessionExpired = () => {
      persistUser(null);
      dispatch({ type: 'CLEAR_USER' });
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);

    return () => {
      cancelled = true;
      window.removeEventListener('auth:session-expired', handleSessionExpired);
    };
  }, []);

  const setUser = (user) => {
    persistUser(user);
    dispatch({ type: 'SET_USER', payload: user });
  };

  const clearAuth = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' }, { retryOn401: false });
    } catch (error) {
      // ignore logout transport failures
    } finally {
      clearStoredUser();
      dispatch({ type: 'CLEAR_USER' });
    }
  };

  const login = async (payload) => {
    const response = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, { retryOn401: false });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    setUser(data.user);
    return data.user;
  };

  const signup = async (payload) => {
    const response = await apiFetch('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, { retryOn401: false });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Signup failed');
    }

    setUser(data.user);
    return data.user;
  };

  const googleLogin = async (credential) => {
    const response = await apiFetch('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    }, { retryOn401: false });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Google login failed');
    }

    setUser(data.user);
    return data.user;
  };

  const updateProfile = async (payload) => {
    const response = await apiFetch('/api/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Profile update failed');
    }

    setUser(data.user);
    return data.user;
  };

  const value = useMemo(() => ({
    user: state.user,
    isLoading: state.status === 'loading',
    isAuthenticated: state.status === 'authenticated' && Boolean(state.user),
    setUser,
    clearAuth,
    login,
    signup,
    googleLogin,
    updateProfile,
    refreshUser: async () => {
      const currentUser = await fetchCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      }
      return currentUser;
    },
  }), [state.user, state.status]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => React.useContext(AuthContext);

export default AuthContext;
