import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../api/auth';
import Navbar from './Navbar';

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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--neutral-50)' }}>
        <p style={{ color: 'var(--neutral-600)', fontSize: 'var(--text-base)' }}>Loading workspace...</p>
      </div>
    );
  }

  return (
    <div className="app-layout-shell">
      <Navbar activeModule="employees" />
      <main className="app-layout-main">
        <div style={{
          background: 'var(--neutral-0)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--neutral-200)',
          boxShadow: 'var(--shadow-sm)',
          padding: '32px',
          marginTop: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--neutral-900)', margin: 0 }}>
                Employees Overview
              </h1>
              <p style={{ color: 'var(--neutral-600)', fontSize: 'var(--text-sm)', marginTop: '4px', margin: 0 }}>
                Manage team directory, department assignments, and working schedules.
              </p>
            </div>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              backgroundColor: 'var(--color-primary-light)',
              color: 'var(--color-primary)'
            }}>
              Active Module: Employees
            </span>
          </div>

          <div style={{
            padding: '24px',
            backgroundColor: 'var(--neutral-50)',
            border: '1px dashed var(--neutral-300)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--neutral-600)',
            fontSize: 'var(--text-sm)',
            lineHeight: '22px'
          }}>
            <p style={{ margin: 0 }}>
              The <strong>Navbar</strong> is now ready and active. It features:
            </p>
            <ul style={{ margin: '10px 0 0 20px', padding: 0 }}>
              <li><strong>HR Monogram Badge:</strong> Quick home button.</li>
              <li><strong>Dropdown Menus:</strong> Employees ▾, Contracts ▾, Time Off ▾ with direct route links.</li>
              <li><strong>Direct Tabs:</strong> Attendance and Payroll.</li>
              <li><strong>Attendance Indicator:</strong> Red box status widget (matching wireframe) with one-click check-in/check-out toggle.</li>
              <li><strong>User Avatar Menu:</strong> Profile initials, user details, and logout.</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

