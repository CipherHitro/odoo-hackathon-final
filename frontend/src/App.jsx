import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AuthCard from './components/AuthCard';
import Dashboard from './components/Dashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AuthCard />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
