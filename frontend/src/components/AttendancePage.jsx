import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  X, 
  AlertCircle, 
  Calendar, 
  User, 
  LogIn, 
  LogOut, 
  Timer, 
  Search, 
  Building,
  ArrowRight
} from 'lucide-react';
import Navbar from './Navbar';
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
  const [elapsedString, setElapsedString] = useState('00:00:00');

  // Attendance log data
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Admin Manual Entry Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formData, setFormData] = useState({
    employee_id: '',
    check_in: '',
    check_out: '',
    notes: ''
  });

  const isAdminOrHr = user && ['admin', 'hr_manager', 'hr_payroll_user', 'hr_payroll_admin'].includes(user.role);

  // Load all initial data
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
      if (widgetData.check_in_time) {
        setCheckInTime(widgetData.check_in_time);
      } else {
        setCheckInTime(null);
      }
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
      setElapsedString('00:00:00');
      return;
    }

    const updateTimer = () => {
      const startTime = new Date(checkInTime).getTime();
      const now = new Date().getTime();
      const diffMs = Math.max(0, now - startTime);

      const totalSec = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSec / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);
      const seconds = totalSec % 60;

      const pad = (n) => String(n).padStart(2, '0');
      setElapsedString(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
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
        showToast(`Checked out successfully! Worked: ${res.worked_hours?.toFixed(2) || '0'} hrs`);
      } else {
        const res = await checkIn();
        showToast('Checked in successfully! Shift started.');
      }
      window.dispatchEvent(new Event('attendance-updated'));
      await loadData();
    } catch (err) {
      setError(err.message || 'Action failed');
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
      setIsModalOpen(false);
      setFormData({
        employee_id: employees.length > 0 ? employees[0].id : '',
        check_in: '',
        check_out: '',
        notes: ''
      });
      await loadData();
    } catch (err) {
      console.error('Error creating attendance record:', err);
      setFormError(err.message || 'Failed to create record');
    } finally {
      setSubmitting(false);
    }
  };

  // Format date helper
  const formatDateTime = (isoString) => {
    if (!isoString) return '--';
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Filter records
  const filteredRecords = records.filter(r => {
    const term = searchTerm.toLowerCase();
    const nameMatch = r.employee_name && r.employee_name.toLowerCase().includes(term);
    const idMatch = String(r.employee_id).includes(term);
    const notesMatch = r.notes && r.notes.toLowerCase().includes(term);
    return !searchTerm || nameMatch || idMatch || notesMatch;
  });

  return (
    <div className="app-layout-shell">
      <Navbar activeModule="attendance" />

      <main className="app-layout-main">
        <div className="employees-page">
          {/* Header */}
          <div className="employees-toolbar" style={{ alignItems: 'flex-start' }}>
            <div className="employees-header">
              <h1 className="employees-title">Attendance Tracking</h1>
              <p className="employees-subtitle">
                Real-time check-in status, daily work hours, and attendance shift records.
              </p>
            </div>

            {isAdminOrHr && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => setIsModalOpen(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                id="btn-manual-attendance"
              >
                <Plus size={16} />
                <span>Manual Entry</span>
              </button>
            )}
          </div>

          {/* Success Toast Notification */}
          {successToast && (
            <div className="toast-notification success" role="status">
              <CheckCircle2 size={16} className="toast-icon" />
              <span>{successToast}</span>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="toast-notification error" role="alert" style={{ marginBottom: '16px' }}>
              <AlertCircle size={16} className="toast-icon" />
              <span>{error}</span>
            </div>
          )}

          {/* Hero Shift Card */}
          <div className="attendance-hero-card">
            <div className="attendance-hero-info">
              <div className="attendance-hero-status">
                <span 
                  style={{
                    display: 'inline-block',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: isCheckedIn ? 'var(--color-success)' : 'var(--color-danger)'
                  }} 
                />
                <span style={{ fontWeight: 600, color: 'var(--neutral-800)' }}>
                  {isCheckedIn ? 'CURRENTLY WORKING' : 'CURRENTLY CHECKED OUT'}
                </span>
                {checkInTime && isCheckedIn && (
                  <span style={{ color: 'var(--neutral-500)' }}>
                    • Since {formatDateTime(checkInTime)}
                  </span>
                )}
              </div>

              <h2 className="attendance-hero-title">
                {isCheckedIn ? `Shift Active: ${elapsedString}` : 'Ready to start your work shift?'}
              </h2>

              <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--neutral-600)' }}>
                {isCheckedIn 
                  ? 'Your active working duration is being calculated in real time.'
                  : 'Click the button to check in and record your arrival timestamp.'}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--neutral-500)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Today's Worked Hours
                </div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--neutral-900)' }}>
                  {todayWorkedHours.toFixed(2)} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--neutral-500)' }}>hrs</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleShift}
                className={`btn-toggle-shift ${isCheckedIn ? 'is-check-out' : 'is-check-in'}`}
                id="btn-toggle-shift"
              >
                {isCheckedIn ? (
                  <>
                    <LogOut size={20} />
                    <span>Check Out</span>
                  </>
                ) : (
                  <>
                    <LogIn size={20} />
                    <span>Check In</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="leave-balance-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '20px' }}>
            <div className="leave-balance-card">
              <div className="balance-card-header">
                <span className="balance-card-title">Check-in Status</span>
                <span className={`status-pill ${isCheckedIn ? 'status-approved' : 'status-refused'}`}>
                  {isCheckedIn ? 'Active' : 'Offline'}
                </span>
              </div>
              <div className="balance-card-numbers">
                <span className="balance-big-num" style={{ fontSize: '20px' }}>
                  {isCheckedIn ? 'Present' : 'Not Working'}
                </span>
              </div>
            </div>

            <div className="leave-balance-card">
              <div className="balance-card-header">
                <span className="balance-card-title">Accumulated Hours</span>
                <Clock size={16} color="var(--color-primary)" />
              </div>
              <div className="balance-card-numbers">
                <span className="balance-big-num">{todayWorkedHours.toFixed(2)}</span>
                <span className="balance-sub-label">hours completed today</span>
              </div>
            </div>

            <div className="leave-balance-card">
              <div className="balance-card-header">
                <span className="balance-card-title">Total Records</span>
                <Calendar size={16} color="var(--color-primary)" />
              </div>
              <div className="balance-card-numbers">
                <span className="balance-big-num">{records.length}</span>
                <span className="balance-sub-label">logs in database</span>
              </div>
            </div>
          </div>

          {/* Attendance Log Table Section */}
          <div className="employees-table-container">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--neutral-200)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--neutral-900)' }}>
                  {isAdminOrHr ? 'All Employee Attendance Logs' : 'My Attendance Logs'}
                </h3>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--neutral-500)' }}>
                  Showing {filteredRecords.length} of {records.length} total entries
                </span>
              </div>

              <div className="employee-search-box" style={{ maxWidth: '280px' }}>
                <Search size={16} className="employee-search-icon" />
                <input
                  type="text"
                  placeholder="Filter by employee or note..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="employee-search-input"
                  id="search-attendance-input"
                />
              </div>
            </div>

            {loading ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--neutral-500)' }}>
                Loading attendance records...
              </div>
            ) : filteredRecords.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--neutral-500)' }}>
                No attendance logs found. Use the Check In button above to start your shift!
              </div>
            ) : (
              <table className="employees-table">
                <thead>
                  <tr>
                    <th>EMPLOYEE</th>
                    <th>CHECK IN</th>
                    <th>CHECK OUT</th>
                    <th>WORKED HOURS</th>
                    <th>OVERTIME</th>
                    <th>STATUS</th>
                    <th>NOTES</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((rec) => (
                    <tr key={rec.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div 
                            style={{ 
                              width: '32px', 
                              height: '32px', 
                              borderRadius: '50%', 
                              backgroundColor: 'var(--neutral-100)', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              color: 'var(--color-primary)', 
                              fontWeight: 700, 
                              fontSize: '12px' 
                            }}
                          >
                            {rec.employee_name ? rec.employee_name.slice(0, 2).toUpperCase() : `#${rec.employee_id}`}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--neutral-900)' }}>
                              {rec.employee_name || `Employee #${rec.employee_id}`}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--neutral-500)' }}>
                              ID: {rec.employee_id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 500, color: 'var(--neutral-800)' }}>
                          {formatDateTime(rec.check_in)}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {rec.check_out ? (
                          <span style={{ fontWeight: 500, color: 'var(--neutral-800)' }}>
                            {formatDateTime(rec.check_out)}
                          </span>
                        ) : (
                          <span className="status-pill status-pending">
                            Active Shift
                          </span>
                        )}
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--neutral-900)' }}>
                        {rec.worked_hours != null ? `${Number(rec.worked_hours).toFixed(2)} hrs` : '--'}
                      </td>
                      <td style={{ color: rec.overtime_hours > 0 ? 'var(--color-success)' : 'var(--neutral-500)', fontWeight: 600 }}>
                        {rec.overtime_hours > 0 ? `+${Number(rec.overtime_hours).toFixed(2)} hrs` : '0.00 hrs'}
                      </td>
                      <td>
                        <span className={`status-pill ${rec.check_out ? 'status-approved' : 'status-pending'}`}>
                          {rec.check_out ? 'Completed' : 'Working'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--neutral-600)', fontSize: 'var(--text-xs)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {rec.notes || '--'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* Admin Manual Entry Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Create Attendance Record</h2>
              <button 
                type="button" 
                className="modal-close-btn"
                onClick={() => setIsModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="modal-body">
                {formError && (
                  <div className="toast-notification error" style={{ marginBottom: '16px' }}>
                    <AlertCircle size={16} />
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
                        {emp.name} ({emp.work_email || `ID: ${emp.id}`})
                      </option>
                    ))}
                  </select>
                </div>

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
                  <label className="form-label">Check-Out Datetime (Optional)</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={formData.check_out}
                    onChange={(e) => setFormData({ ...formData, check_out: e.target.value })}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--neutral-500)', marginTop: '4px', display: 'block' }}>
                    Leave blank if employee is still working their shift.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes / Reason</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="E.g., Manual correction, on-site visit..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendancePage;
