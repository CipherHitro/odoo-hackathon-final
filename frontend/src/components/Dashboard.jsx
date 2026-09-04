import React from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await fetch('/auth/logout', { method: 'POST' });
      navigate('/');
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  return (
    <div className="bg-waves">
      <div className="wave"></div>
      <div className="wave"></div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', width: '100%' }}>
        <div className="dashboard-container" style={{ margin: '2rem' }}>
          <div className="dashboard-header">
            <h2>Dashboard</h2>
            <button onClick={handleLogout} className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem 1rem' }}>
              Logout
            </button>
          </div>
          <div className="dashboard-content">
            <p>Welcome to the TechERP Dashboard! You have successfully authenticated.</p>
            <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
              This is a placeholder for the future dashboard implementation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
