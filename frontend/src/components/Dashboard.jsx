import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logoutUser } from '../api/auth';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (err) {
        console.error('Failed to fetch user', err);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUser();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate('/');
    } catch (err) {
      console.error('Logout failed', err);
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="bg-waves" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <p style={{ color: 'var(--text-primary)', fontSize: '1.2rem' }}>Loading...</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-waves">
        <div className="wave"></div>
        <div className="wave"></div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', width: '100%' }}>
        <div className="dashboard-container" style={{ margin: '2rem' }}>
          <div className="dashboard-header">
            <h2>Dashboard</h2>
            <button onClick={handleLogout} className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem 1rem' }}>
              Logout
            </button>
          </div>
          <div className="dashboard-content">
            <p>Welcome, <strong>{user?.name}</strong>! You have successfully authenticated.</p>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Email: {user?.email}
            </p>
            <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
              This is a placeholder for the future dashboard implementation.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
