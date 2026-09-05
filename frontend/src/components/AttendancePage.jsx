import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  LogIn, 
  LogOut, 
  Calendar,
  Filter,
  Info
} from 'lucide-react';
import AppLayout from './AppLayout';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../api/auth';
import { 
  getWidgetState, 
  checkIn, 
  checkOut, 
  listAttendance, 
  createAttendance 
} from '../api/attendance';
import { getEmployees } from '../api/employees';

const AttendancePage = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  // Widget state
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState(null);
  const [todayWorkedHours, setTodayWorkedHours] = useState(0.0);
  const [elapsedString, setElapsedString] = useState('0h 00m');

  // Attendance log data
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState('');

  // Admin Manual Entry Modal
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formData, setFormData] = useState({
    employee_id: '',
    check_in: '',
    check_out: '',
    notes: ''
  });

  useEffect(() => {
    setIsModalOpen(searchParams.get('modal') === 'manual');
  }, [searchParams]);

  const handleCloseModal = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      setSearchParams({});
    }
  };

  const isAdminOrHr = user && ['admin', 'hr_manager', 'hr_payroll_user', 'hr_payroll_admin'].includes(user.role);

  // Load initial data
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [userData, widgetData, attendanceData, empsData] = await Promise.all([
        getCurrentUser().catch(() => null),
        getWidgetState().catch(() => ({ is_checked_in: false, today_worked_hours: 0.0 })),
        listAttendance().catch(() => []),
        getEmployees().catch(() => [])
      ]);

      setUser(userData);
      setIsCheckedIn(widgetData.is_checked_in || false);
      setCheckInTime(widgetData.check_in_time || null);
      setTodayWorkedHours(widgetData.today_worked_hours || 0.0);
      setRecords(attendanceData || []);
      setEmployees(empsData || []);

      if (empsData && empsData.length > 0 && !formData.employee_id) {
        setFormData(prev => ({ ...prev, employee_id: empsData[0].id }));
      }
    } catch (err) {
      console.error('Failed to load attendance data:', err);
      setError(err.message || 'Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Live Timer for active check-in shift
  useEffect(() => {
    if (!isCheckedIn || !checkInTime) {
      setElapsedString('0h 00m');
      return;
    }

    const updateTimer = () => {
      const startTime = new Date(checkInTime).getTime();
      const now = new Date().getTime();
      const diffMs = Math.max(0, now - startTime);

      const totalSec = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSec / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);

      setElapsedString(`${hours}h ${String(minutes).padStart(2, '0')}m`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isCheckedIn, checkInTime]);

  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Toggle Check In / Check Out
  const handleToggleShift = async () => {
    try {
      if (isCheckedIn) {
        const res = await checkOut();
        showToast(`Checked out successfully! Shift worked: ${res.worked_hours ? Number(res.worked_hours).toFixed(2) : '0'} hrs`);
      } else {
        await checkIn();
        showToast('Checked in successfully! Shift started.');
      }
      window.dispatchEvent(new Event('attendance-updated'));
      await loadData();
    } catch (err) {
      setError(err.message || 'Shift action failed');
    }
  };

  // Handle Manual Attendance Submission
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      if (!formData.employee_id) {
        throw new Error('Please select an employee');
      }
      if (!formData.check_in) {
        throw new Error('Check-in timestamp is required');
      }

      await createAttendance({
        employee_id: parseInt(formData.employee_id, 10),
        check_in: new Date(formData.check_in).toISOString(),
        check_out: formData.check_out ? new Date(formData.check_out).toISOString() : null,
        notes: formData.notes.trim() || null
      });

      showToast('Attendance record created successfully!');
      handleCloseModal();
      setFormData({
        employee_id: employees.length > 0 ? employees[0].id : '',
        check_in: '',
        check_out: '',
        notes: ''
      });
      await loadData();
    } catch (err) {
      setFormError(err.message || 'Failed to create record');
    } finally {
      setSubmitting(false);
    }
  };

  // Format date helper
  const formatDateTime = (isoString) => {
    if (!isoString) return '—';
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatTimeOnly = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };



  const filteredRecords = records.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = r.employee_name && r.employee_name.toLowerCase().includes(q);
    const idMatch = String(r.employee_id).includes(q);
    const notesMatch = r.notes && r.notes.toLowerCase().includes(q);
    const matchesSearch = !q || nameMatch || idMatch || notesMatch;

    const matchesEmp = !selectedEmployeeFilter || String(r.employee_id) === String(selectedEmployeeFilter);

    return matchesSearch && matchesEmp;
  });

  return (
    <AppLayout activeModule="attendance">
      <div className="page-container">
        {/* Toast Alerts */}
        {successToast && (
          <div className="alert-box alert-box-success" style={{ marginBottom: '1.25rem' }}>
            <CheckCircle2 size={16} />
            <span>{successToast}</span>
          </div>
        )}

        {error && (
          <div className="alert-box alert-box-danger" style={{ marginBottom: '1.25rem' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Top Header Row per 03-attendance.md */}
        <div className="page-header-row" style={{ marginBottom: '1.5rem' }}>
          <div>
            <h1 className="page-title font-display">Attendance</h1>
            <p className="page-subtitle">
              Real-time shift activity, daily worked hours, and employee attendance logs.
            </p>
          </div>

          <div className="page-actions-group">
            {isAdminOrHr && (
              <button
                type="button"
                className="btn-coral"
                onClick={() => {
                  setFormError(null);
                  setSearchParams({ modal: 'manual' });
                }}
                id="btn-manual-attendance"
              >
                <Plus size={16} />
                <span>New</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Check-in Hero Widget Card per 03-attendance.md §Attendance Quick Widget */}
        <div className="attendance-hero-card">
          <div className="attendance-hero-info">
            <div className="attendance-hero-badge">
              <span className={isCheckedIn ? 'pulse-dot-live' : 'pulse-dot-idle'} />
              <span style={{ color: isCheckedIn ? 'var(--success)' : 'var(--text-secondary)' }}>
                {isCheckedIn ? 'Shift Active' : 'Checked Out'}
              </span>
            </div>

            <h2 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
              Welcome back, {user?.name || 'Team Member'}!
            </h2>

            <div className="attendance-hero-duration">
              {isCheckedIn ? (
                <span>
                  {formatTimeOnly(checkInTime)} — Now <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>·</span> {elapsedString}
                </span>
              ) : (
                <span style={{ fontSize: '1.5rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  Ready to start your work day?
                </span>
              )}
            </div>

            <div className="attendance-hero-sub">
              Today: <strong>{todayWorkedHours.toFixed(2)}h</strong> completed
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <div className="attendance-metric-col">
              <div className="attendance-metric-label">Today's Total</div>
              <div className="attendance-metric-value">
                {todayWorkedHours.toFixed(2)}
                <span className="attendance-metric-unit">hrs</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleShift}
              className="btn-toggle-shift"
              id="btn-toggle-shift"
            >
              {isCheckedIn ? (
                <>
                  <LogOut size={18} />
                  <span>Check Out</span>
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Check In</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Notes / Provenance panel per 03-attendance.md §Notes panel */}


        {/* List Toolbar per 03-attendance.md §Screen: Attendance — List */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '1.25rem'
        }}>
          {/* Search Pill */}
          <div className="search-pill-container" style={{ minWidth: '280px' }}>
            <Search size={15} className="search-pill-icon" />
            <input
              type="text"
              placeholder="Search by employee name or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-pill-input"
              id="search-attendance-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="search-clear-btn"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filter Pills per 03-attendance.md: "Employee: {name}" */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>


            {isAdminOrHr && employees.length > 0 && (
              <select
                className={`filter-pill ${selectedEmployeeFilter ? 'is-active' : ''}`}
                value={selectedEmployeeFilter}
                onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                <option value="">Employee: All</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    Employee: {emp.name}
                  </option>
                ))}
              </select>
            )}

            {(selectedEmployeeFilter || searchQuery) && (
              <button
                type="button"
                className="filter-pill"
                onClick={() => {
                  setSelectedEmployeeFilter('');
                  setSearchQuery('');
                }}
                style={{ color: 'var(--danger)', borderColor: 'rgba(220, 38, 38, 0.2)' }}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Attendance Table per 03-attendance.md */}
        <div className="table-wrapper">
          <table className="daybook-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th style={{ textAlign: 'right' }}>Worked Hours</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Loading attendance records...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No attendance records found matching filters.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const isCheckedOut = Boolean(rec.check_out);
                  const isAbsent = !rec.check_in && !rec.check_out;

                  return (
                    <tr key={rec.id}>
                      {/* Employee with avatar */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="avatar-circle-sm" style={{ background: 'var(--ink)' }}>
                            {rec.employee_name ? rec.employee_name.slice(0, 2).toUpperCase() : `#${rec.employee_id}`}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--ink)' }}>
                              {rec.employee_name || `Employee #${rec.employee_id}`}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              ID: {rec.employee_id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Check In */}
                      <td>
                        <span style={{ fontSize: '0.84rem', color: 'var(--ink)' }}>
                          {isAbsent ? '—' : formatDateTime(rec.check_in)}
                        </span>
                      </td>

                      {/* Check Out */}
                      <td>
                        <span style={{ fontSize: '0.84rem', color: isCheckedOut ? 'var(--ink)' : 'var(--coral)' }}>
                          {isCheckedOut ? formatDateTime(rec.check_out) : (
                            <span className="status-pill status-pill-warning">
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--warning)', display: 'inline-block', marginRight: '5px' }} />
                              In Progress
                            </span>
                          )}
                        </span>
                      </td>

                      {/* Worked Hours in JetBrains Mono per 03-attendance.md */}
                      <td className="wage-mono">
                        {rec.worked_hours != null ? `${Number(rec.worked_hours).toFixed(2)}h` : '—'}
                      </td>

                      {/* Status Pill: Present (success soft with 6px dot) / Absent (danger soft) */}
                      <td>
                        {isAbsent ? (
                          <span className="status-pill status-pill-danger">
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--danger)', display: 'inline-block', marginRight: '5px' }} />
                            Absent
                          </span>
                        ) : (
                          <span className="status-pill status-pill-success">
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)', display: 'inline-block', marginRight: '5px' }} />
                            Present
                          </span>
                        )}
                      </td>

                      {/* Notes */}
                      <td>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                          {rec.notes || '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Entry Modal per 03-attendance.md §Attendance — Form */}
      {isModalOpen && (
        <div className="daybook-modal-backdrop" onClick={handleCloseModal}>
          <div className="daybook-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="daybook-modal-header">
              <h2 className="daybook-modal-title">Manual Attendance Entry</h2>
              <button 
                type="button" 
                className="daybook-modal-close"
                onClick={handleCloseModal}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="daybook-modal-body">
                {formError && (
                  <div className="alert-box alert-box-danger">
                    <AlertCircle size={15} />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Employee *</label>
                  <select
                    className="form-select"
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    required
                  >
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.work_email || emp.job_position || `ID: ${emp.id}`})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-grid-2col">
                  <div className="form-group">
                    <label className="form-label">Check-In Datetime *</label>
                    <input
                      type="datetime-local"
                      className="form-input"
                      value={formData.check_in}
                      onChange={(e) => setFormData({ ...formData, check_in: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Check-Out Datetime</label>
                    <input
                      type="datetime-local"
                      className="form-input"
                      value={formData.check_out}
                      onChange={(e) => setFormData({ ...formData, check_out: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes / Reason</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="E.g., On-site client meeting, manual correction..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="daybook-modal-footer">
                <button
                  type="button"
                  className="btn-outline"
                  onClick={handleCloseModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-coral"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default AttendancePage;
