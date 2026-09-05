import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthCard from './components/AuthCard';
import EmployeesPage from './components/EmployeesPage';
import DepartmentList from './components/employees/DepartmentList';
import WorkingScheduleList from './components/employees/WorkingScheduleList';
import UserManagement from './components/admin/UserManagement';
import TimeOffPage from './components/TimeOffPage';
import AttendancePage from './components/AttendancePage';
import { getCurrentUser } from './api/auth';
import { UserRole } from './utils/rbac';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then((user) => setCurrentUser(user))
      .catch(() => setCurrentUser(null))
      .finally(() => setLoadingUser(false));
  }, []);

  return (
    <Router>
      <Routes>
        {/* Auth routes */}
        <Route path="/" element={<AuthCard />} />
        <Route path="/login" element={<AuthCard />} />

        {/* Employees Module */}
        <Route path="/dashboard" element={<EmployeesPage />} />
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="/departments" element={<DepartmentList />} />
        <Route path="/working-schedules" element={<WorkingScheduleList />} />

        {/* Admin User Management */}
        <Route 
          path="/admin/users" 
          element={<UserManagement />} 
        />

        {/* Attendance & Time Off */}
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/time-off" element={<TimeOffPage />} />
        <Route path="/time-off/*" element={<TimeOffPage />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
