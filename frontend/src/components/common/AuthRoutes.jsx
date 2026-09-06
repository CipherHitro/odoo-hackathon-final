import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ServerErrorScreen from './ServerErrorScreen';
import { RefreshCw } from 'lucide-react';

export const ProtectedRoute = ({ children }) => {
  const { currentUser, loading, serverError, checkAuth } = useAuth();
  const location = useLocation();

  if (serverError) {
    return <ServerErrorScreen message={serverError} onRetry={checkAuth} />;
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        backgroundColor: 'var(--bg, #f8fafc)',
      }}>
        <RefreshCw size={26} className="spin" style={{ color: '#6366f1' }} />
        <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>
          Verifying authentication session…
        </span>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export const PublicRoute = ({ children }) => {
  const { currentUser, loading, serverError, checkAuth } = useAuth();
  const location = useLocation();

  if (serverError) {
    return <ServerErrorScreen message={serverError} onRetry={checkAuth} />;
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        backgroundColor: 'var(--bg, #f8fafc)',
      }}>
        <RefreshCw size={26} className="spin" style={{ color: '#6366f1' }} />
        <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>
          Checking authentication session…
        </span>
      </div>
    );
  }

  if (currentUser) {
    // Redirect authenticated user to their target or default dashboard
    const from = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  return children;
};
