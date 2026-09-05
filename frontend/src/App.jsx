import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthCard from './components/AuthCard';
import EmployeesPage from './components/EmployeesPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AuthCard />} />
        <Route path="/dashboard" element={<EmployeesPage />} />
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
