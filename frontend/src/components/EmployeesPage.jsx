import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  LayoutGrid, 
  List as ListIcon, 
  Plus, 
  X, 
  Mail, 
  Phone, 
  Briefcase, 
  Building, 
  MapPin, 
  FileText, 
  Clock, 
  Calendar,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import Navbar from './Navbar';
import { getCurrentUser } from '../api/auth';
import { 
  getEmployees, 
  getDepartments, 
  getWorkingSchedules,
  createEmployee, 
  updateEmployee 
} from '../api/employees';

const EmployeesPage = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'list'
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [workingSchedules, setWorkingSchedules] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successToast, setSuccessToast] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Modal State for New / Edit Employee
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    work_email: '',
    job_position: '',
    department_id: '',
    working_schedule_id: '',
    status: 'active',
    phone: '',
    work_location: '',
    company: 'My Company'
  });

  // Load employees, departments and schedules from database
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [empData, deptData, schedData, userData] = await Promise.all([
        getEmployees(),
        getDepartments(),
        getWorkingSchedules(),
        getCurrentUser().catch(() => null)
      ]);
      setEmployees(empData || []);
      setDepartments(deptData || []);
      setWorkingSchedules(schedData || []);
      if (userData) {
        setCurrentUser(userData);
      }
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

  const deptMap = Object.fromEntries(departments.map(d => [d.id, d.name]));
  const getDeptName = (deptId, fallback) => deptMap[deptId] || fallback || 'General';

  // Filter employees based on search query
  const filteredEmployees = employees.filter((emp) => {
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

  // Helper to generate 2-letter initials
  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Department color mapping per 01-employees.md
  // Finance -> --sky, HR -> --coral, Engineering -> --ink, Sales -> --warning, Support -> --success
  const getDeptColor = (deptName) => {
    if (!deptName) return '#714B67';
    const lower = deptName.toLowerCase();
    if (lower.includes('finance') || lower.includes('account')) return 'var(--sky, #6F93E3)';
    if (lower.includes('hr') || lower.includes('human') || lower.includes('recruit')) return 'var(--coral, #F1502A)';
    if (lower.includes('eng') || lower.includes('tech') || lower.includes('dev') || lower.includes('software')) return 'var(--ink, #171B26)';
    if (lower.includes('sale') || lower.includes('market') || lower.includes('business')) return 'var(--warning, #E8A33D)';
    if (lower.includes('support') || lower.includes('operat') || lower.includes('customer')) return 'var(--success, #2FA36B)';
    return '#714B67';
  };

  // Role permissions per permission.txt
  const userRole = (currentUser?.role || '').toLowerCase();
  const canManage = ['admin', 'hr_manager', 'hr_payroll_admin', 'hr_payroll_user'].includes(userRole);
  const isEmployee = userRole === 'employee';

  // Open modal in CREATE mode (Admins/HR only)
  const handleOpenCreateModal = () => {
    if (!canManage) return;
    setSelectedEmployee(null);
    setFormData({
      name: '',
      work_email: '',
      job_position: '',
      department_id: departments.length > 0 ? departments[0].id : '',
      working_schedule_id: workingSchedules.length > 0 ? workingSchedules[0].id : '',
      status: 'active',
      phone: '',
      work_location: '',
      company: 'My Company'
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open modal in EDIT / VIEW mode
  const handleOpenEditModal = (emp) => {
    setSelectedEmployee(emp);
    setFormData({
      name: emp.name || '',
      work_email: emp.work_email || '',
      job_position: emp.job_position || '',
      department_id: emp.department_id || (departments.length > 0 ? departments[0].id : ''),
      working_schedule_id: emp.working_schedule_id || (workingSchedules.length > 0 ? workingSchedules[0].id : ''),
      status: emp.status || 'active',
      phone: emp.phone || '',
      work_location: emp.work_location || '',
      company: emp.company || 'My Company'
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEmployee(null);
    setFormError(null);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!canManage) {
      setFormError('Employees have read-only access and cannot modify employee records.');
      return;
    }
    setSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        name: formData.name.trim(),
        work_email: formData.work_email.trim() || null,
        job_position: formData.job_position.trim() || null,
        department_id: formData.department_id ? parseInt(formData.department_id, 10) : null,
        working_schedule_id: formData.working_schedule_id ? parseInt(formData.working_schedule_id, 10) : null,
        status: formData.status,
        phone: formData.phone.trim() || null,
        work_location: formData.work_location.trim() || null,
        company: formData.company.trim() || 'My Company'
      };

      if (selectedEmployee) {
        // Update existing employee
        await updateEmployee(selectedEmployee.id, payload);
        showToast('Employee updated successfully!');
      } else {
        // Create new employee
        await createEmployee(payload);
        showToast('New employee created successfully!');
      }

      await loadData();
      handleCloseModal();
    } catch (err) {
      console.error('Error saving employee:', err);
      setFormError(err.message || 'Failed to save employee to database');
    } finally {
      setSubmitting(false);
    }
  };

  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const myEmployee = employees.find(
    (e) => (currentUser?.id && e.user_id === currentUser.id) ||
           (currentUser?.email && e.work_email?.toLowerCase() === currentUser.email?.toLowerCase())
  ) || employees[0] || null;
  const myDeptName = myEmployee ? getDeptName(myEmployee.department_id, myEmployee.department_name) : 'General';
  const myDeptColor = getDeptColor(myDeptName);
  const myInitials = myEmployee ? getInitials(myEmployee.name) : 'JD';
  const mySchedule = workingSchedules.find((s) => s.id === myEmployee?.working_schedule_id);

  return (
    <div className="app-layout-shell">
      {/* Top Navbar matching wireframe with active module 'employees' */}
      <Navbar activeModule="employees" />

      <main className="app-layout-main">
        <div className="employees-page">
          {isEmployee ? (
            /* ==========================================================
               EMPLOYEE SELF-SERVICE USER INFO / PROFILE VIEW
               ========================================================== */
            <div>
              {/* Profile Top Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div>
                  <h1 className="employees-title" style={{ margin: 0, fontSize: '26px' }}>
                    My Profile
                  </h1>
                  <p className="employees-subtitle" style={{ margin: '4px 0 0 0' }}>
                    Personal employee record, organization assignment, and working hours
                  </p>
                </div>

                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: 'var(--r-pill, 999px)',
                  backgroundColor: 'var(--muted, #EFEFF2)',
                  color: 'var(--text-secondary, #475569)',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: '1px solid var(--border, #E8E9EC)'
                }}>
                  <span>Employee Self-Service</span>
                </div>
              </div>

              {/* Toast / Error Alert */}
              {successToast && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  marginBottom: '16px',
                  backgroundColor: 'var(--color-success-bg)',
                  border: '1px solid var(--color-success)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-success)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 500
                }}>
                  <CheckCircle2 size={16} />
                  <span>{successToast}</span>
                </div>
              )}

              {error && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 16px',
                  marginBottom: '16px',
                  backgroundColor: 'var(--color-danger-bg)',
                  border: '1px solid var(--color-danger)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-danger)',
                  fontSize: 'var(--text-sm)'
                }}>
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {loading ? (
                <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Loading profile details...
                </div>
              ) : !myEmployee ? (
                <div style={{
                  textAlign: 'center',
                  padding: '48px 24px',
                  backgroundColor: 'var(--card, #FFFFFF)',
                  borderRadius: 'var(--r-lg, 16px)',
                  border: '1px dashed var(--border, #E8E9EC)',
                  color: 'var(--text-secondary)'
                }}>
                  <p style={{ margin: '0 0 8px 0', fontWeight: 600, fontSize: '16px' }}>No Employee Record Found</p>
                  <p style={{ margin: 0, fontSize: '13px' }}>Your user account is not currently linked to an employee profile. Please contact HR.</p>
                </div>
              ) : (
                <>
                  {/* Main Hero Card with JD Profile Photo Avatar */}
                  <div style={{
                    backgroundColor: 'var(--card, #FFFFFF)',
                    border: '1px solid var(--border, #E8E9EC)',
                    borderRadius: 'var(--r-lg, 16px)',
                    padding: '28px 32px',
                    boxShadow: 'var(--shadow-card, 0 2px 12px rgba(0,0,0,0.04))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '24px',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                      {/* Prominent JD Profile Photo Avatar Box */}
                      <div style={{
                        width: '84px',
                        height: '84px',
                        borderRadius: '22px',
                        backgroundColor: myDeptColor,
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '32px',
                        fontWeight: 800,
                        fontFamily: 'var(--font-display, var(--font-sans))',
                        letterSpacing: '0.5px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
                        flexShrink: 0
                      }}>
                        {myInitials}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px', flexWrap: 'wrap' }}>
                          <h2 style={{
                            margin: 0,
                            fontFamily: 'var(--font-display, var(--font-sans))',
                            fontSize: '26px',
                            fontWeight: 700,
                            color: 'var(--ink, #171B26)'
                          }}>
                            {myEmployee.name}
                          </h2>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 10px',
                            borderRadius: '999px',
                            fontSize: '12px',
                            fontWeight: 600,
                            backgroundColor: myEmployee.status?.toLowerCase() === 'active' ? 'var(--color-success-bg, #F0FDF4)' : 'var(--color-warning-bg, #FFFBEB)',
                            color: myEmployee.status?.toLowerCase() === 'active' ? 'var(--color-success, #16A34A)' : 'var(--color-warning, #D97706)',
                            border: `1px solid ${myEmployee.status?.toLowerCase() === 'active' ? 'rgba(22, 163, 74, 0.2)' : 'rgba(217, 119, 6, 0.2)'}`
                          }}>
                            <span style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: myEmployee.status?.toLowerCase() === 'active' ? 'var(--color-success, #16A34A)' : 'var(--color-warning, #D97706)'
                            }} />
                            {myEmployee.status ? myEmployee.status.charAt(0).toUpperCase() + myEmployee.status.slice(1) : 'Active'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary, #4B5563)', fontSize: '14px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary, #1F2937)' }}>
                            {myEmployee.job_position || 'Staff Member'}
                          </span>
                          <span>•</span>
                          <span style={{
                            padding: '2px 9px',
                            borderRadius: '6px',
                            backgroundColor: 'var(--muted, #EFEFF2)',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--text-secondary, #475569)'
                          }}>
                            {myDeptName}
                          </span>
                          <span>•</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={14} color="var(--text-secondary)" />
                            {myEmployee.work_location || 'Headquarters'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Contact Chips */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--muted, #EFEFF2)',
                        fontSize: '13px',
                        color: 'var(--text-primary, #171B26)'
                      }}>
                        <Mail size={15} color="var(--coral, #F1502A)" />
                        <span style={{ fontWeight: 500 }}>{myEmployee.work_email || 'Not specified'}</span>
                      </div>
                      {myEmployee.phone && (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 14px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--muted, #EFEFF2)',
                          fontSize: '13px',
                          color: 'var(--text-primary, #171B26)'
                        }}>
                          <Phone size={15} color="var(--sky, #6F93E3)" />
                          <span style={{ fontWeight: 500 }}>{myEmployee.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Smart Buttons / Stats Row (Interactive) */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '16px',
                    marginTop: '20px'
                  }}>
                    {/* Contracts Card */}
                    <div style={{
                      backgroundColor: 'var(--card, #FFFFFF)',
                      border: '1px solid var(--border, #E8E9EC)',
                      borderRadius: 'var(--r-md, 12px)',
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
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <FileText size={20} color="var(--color-primary, #2563EB)" />
                      </div>
                      <div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ink, #171B26)' }}>
                          {myEmployee.contracts_count ?? 1}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary, #888D96)', fontWeight: 500 }}>
                          Active Employment Contract
                        </div>
                      </div>
                    </div>

                    {/* Attendance Card */}
                    <div 
                      onClick={() => navigate('/attendance')}
                      style={{
                        backgroundColor: 'var(--card, #FFFFFF)',
                        border: '1px solid var(--border, #E8E9EC)',
                        borderRadius: 'var(--r-md, 12px)',
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
                        e.currentTarget.style.borderColor = 'var(--color-success, #16A34A)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.borderColor = 'var(--border, #E8E9EC)';
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
                        <Clock size={20} color="var(--color-success, #16A34A)" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ink, #171B26)' }}>
                          {myEmployee.attendance_count ?? 0}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary, #888D96)', fontWeight: 500 }}>
                          Attendance Logs →
                        </div>
                      </div>
                    </div>

                    {/* Time Off Card */}
                    <div 
                      onClick={() => navigate('/time-off')}
                      style={{
                        backgroundColor: 'var(--card, #FFFFFF)',
                        border: '1px solid var(--border, #E8E9EC)',
                        borderRadius: 'var(--r-md, 12px)',
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
                        e.currentTarget.style.borderColor = 'var(--coral, #F1502A)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.borderColor = 'var(--border, #E8E9EC)';
                      }}
                      title="Click to view Time Off"
                    >
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(241, 80, 42, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Calendar size={20} color="var(--coral, #F1502A)" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ink, #171B26)' }}>
                          {myEmployee.time_off_count ?? 0}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary, #888D96)', fontWeight: 500 }}>
                          Time Off Requests →
                        </div>
                      </div>
                    </div>

                    {/* Weekly Hours Card */}
                    <div style={{
                      backgroundColor: 'var(--card, #FFFFFF)',
                      border: '1px solid var(--border, #E8E9EC)',
                      borderRadius: 'var(--r-md, 12px)',
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
                        backgroundColor: 'rgba(111, 147, 227, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Clock size={20} color="var(--sky, #6F93E3)" />
                      </div>
                      <div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ink, #171B26)' }}>
                          {mySchedule ? `${mySchedule.hours_per_week} hrs` : '40 hrs'}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary, #888D96)', fontWeight: 500 }}>
                          Weekly Work Hours ({mySchedule ? `${mySchedule.days_per_week} days` : '5 days'})
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Information Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                    gap: '20px',
                    marginTop: '20px'
                  }}>
                    {/* Card 1: Work & Organization */}
                    <div style={{
                      backgroundColor: 'var(--card, #FFFFFF)',
                      border: '1px solid var(--border, #E8E9EC)',
                      borderRadius: 'var(--r-lg, 16px)',
                      padding: '24px',
                      boxShadow: 'var(--shadow-card)'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        paddingBottom: '16px',
                        borderBottom: '1px solid var(--border, #E8E9EC)',
                        marginBottom: '20px'
                      }}>
                        <Briefcase size={18} color="var(--coral, #F1502A)" />
                        <h3 style={{
                          margin: 0,
                          fontFamily: 'var(--font-display)',
                          fontSize: '16px',
                          fontWeight: 600,
                          color: 'var(--ink, #171B26)'
                        }}>
                          Work & Organization
                        </h3>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, #888D96)', textTransform: 'uppercase', marginBottom: '4px' }}>
                            Job Position
                          </div>
                          <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--ink, #171B26)' }}>
                            {myEmployee.job_position || 'Not specified'}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, #888D96)', textTransform: 'uppercase', marginBottom: '4px' }}>
                            Department
                          </div>
                          <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--ink, #171B26)' }}>
                            {myDeptName}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, #888D96)', textTransform: 'uppercase', marginBottom: '4px' }}>
                            Company
                          </div>
                          <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--ink, #171B26)' }}>
                            {myEmployee.company || 'OXP Pvt Ltd'}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, #888D96)', textTransform: 'uppercase', marginBottom: '4px' }}>
                            Work Location
                          </div>
                          <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--ink, #171B26)' }}>
                            {myEmployee.work_location || 'Headquarters'}
                          </div>
                        </div>

                        <div style={{ gridColumn: 'span 2' }}>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, #888D96)', textTransform: 'uppercase', marginBottom: '4px' }}>
                            Assigned Working Schedule
                          </div>
                          <div style={{
                            fontSize: '13.5px',
                            fontWeight: 600,
                            color: 'var(--ink, #171B26)',
                            backgroundColor: 'var(--muted, #EFEFF2)',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <Clock size={16} color="var(--coral, #F1502A)" />
                            <span>
                              {mySchedule ? `${mySchedule.name} (${mySchedule.hours_per_week ?? 40}h/week, ${mySchedule.days_per_week ?? 5} days)` : 'Standard 40 Hours/Week (40h/week, 5 days)'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Contact & Account Status */}
                    <div style={{
                      backgroundColor: 'var(--card, #FFFFFF)',
                      border: '1px solid var(--border, #E8E9EC)',
                      borderRadius: 'var(--r-lg, 16px)',
                      padding: '24px',
                      boxShadow: 'var(--shadow-card)'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        paddingBottom: '16px',
                        borderBottom: '1px solid var(--border, #E8E9EC)',
                        marginBottom: '20px'
                      }}>
                        <Mail size={18} color="var(--sky, #6F93E3)" />
                        <h3 style={{
                          margin: 0,
                          fontFamily: 'var(--font-display)',
                          fontSize: '16px',
                          fontWeight: 600,
                          color: 'var(--ink, #171B26)'
                        }}>
                          Contact & Employment Status
                        </h3>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, #888D96)', textTransform: 'uppercase', marginBottom: '4px' }}>
                            Work Email
                          </div>
                          <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--ink, #171B26)', wordBreak: 'break-all' }}>
                            {myEmployee.work_email || 'Not specified'}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, #888D96)', textTransform: 'uppercase', marginBottom: '4px' }}>
                            Work Phone
                          </div>
                          <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--ink, #171B26)' }}>
                            {myEmployee.phone || 'Not provided'}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, #888D96)', textTransform: 'uppercase', marginBottom: '4px' }}>
                            Employment Status
                          </div>
                          <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--color-success, #16A34A)' }}>
                            ● Active Employee
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, #888D96)', textTransform: 'uppercase', marginBottom: '4px' }}>
                            System Role
                          </div>
                          <div style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color: 'var(--ink, #171B26)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            Employee
                          </div>
                        </div>

                        <div style={{ gridColumn: 'span 2' }}>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, #888D96)', textTransform: 'uppercase', marginBottom: '4px' }}>
                            Employee Identification ID
                          </div>
                          <div style={{
                            fontSize: '13px',
                            fontFamily: 'var(--font-mono, monospace)',
                            fontWeight: 600,
                            color: 'var(--ink, #171B26)',
                            backgroundColor: 'var(--muted, #EFEFF2)',
                            padding: '8px 14px',
                            borderRadius: '8px',
                            display: 'inline-block'
                          }}>
                            EMP-{String(myEmployee.id).padStart(4, '0')}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Useful Note Footer */}
                  <div className="useful-note-footer" style={{ marginTop: '24px' }}>
                    <span>
                      <strong>Employee Self-Service Note:</strong> This is your official employment record. Contract, payroll, and schedule assignments are managed centrally by HR. If you need any updates to your personal or work details, please contact HR Management.
                    </span>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* ==========================================================
               ADMIN & HR MANAGER DIRECTORY VIEW (Kanban / List)
               ========================================================== */
            <>
              {/* Header Section */}
              <div className="employees-header">
                <h1 className="employees-title">Employees</h1>
                <p className="employees-subtitle">
                  {viewMode === 'kanban' 
                    ? 'Default view: Kanban' 
                    : 'List view for sort, filter and bulk scanning'}
                </p>
              </div>

              {/* Action Toolbar */}
              <div className="employees-toolbar">
                <div className="employees-toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button 
                    type="button" 
                    className="btn-new-employee"
                    onClick={handleOpenCreateModal}
                    id="btn-new-employee"
                  >
                    NEW
                  </button>

                  {/* Search Bar */}
                  <div className="employee-search-box">
                    <Search size={16} className="employee-search-icon" />
                    <input
                      type="text"
                      placeholder="Search employees.."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="employee-search-input"
                      id="search-employees-input"
                    />
                  </div>
                </div>

                {/* View Switcher Toggle: [Kanban] [List] */}
                <div className="view-switcher-group" role="group" aria-label="View Switcher">
                  <button
                    type="button"
                    className={`btn-view-toggle ${viewMode === 'kanban' ? 'is-active' : ''}`}
                    onClick={() => setViewMode('kanban')}
                    id="view-toggle-kanban"
                  >
                    <LayoutGrid size={15} />
                    <span>Kanban</span>
                  </button>
                  <button
                    type="button"
                    className={`btn-view-toggle ${viewMode === 'list' ? 'is-active' : ''}`}
                    onClick={() => setViewMode('list')}
                    id="view-toggle-list"
                  >
                    <ListIcon size={15} />
                    <span>List</span>
                  </button>
                </div>
              </div>

              {/* Toast / Error Alert */}
              {successToast && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  backgroundColor: 'var(--color-success-bg)',
                  border: '1px solid var(--color-success)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-success)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 500
                }}>
                  <CheckCircle2 size={16} />
                  <span>{successToast}</span>
                </div>
              )}

              {error && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 16px',
                  backgroundColor: 'var(--color-danger-bg)',
                  border: '1px solid var(--color-danger)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-danger)',
                  fontSize: 'var(--text-sm)'
                }}>
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {/* Content Views */}
              {loading ? (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '60px 0',
                  color: 'var(--neutral-600)',
                  fontSize: 'var(--text-base)'
                }}>
                  Loading employees from database...
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '48px 24px',
                  backgroundColor: 'var(--neutral-0)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--neutral-300)',
                  color: 'var(--neutral-600)'
                }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: 'var(--text-md)', fontWeight: 600 }}>
                    No employees found
                  </p>
                  <p style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
                    {searchTerm ? `No results matching "${searchTerm}"` : 'Get started by clicking the "NEW" button above to add an employee.'}
                  </p>
                </div>
              ) : viewMode === 'kanban' ? (
                /* ==========================================================
                   1. KANBAN VIEW (Grid matching Wireframe)
                   ========================================================== */
                <div className="kanban-grid">
                  {filteredEmployees.map((emp) => {
                    const initials = getInitials(emp.name);
                    const deptName = getDeptName(emp.department_id, emp.department_name);
                    const deptColor = getDeptColor(deptName);
                    const isActive = emp.status?.toLowerCase() === 'active';
                    const isInactive = emp.status?.toLowerCase() === 'inactive';
                    
                    return (
                      <div 
                        key={emp.id} 
                        className="employee-card"
                        onClick={() => handleOpenEditModal(emp)}
                        title={`Click to open Employee Form for ${emp.name}`}
                      >
                        <div className="employee-card-top">
                          <div 
                            className="employee-avatar-box"
                            style={{ backgroundColor: deptColor }}
                          >
                            {initials}
                          </div>
                          
                          <div className="employee-card-info">
                            <h3 className="employee-card-name">{emp.name}</h3>
                            <p className="employee-card-position">
                              {emp.job_position || 'Staff Member'}
                            </p>
                          </div>
                        </div>

                        <div className="employee-card-bottom">
                          <span className="employee-card-dept">
                            {deptName}
                          </span>
                          
                          <div className={`employee-status-indicator ${isActive ? 'is-active' : isInactive ? 'is-inactive' : 'is-archived'}`}>
                            <span className={`status-bullet ${isActive ? 'is-active' : isInactive ? 'is-inactive' : 'is-archived'}`} />
                            <span>{emp.status ? emp.status.charAt(0).toUpperCase() + emp.status.slice(1) : 'Active'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* ==========================================================
                   2. LIST VIEW (Table matching Wireframe)
                   ========================================================== */
                <div className="employee-table-card">
                  <table className="employee-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Work Email</th>
                        <th>Job Position</th>
                        <th>Department</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployees.map((emp) => {
                        const initials = getInitials(emp.name);
                        const deptName = getDeptName(emp.department_id, emp.department_name);
                        const deptColor = getDeptColor(deptName);
                        const isActive = emp.status?.toLowerCase() === 'active';
                        const isInactive = emp.status?.toLowerCase() === 'inactive';

                        return (
                          <tr 
                            key={emp.id} 
                            className="employee-table-row"
                            onClick={() => handleOpenEditModal(emp)}
                            title={`Click to open Employee Form for ${emp.name}`}
                          >
                            <td>
                              <div className="employee-cell-name">
                                <div 
                                  className="employee-cell-avatar"
                                  style={{ backgroundColor: deptColor }}
                                >
                                  {initials}
                                </div>
                                <span>{emp.name}</span>
                              </div>
                            </td>
                            <td className="employee-cell-email">
                              {emp.work_email || '—'}
                            </td>
                            <td>
                              {emp.job_position || 'Staff Member'}
                            </td>
                            <td>
                              <span className="employee-cell-dept-badge">
                                {deptName}
                              </span>
                            </td>
                            <td>
                              <div className={`employee-status-indicator ${isActive ? 'is-active' : isInactive ? 'is-inactive' : 'is-archived'}`}>
                                <span className={`status-bullet ${isActive ? 'is-active' : isInactive ? 'is-inactive' : 'is-archived'}`} />
                                <span>{emp.status ? emp.status.charAt(0).toUpperCase() + emp.status.slice(1) : 'Active'}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Useful Note Footer */}
              <div className="useful-note-footer">
                {viewMode === 'kanban' ? (
                  <span>
                    <strong>Useful note:</strong> Kanban is good for browsing; clicking a card should open the same Employee Form used everywhere else.
                  </span>
                ) : (
                  <span>
                    <strong>Useful note:</strong> The list view is the main entry point for opening a specific employee record quickly.
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {/* ==========================================================
          EMPLOYEE FORM MODAL / DRAWER
          ========================================================== */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div 
            className="modal-content-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="modal-header">
              <div className="modal-title-wrap">
                <div 
                  className="employee-avatar-box" 
                  style={{ 
                    width: '42px', 
                    height: '42px', 
                    fontSize: '15px',
                    backgroundColor: getDeptColor(getDeptName(formData.department_id))
                  }}
                >
                  {formData.name ? getInitials(formData.name) : 'HR'}
                </div>
                <div>
                  <h2 className="modal-title">
                    {selectedEmployee ? (canManage ? selectedEmployee.name : `${selectedEmployee.name} (My Profile)`) : 'New Employee'}
                  </h2>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--neutral-600)' }}>
                    {selectedEmployee ? (canManage ? 'Employee Record & Settings' : 'Personal Employee Record (Read-only)') : 'Create a new employee profile in database'}
                  </span>
                </div>
              </div>
              <button 
                type="button" 
                className="btn-close-modal"
                onClick={handleCloseModal}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleFormSubmit}>
              <div className="modal-body">
                {/* Smart Buttons (if editing existing employee) */}
                {selectedEmployee && (
                  <div className="smart-buttons-row">
                    <div className="smart-button">
                      <FileText size={15} color="var(--color-primary)" />
                      <span>Contracts</span>
                      <span className="smart-button-count">
                        {selectedEmployee.contracts_count ?? 0}
                      </span>
                    </div>
                    <div className="smart-button">
                      <Clock size={15} color="var(--color-success)" />
                      <span>Attendance</span>
                      <span className="smart-button-count" style={{ backgroundColor: 'var(--color-success)' }}>
                        {selectedEmployee.attendance_count || 0}
                      </span>
                    </div>
                    <div className="smart-button">
                      <Calendar size={15} color="var(--color-warning)" />
                      <span>Time Off</span>
                      <span className="smart-button-count" style={{ backgroundColor: 'var(--color-warning)' }}>
                        {selectedEmployee.time_off_count || 0}
                      </span>
                    </div>
                  </div>
                )}

                {formError && (
                  <div style={{
                    padding: '10px 14px',
                    backgroundColor: 'var(--color-danger-bg)',
                    border: '1px solid var(--color-danger)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-danger)',
                    fontSize: 'var(--text-xs)'
                  }}>
                    {formError}
                  </div>
                )}

                {/* 2-Column Fields */}
                <div className="form-grid-2">
                  <div className="form-field-group">
                    <label className="form-label" htmlFor="emp-name">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="emp-name"
                      name="name"
                      required
                      disabled={!canManage}
                      value={formData.name}
                      onChange={handleFormChange}
                      placeholder="e.g. Aarav Mehta"
                      className="form-input"
                      style={{ opacity: canManage ? 1 : 0.85, cursor: canManage ? 'text' : 'default' }}
                    />
                  </div>

                  <div className="form-field-group">
                    <label className="form-label" htmlFor="emp-email">
                      Work Email *
                    </label>
                    <input
                      type="email"
                      id="emp-email"
                      name="work_email"
                      required
                      disabled={!canManage}
                      value={formData.work_email}
                      onChange={handleFormChange}
                      placeholder="e.g. aarav@exp.com"
                      className="form-input"
                      style={{ opacity: canManage ? 1 : 0.85, cursor: canManage ? 'text' : 'default' }}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-field-group">
                    <label className="form-label" htmlFor="emp-position">
                      Job Position
                    </label>
                    <input
                      type="text"
                      id="emp-position"
                      name="job_position"
                      disabled={!canManage}
                      value={formData.job_position}
                      onChange={handleFormChange}
                      placeholder="e.g. Payroll Specialist"
                      className="form-input"
                      style={{ opacity: canManage ? 1 : 0.85, cursor: canManage ? 'text' : 'default' }}
                    />
                  </div>

                  <div className="form-field-group">
                    <label className="form-label" htmlFor="emp-dept">
                      Department
                    </label>
                    <select
                      id="emp-dept"
                      name="department_id"
                      disabled={!canManage}
                      value={formData.department_id}
                      onChange={handleFormChange}
                      className="form-select"
                      style={{ opacity: canManage ? 1 : 0.85, cursor: canManage ? 'pointer' : 'default' }}
                    >
                      <option value="">-- Select Department --</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-field-group">
                    <label className="form-label" htmlFor="emp-status">
                      Status
                    </label>
                    <select
                      id="emp-status"
                      name="status"
                      disabled={!canManage}
                      value={formData.status}
                      onChange={handleFormChange}
                      className="form-select"
                      style={{ opacity: canManage ? 1 : 0.85, cursor: canManage ? 'pointer' : 'default' }}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>

                  <div className="form-field-group">
                    <label className="form-label" htmlFor="emp-phone">
                      Work Phone
                    </label>
                    <input
                      type="tel"
                      id="emp-phone"
                      name="phone"
                      disabled={!canManage}
                      value={formData.phone}
                      onChange={handleFormChange}
                      placeholder="+1 (555) 000-0000"
                      className="form-input"
                      style={{ opacity: canManage ? 1 : 0.85, cursor: canManage ? 'text' : 'default' }}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-field-group">
                    <label className="form-label" htmlFor="emp-location">
                      Work Location
                    </label>
                    <input
                      type="text"
                      id="emp-location"
                      name="work_location"
                      disabled={!canManage}
                      value={formData.work_location}
                      onChange={handleFormChange}
                      placeholder="e.g. Headquarters - Floor 3"
                      className="form-input"
                      style={{ opacity: canManage ? 1 : 0.85, cursor: canManage ? 'text' : 'default' }}
                    />
                  </div>

                  <div className="form-field-group">
                    <label className="form-label" htmlFor="emp-company">
                      Company
                    </label>
                    <input
                      type="text"
                      id="emp-company"
                      name="company"
                      disabled={!canManage}
                      value={formData.company}
                      onChange={handleFormChange}
                      className="form-input"
                      style={{ opacity: canManage ? 1 : 0.85, cursor: canManage ? 'text' : 'default' }}
                    />
                  </div>
                </div>

                <div className="form-field-group">
                  <label className="form-label" htmlFor="emp-schedule">
                    Working Schedule
                  </label>
                  <select
                    id="emp-schedule"
                    name="working_schedule_id"
                    disabled={!canManage}
                    value={formData.working_schedule_id}
                    onChange={handleFormChange}
                    className="form-select"
                    style={{ opacity: canManage ? 1 : 0.85, cursor: canManage ? 'pointer' : 'default' }}
                  >
                    <option value="">-- Select Working Schedule --</option>
                    {workingSchedules.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.hours_per_week}h/week, {s.days_per_week} days)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCloseModal}
                  disabled={submitting}
                >
                  {canManage ? 'Cancel' : 'Close'}
                </button>
                {canManage && (
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={submitting}
                  >
                    {submitting 
                      ? 'Saving to DB...' 
                      : selectedEmployee 
                        ? 'Update Employee' 
                        : 'Create Employee'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeesPage;
