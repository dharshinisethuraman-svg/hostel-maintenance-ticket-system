import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, TOKEN_KEY } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * On initial load or page refresh:
   * Checks if a token exists in localStorage and verifies it with GET /auth/me.
   * If valid, restores the user session; if expired/invalid, cleans up safely without loops.
   */
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      const storedToken = authAPI.getToken();
      if (!storedToken) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const userData = await authAPI.getMe();
        if (isMounted) {
          setUser(userData);
          setToken(storedToken);
        }
      } catch (err) {
        // Token expired or invalid: remove and reset cleanly
        authAPI.removeToken();
        if (isMounted) {
          setUser(null);
          setToken(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    restoreSession();

    // Listen for unauthorized events emitted by the Axios response interceptor
    const handleUnauthorized = () => {
      if (isMounted) {
        setUser(null);
        setToken(null);
      }
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      isMounted = false;
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  /**
   * Log in user
   * Calls POST /auth/login and stores session on success.
   */
  const login = useCallback(async (email, password) => {
    setError(null);
    try {
      const data = await authAPI.login(email, password);
      authAPI.setToken(data.access_token);
      setToken(data.access_token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      const message = err.response?.data?.detail || 'Invalid email or password';
      setError(message);
      throw new Error(message);
    }
  }, []);

  /**
   * Public Student Registration
   * Calls POST /auth/register.
   * By system design, the backend always forces role = 'student'.
   */
  const register = useCallback(async (name, email, password) => {
    setError(null);
    try {
      const newUser = await authAPI.register(name, email, password);
      return newUser;
    } catch (err) {
      const message = err.response?.data?.detail || 'Registration failed';
      setError(message);
      throw new Error(message);
    }
  }, []);

  /**
   * Logout user
   * Removes token from localStorage and resets state.
   */
  const logout = useCallback(() => {
    authAPI.removeToken();
    setUser(null);
    setToken(null);
    setError(null);
  }, []);

  const value = {
    user,
    token,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated: Boolean(user && token),
    isStudent: user?.role === 'student',
    isStaff: user?.role === 'staff',
    isAdmin: user?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Custom hook to consume the AuthContext safely.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
