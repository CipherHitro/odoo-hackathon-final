import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthCard from './components/AuthCard';
import EmployeesPage from './components/EmployeesPage';
import DepartmentsPage from './components/DepartmentsPage';
import WorkingSchedulesPage from './components/WorkingSchedulesPage';
import TimeOffPage from './components/TimeOffPage';
import AttendancePage from './components/AttendancePage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AuthCard />} />
        <Route path="/dashboard" element={<EmployeesPage />} />
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="/departments" element={<DepartmentsPage />} />
        <Route path="/working-schedules" element={<WorkingSchedulesPage />} />
        <Route path="/time-off" element={<TimeOffPage />} />
        <Route path="/time-off/*" element={<TimeOffPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
