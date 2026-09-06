import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, PublicRoute } from './components/common/AuthRoutes';
import AuthCard from './components/AuthCard';
import EmployeesPage from './components/EmployeesPage';
import DepartmentList from './components/employees/DepartmentList';
import WorkingScheduleList from './components/employees/WorkingScheduleList';
import ContractsPage from './components/contracts/ContractsPage';
import SalaryStructureList from './components/contracts/SalaryStructureList';
import UserManagement from './components/admin/UserManagement';
import TimeOffPage from './components/TimeOffPage';
import AttendancePage from './components/AttendancePage';
import PayrollPage from './components/PayrollPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Auth routes: redirect to /dashboard if already logged in */}
          <Route path="/" element={<PublicRoute><AuthCard /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><AuthCard /></PublicRoute>} />

          {/* Protected Employees Module */}
          <Route path="/dashboard" element={<ProtectedRoute><EmployeesPage /></ProtectedRoute>} />
          <Route path="/employees" element={<ProtectedRoute><EmployeesPage /></ProtectedRoute>} />
          <Route path="/departments" element={<ProtectedRoute><DepartmentList /></ProtectedRoute>} />
          <Route path="/working-schedules" element={<ProtectedRoute><WorkingScheduleList /></ProtectedRoute>} />

          {/* Protected Admin User Management */}
          <Route path="/admin/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />

          {/* Protected Contracts Module */}
          <Route path="/contracts" element={<ProtectedRoute><ContractsPage /></ProtectedRoute>} />
          <Route path="/salary-structures" element={<ProtectedRoute><SalaryStructureList /></ProtectedRoute>} />

          {/* Protected Attendance & Time Off */}
          <Route path="/attendance" element={<ProtectedRoute><AttendancePage /></ProtectedRoute>} />
          <Route path="/time-off" element={<ProtectedRoute><TimeOffPage /></ProtectedRoute>} />
          <Route path="/time-off/requests" element={<ProtectedRoute><TimeOffPage /></ProtectedRoute>} />
          <Route path="/time-off/allocations" element={<ProtectedRoute><TimeOffPage /></ProtectedRoute>} />
          <Route path="/time-off/types" element={<ProtectedRoute><TimeOffPage /></ProtectedRoute>} />
          <Route path="/time-off/*" element={<ProtectedRoute><TimeOffPage /></ProtectedRoute>} />

          {/* Protected Payroll Module */}
          <Route path="/payroll" element={<ProtectedRoute><PayrollPage /></ProtectedRoute>} />
          <Route path="/payroll/dashboard" element={<ProtectedRoute><PayrollPage /></ProtectedRoute>} />
          <Route path="/payroll/payruns" element={<ProtectedRoute><PayrollPage /></ProtectedRoute>} />
          <Route path="/payroll/payslips" element={<ProtectedRoute><PayrollPage /></ProtectedRoute>} />
          <Route path="/payroll/structures" element={<ProtectedRoute><PayrollPage /></ProtectedRoute>} />
          <Route path="/payroll/rules" element={<ProtectedRoute><PayrollPage /></ProtectedRoute>} />
          <Route path="/payroll/*" element={<ProtectedRoute><PayrollPage /></ProtectedRoute>} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

