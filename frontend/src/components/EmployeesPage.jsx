import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  LayoutGrid, 
  List as ListIcon, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  Clock,
  Calendar,
  FileText,
  Info
} from 'lucide-react';
import AppLayout from './AppLayout';
import EmployeeCard from './employees/EmployeeCard';
import EmployeeList from './employees/EmployeeList';
import EmployeeDetail from './employees/EmployeeDetail';
import { getEmployees, getEmployeeById, getDepartments, getWorkingSchedules } from '../api/employees';
import { getCurrentUser } from '../api/auth';
import { canManageEmployees } from '../utils/rbac';

const EmployeesPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'list'
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successToast, setSuccessToast] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [empData, deptData, schData, me] = await Promise.all([
        getEmployees(),
        getDepartments(),
        getWorkingSchedules().catch(() => []),
        getCurrentUser().catch(() => null),
      ]);
      setEmployees(empData || []);
      setDepartments(deptData || []);
      setSchedules(schData || []);
      setCurrentUser(me);
    } catch (err) {
      console.error('Failed to load employee data:', err);
      setError(err.message || 'Error fetching employees from database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectEmployee = (emp) => {
    if (emp === 'new') {
      setSearchParams({ action: 'new' });
    } else {
      setSearchParams({ id: String(emp.id) });
    }
  };

  const handleBackToDirectory = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      setSearchParams({});
    }
  };

  useEffect(() => {
    const empId = searchParams.get('id');
    const action = searchParams.get('action');

    if (action === 'new') {
      setSelectedEmployee('new');
    } else if (empId) {
      const found = employees.find(e => String(e.id) === String(empId));
      if (found) {
        setSelectedEmployee(found);
      } else {
        getEmployeeById(empId)
          .then((emp) => setSelectedEmployee(emp))
          .catch(() => setSelectedEmployee(null));
      }
    } else {
      setSelectedEmployee(null);
    }
  }, [searchParams, employees]);

  const deptMap = Object.fromEntries(departments.map(d => [d.id, d.name]));
  const getDeptName = (deptId, fallback) => deptMap[deptId] || fallback || 'General';

  // Department token color mapping
  const getDeptColor = (deptName) => {
    if (!deptName) return 'var(--ink)';
    const lower = deptName.toLowerCase();
    if (lower.includes('finance') || lower.includes('account')) return 'var(--sky)';
    if (lower.includes('hr') || lower.includes('human') || lower.includes('recruit')) return 'var(--coral)';
    if (lower.includes('eng') || lower.includes('tech') || lower.includes('dev') || lower.includes('software')) return 'var(--ink)';
    if (lower.includes('sale') || lower.includes('market') || lower.includes('business')) return 'var(--warning)';
    if (lower.includes('support') || lower.includes('operat') || lower.includes('customer')) return 'var(--success)';
    return 'var(--coral)';
  };

  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const filteredEmployees = employees.filter((emp) => {
    if ((emp.status || '').toLowerCase() === 'archived') return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const deptName = getDeptName(emp.department_id, emp.department_name);
    return (
      (emp.name && emp.name.toLowerCase().includes(term)) ||
      (emp.work_email && emp.work_email.toLowerCase().includes(term)) ||
      (emp.job_position && emp.job_position.toLowerCase().includes(term)) ||
      (deptName && deptName.toLowerCase().includes(term))
    );
  });

  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleSavedEmployee = async () => {
    await loadData();
    showToast('Employee profile synchronized successfully.');
    handleBackToDirectory();
  };

  const userRole = (currentUser?.role || '').toLowerCase();
  const canManage = canManageEmployees(currentUser);
  const isEmployee = userRole === 'employee';

  // Find linked profile for self-service view
  const myEmployee = employees.find(
    (e) => (currentUser?.id && e.user_id === currentUser.id) ||
           (currentUser?.email && e.work_email?.toLowerCase() === currentUser.email?.toLowerCase())
  ) || employees[0] || null;

  const myDeptName = myEmployee ? getDeptName(myEmployee.department_id, myEmployee.department_name) : 'General';
  const myDeptColor = getDeptColor(myDeptName);
  const myInitials = myEmployee ? getInitials(myEmployee.name) : 'ME';
  const mySchedule = schedules.find((s) => s.id === myEmployee?.working_schedule_id);

  return (
    <AppLayout activeModule="employees">
      <div className="page-container">
        {/* Toast alerts */}
        {successToast && (
          <div className="alert-box alert-box-success" style={{ marginBottom: '16px' }}>
            <CheckCircle2 size={16} />
            <span>{successToast}</span>
          </div>
        )}

        {error && (
          <div className="alert-box alert-box-danger" style={{ marginBottom: '16px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* ==========================================================
            VIEW A: REGULAR EMPLOYEE SELF-SERVICE DASHBOARD
            ========================================================== */}
        {isEmployee ? (
          <div>
            {/* Profile Header */}
            <div className="page-header-row" style={{ marginBottom: '20px' }}>
              <div>
                <h1 className="page-title font-display">My Profile & Workspace</h1>
                <p className="page-subtitle">
                  Personal employment record, organization details, and assigned working hours
                </p>
              </div>

              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: 'var(--r-pill)',
                backgroundColor: 'var(--muted)',
                color: 'var(--text-secondary)',
                fontSize: '0.8125rem',
                fontWeight: 600
              }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success)' }} />
                Logged in as: <strong style={{ color: 'var(--ink)' }}>Employee</strong>
              </div>
            </div>

            {loading ? (
              <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Loading profile data...
              </div>
            ) : !myEmployee ? (
              <div className="restricted-access-card">
                <Info size={40} style={{ color: 'var(--coral)', margin: '0 auto 12px auto' }} />
                <h3 className="font-display" style={{ fontSize: '1.25rem', color: 'var(--ink)', marginBottom: '8px' }}>
                  No Linked Employee Profile Found
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Your user account is not currently linked to an active employee record. Please contact HR Management.
                </p>
              </div>
            ) : (
              <>
                {/* Hero Profile Card */}
                <div style={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-lg)',
                  padding: '28px 32px',
                  boxShadow: 'var(--shadow-card)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '24px',
                  flexWrap: 'wrap',
                  marginBottom: '20px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                    {/* Big Avatar Box */}
                    <div style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: 'var(--r-lg)',
                      backgroundColor: myDeptColor,
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '28px',
                      fontWeight: 700,
                      fontFamily: 'var(--font-display)',
                      letterSpacing: '0.5px',
                      boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
                      flexShrink: 0
                    }}>
                      {myInitials}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px', flexWrap: 'wrap' }}>
                        <h2 className="font-display" style={{
                          margin: 0,
                          fontSize: '1.625rem',
                          fontWeight: 700,
                          color: 'var(--ink)'
                        }}>
                          {myEmployee.name}
                        </h2>
                        <span className="status-pill status-pill-success">
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--success)', display: 'inline-block', marginRight: '5px' }} />
                          {myEmployee.status ? myEmployee.status.charAt(0).toUpperCase() + myEmployee.status.slice(1) : 'Active'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', fontSize: '0.875rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, color: 'var(--ink)' }}>
                          {myEmployee.job_position || 'Staff Member'}
                        </span>
                        <span>•</span>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 'var(--r-sm)',
                          backgroundColor: 'var(--muted)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: 'var(--ink)'
                        }}>
                          {myDeptName}
                        </span>
                        <span>•</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={13} color="var(--text-secondary)" />
                          {myEmployee.work_location || 'Headquarters'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contact Chips */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 14px',
                      borderRadius: 'var(--r-md)',
                      backgroundColor: 'var(--muted)',
                      fontSize: '0.8125rem',
                      color: 'var(--ink)'
                    }}>
                      <Mail size={15} color="var(--coral)" />
                      <span style={{ fontWeight: 500 }}>{myEmployee.work_email || 'Not specified'}</span>
                    </div>
                    {myEmployee.phone && (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 14px',
                        borderRadius: 'var(--r-md)',
                        backgroundColor: 'var(--muted)',
                        fontSize: '0.8125rem',
                        color: 'var(--ink)'
                      }}>
                        <Phone size={15} color="var(--sky)" />
                        <span style={{ fontWeight: 500 }}>{myEmployee.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Smart KPI Cards (Interactive) */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '16px',
                  marginBottom: '20px'
                }}>
                  {/* Contract Card */}
                  <div style={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r-md)',
                    padding: '18px 20px',
                    boxShadow: 'var(--shadow-card)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px'
                  }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(2, 132, 199, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <FileText size={20} color="var(--sky)" />
                    </div>
                    <div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>
                        {myEmployee.contracts_count ?? 1}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        Active Employment Contract
                      </div>
                    </div>
                  </div>

                  {/* Attendance Card */}
                  <div 
                    onClick={() => navigate('/attendance')}
                    style={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--r-md)',
                      padding: '18px 20px',
                      boxShadow: 'var(--shadow-card)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      cursor: 'pointer',
                      transition: 'transform 0.15s ease, border-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.borderColor = 'var(--success)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.borderColor = 'var(--border)';
                    }}
                    title="Click to view Attendance"
                  >
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(22, 163, 74, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Clock size={20} color="var(--success)" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>
                        {myEmployee.attendance_count ?? 0}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        Attendance Logs →
                      </div>
                    </div>
                  </div>

                  {/* Time Off Card */}
                  <div 
                    onClick={() => navigate('/time-off')}
                    style={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--r-md)',
                      padding: '18px 20px',
                      boxShadow: 'var(--shadow-card)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      cursor: 'pointer',
                      transition: 'transform 0.15s ease, border-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.borderColor = 'var(--coral)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.borderColor = 'var(--border)';
                    }}
                    title="Click to view Time Off"
                  >
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      backgroundColor: 'var(--coral-bg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Calendar size={20} color="var(--coral)" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>
                        {myEmployee.time_off_count ?? 0}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        Time Off Requests →
                      </div>
                    </div>
                  </div>

                  {/* Weekly Working Hours Card */}
                  <div style={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r-md)',
                    padding: '18px 20px',
                    boxShadow: 'var(--shadow-card)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px'
                  }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(2, 132, 199, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Clock size={20} color="var(--sky)" />
                    </div>
                    <div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>
                        {mySchedule ? `${mySchedule.hours_per_week} hrs` : '40 hrs'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        Weekly Schedule ({mySchedule ? `${mySchedule.days_per_week} days` : '5 days'})
                      </div>
                    </div>
                  </div>
                </div>

                {/* Two-Column Details Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                  gap: '20px',
                  marginBottom: '20px'
                }}>
                  {/* Card 1: Work & Organization */}
                  <div style={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r-lg)',
                    padding: '24px',
                    boxShadow: 'var(--shadow-card)'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      paddingBottom: '16px',
                      borderBottom: '1px solid var(--border)',
                      marginBottom: '20px'
                    }}>
                      <Briefcase size={18} color="var(--coral)" />
                      <h3 className="font-display" style={{
                        margin: 0,
                        fontSize: '1rem',
                        fontWeight: 600,
                        color: 'var(--ink)'
                      }}>
                        Work & Organization
                      </h3>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div>
                        <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                          Job Position
                        </div>
                        <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--ink)' }}>
                          {myEmployee.job_position || 'Not specified'}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                          Department
                        </div>
                        <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--ink)' }}>
                          {myDeptName}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                          Company
                        </div>
                        <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--ink)' }}>
                          {myEmployee.company || 'OXP Pvt Ltd'}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                          Work Location
                        </div>
                        <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--ink)' }}>
                          {myEmployee.work_location || 'Headquarters'}
                        </div>
                      </div>

                      <div style={{ gridColumn: 'span 2' }}>
                        <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                          Assigned Working Schedule
                        </div>
                        <div style={{
                          fontSize: '0.84rem',
                          fontWeight: 500,
                          color: 'var(--ink)',
                          backgroundColor: 'var(--muted)',
                          padding: '10px 14px',
                          borderRadius: 'var(--r-md)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <Clock size={15} color="var(--coral)" />
                          <span>
                            {mySchedule ? `${mySchedule.name} (${mySchedule.hours_per_week ?? 40}h/week, ${mySchedule.days_per_week ?? 5} days)` : 'Standard 40 Hours/Week (40h/week, 5 days)'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Contact & Status */}
                  <div style={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r-lg)',
                    padding: '24px',
                    boxShadow: 'var(--shadow-card)'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      paddingBottom: '16px',
                      borderBottom: '1px solid var(--border)',
                      marginBottom: '20px'
                    }}>
                      <Mail size={18} color="var(--sky)" />
                      <h3 className="font-display" style={{
                        margin: 0,
                        fontSize: '1rem',
                        fontWeight: 600,
                        color: 'var(--ink)'
                      }}>
                        Contact & Employment Status
                      </h3>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div>
                        <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                          Work Email
                        </div>
                        <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--ink)', wordBreak: 'break-all' }}>
                          {myEmployee.work_email || 'Not specified'}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                          Work Phone
                        </div>
                        <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--ink)' }}>
                          {myEmployee.phone || 'Not provided'}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                          Employment Status
                        </div>
                        <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--success)' }}>
                          ● Active Employee
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                          System Role
                        </div>
                        <div style={{
                          fontSize: '0.8125rem',
                          fontWeight: 700,
                          color: 'var(--ink)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Employee
                        </div>
                      </div>

                      <div style={{ gridColumn: 'span 2' }}>
                        <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                          Employee Identification ID
                        </div>
                        <div className="ref-code-mono" style={{
                          fontSize: '0.84rem',
                          fontWeight: 600,
                          color: 'var(--ink)',
                          backgroundColor: 'var(--muted)',
                          padding: '8px 14px',
                          borderRadius: 'var(--r-md)',
                          display: 'inline-block'
                        }}>
                          EMP-{String(myEmployee.id).padStart(4, '0')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Provenance / Policy Note Card */}
                <div style={{
                  background: 'var(--muted)',
                  borderRadius: 'var(--r-md)',
                  padding: '1rem 1.25rem',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '0.8125rem',
                  color: 'var(--text-secondary)'
                }}>
                  <Info size={16} color="var(--coral)" style={{ flexShrink: 0 }} />
                  <span>
                    <strong>Employee Self-Service Note:</strong> This is your official employment record. Contract, payroll, and schedule assignments are managed centrally by HR. If you need any updates to your personal or work details, please contact HR Management.
                  </span>
                </div>
              </>
            )}
          </div>
        ) : (
          /* ==========================================================
              VIEW B: ADMIN & HR MANAGER DIRECTORY VIEW (Kanban / List)
              ========================================================== */
          <>
            {selectedEmployee !== null ? (
              <EmployeeDetail
                employee={selectedEmployee === 'new' ? null : selectedEmployee}
                departments={departments}
                schedules={schedules}
                currentUser={currentUser}
                onBack={handleBackToDirectory}
                onSaved={handleSavedEmployee}
              />
            ) : (
              <>
                {/* Header Section per 01-employees.md §2 */}
                <div className="page-header-row">
                  <div className="page-header-left">
                    <h1 className="page-title font-display">Employees</h1>
                    <p className="page-subtitle">
                      {viewMode === 'kanban' 
                        ? 'Default view: Kanban directory' 
                        : 'List view for sorting, filtering, and bulk scanning'}
                    </p>
                  </div>

                  {canManage && (
                    <div className="page-header-actions">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handleSelectEmployee('new')}
                        id="btn-new-employee"
                      >
                        <Plus size={15} style={{ marginRight: '6px' }} />
                        New Employee
                      </button>
                    </div>
                  )}
                </div>

                {/* Action Toolbar */}
                <div className="toolbar-cluster">
                  <div className="navbar-search-pill" style={{ width: '280px', background: 'var(--card)' }}>
                    <Search size={14} className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search employees by name, title, department..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="search-input"
                      id="search-employees-input"
                    />
                    {searchTerm && (
                      <button 
                        type="button" 
                        onClick={() => setSearchTerm('')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  <div className="view-toggle-pill" role="group" aria-label="View Switcher">
                    <button
                      type="button"
                      className={`view-toggle-option ${viewMode === 'kanban' ? 'is-active' : ''}`}
                      onClick={() => setViewMode('kanban')}
                      id="view-toggle-kanban"
                    >
                      <LayoutGrid size={14} style={{ marginRight: '4px' }} />
                      <span>Kanban</span>
                    </button>
                    <button
                      type="button"
                      className={`view-toggle-option ${viewMode === 'list' ? 'is-active' : ''}`}
                      onClick={() => setViewMode('list')}
                      id="view-toggle-list"
                    >
                      <ListIcon size={14} style={{ marginRight: '4px' }} />
                      <span>List</span>
                    </button>
                  </div>

                  <div style={{ marginLeft: 'auto', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Showing <strong>{filteredEmployees.length}</strong> active profiles
                  </div>
                </div>

                {/* Content */}
                {loading ? (
                  <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Loading verified employee records...
                  </div>
                ) : filteredEmployees.length === 0 ? (
                  <div className="card" style={{ padding: '48px', textAlign: 'center', marginTop: '16px' }}>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>
                      No employees found matching "{searchTerm}".
                    </p>
                    {canManage && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handleSelectEmployee('new')}
                      >
                        <Plus size={14} style={{ marginRight: '6px' }} />
                        Add First Employee
                      </button>
                    )}
                  </div>
                ) : viewMode === 'kanban' ? (
                  <div className="employee-kanban-grid" style={{ marginTop: '16px' }}>
                    {filteredEmployees.map((emp) => (
                      <EmployeeCard
                        key={emp.id}
                        employee={emp}
                        departmentName={getDeptName(emp.department_id, emp.department_name)}
                        onClick={(emp) => handleSelectEmployee(emp)}
                      />
                    ))}
                  </div>
                ) : (
                  <div style={{ marginTop: '16px' }}>
                    <EmployeeList
                      employees={filteredEmployees}
                      departments={departments}
                      onSelectEmployee={(emp) => handleSelectEmployee(emp)}
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default EmployeesPage;
