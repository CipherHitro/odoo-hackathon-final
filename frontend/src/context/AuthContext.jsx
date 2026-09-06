import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCurrentUser, loginUser as apiLoginUser, logoutUser as apiLogoutUser } from '../api/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState(null);

  const checkAuth = useCallback(async () => {
    setLoading(true);
    setServerError(null);
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
      setServerError(null);
      return { success: true, user };
    } catch (err) {
      if (
        err.status === 401 ||
        err.message?.toLowerCase().includes('authenticated') ||
        err.message?.toLowerCase().includes('token')
      ) {
        // User is not logged in / session expired
        setCurrentUser(null);
        setServerError(null);
        return { success: false, reason: 'unauthenticated' };
      } else {
        // Network error / connection refused / backend server offline
        setCurrentUser(null);
        setServerError(
          err.message || 'Unable to connect to backend server. Please verify the backend service is running.'
        );
        return { success: false, reason: 'server_error', error: err };
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (credentials) => {
    const res = await apiLoginUser(credentials);
    await checkAuth();
    return res;
  };

  const logout = async () => {
    try {
      await apiLogoutUser();
    } catch {
      // Ignore
    } finally {
      setCurrentUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        serverError,
        checkAuth,
        login,
        logout,
        setCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
