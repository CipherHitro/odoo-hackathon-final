import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Calendar,
  Clock,
  X,
  Building,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Trash2,
  Eye
} from 'lucide-react';
import Navbar from './Navbar';
import { getCurrentUser } from '../api/auth';
import {
  getWorkingSchedules,
  createWorkingSchedule,
  updateWorkingSchedule,
  deleteWorkingSchedule
} from '../api/employees';

const DEFAULT_WEEKLY_LINES = [
  { day_of_week: 'Monday', start_time: '09:00', end_time: '18:00', break_hours: 1.0, work_hours: 8.0 },
  { day_of_week: 'Tuesday', start_time: '09:00', end_time: '18:00', break_hours: 1.0, work_hours: 8.0 },
  { day_of_week: 'Wednesday', start_time: '09:00', end_time: '18:00', break_hours: 1.0, work_hours: 8.0 },
  { day_of_week: 'Thursday', start_time: '09:00', end_time: '18:00', break_hours: 1.0, work_hours: 8.0 },
  { day_of_week: 'Friday', start_time: '09:00', end_time: '18:00', break_hours: 1.0, work_hours: 8.0 }
];

const WorkingSchedulesPage = () => {
  const [schedules, setSchedules] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  // Current user & role permissions
  const [currentUser, setCurrentUser] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // View state: 'list' or 'form'
  const [currentView, setCurrentView] = useState('list');
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  // Form State
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    company: 'My Company',
    days_per_week: 5,
    hours_per_week: 40.0,
    timezone: 'Asia/Kolkata (IST)',
    is_active: true,
    schedule_lines: [...DEFAULT_WEEKLY_LINES]
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [data, user] = await Promise.all([
        getWorkingSchedules(),
        getCurrentUser().catch(() => null)
      ]);
      setSchedules(data || []);
      if (user) {
        setCurrentUser(user);
      }
    } catch (err) {
      console.error('Error fetching working schedules:', err);
      setError(err.message || 'Failed to load working schedules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Authorized to manage (create, edit, delete): admin, hr_manager, hr_payroll_admin, hr_payroll_user
  // Employee role has read-only access (can view, but cannot update, create, or delete)
  const userRole = (currentUser?.role || '').toLowerCase();
  const canManage = ['admin', 'hr_manager', 'hr_payroll_admin', 'hr_payroll_user'].includes(userRole);
  const isEmployee = userRole === 'employee';

  const filteredSchedules = schedules.filter((s) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return s.name.toLowerCase().includes(term) || (s.company && s.company.toLowerCase().includes(term));
  });

  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleOpenCreateForm = () => {
    if (!canManage) return;
    setSelectedSchedule(null);
    setFormData({
      name: '',
      company: 'My Company',
      days_per_week: 5,
      hours_per_week: 40.0,
      timezone: 'Asia/Kolkata (IST)',
      is_active: true,
      schedule_lines: [...DEFAULT_WEEKLY_LINES]
    });
    setFormError(null);
    setCurrentView('form');
  };

  const handleSelectSchedule = (sched) => {
    setSelectedSchedule(sched);
    setFormData({
      name: sched.name || '',
      company: sched.company || 'My Company',
      days_per_week: sched.days_per_week ?? 5,
      hours_per_week: sched.hours_per_week ?? 40.0,
      timezone: sched.timezone || 'Asia/Kolkata (IST)',
      is_active: sched.is_active ?? true,
      schedule_lines: sched.schedule_lines && sched.schedule_lines.length > 0
        ? sched.schedule_lines
        : [...DEFAULT_WEEKLY_LINES]
    });
    setFormError(null);
    setCurrentView('form');
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedSchedule(null);
    setFormError(null);
  };

  const handleDeleteSchedule = async (sched) => {
    if (!sched || !sched.id) return;
    if (!canManage) {
      setError('You do not have permission to delete working schedules.');
      return;
    }

    const confirmMsg = `Are you sure you want to delete the schedule "${sched.name}"?\n\nAny employees or contracts assigned to this schedule will be safely unassigned.`;
    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      setDeleting(true);
      setError(null);
      await deleteWorkingSchedule(sched.id);
      showToast(`Schedule "${sched.name}" deleted successfully!`);
      if (currentView === 'form') {
        handleBackToList();
      }
      await loadData();
    } catch (err) {
      console.error('Error deleting schedule:', err);
      setError(err.message || 'Failed to delete working schedule');
    } finally {
      setDeleting(false);
    }
  };

  const handleAddDay = () => {
    if (!canManage) return;
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const currentCount = formData.schedule_lines.length;
    const nextDay = days[currentCount % days.length];
    setFormData((prev) => ({
      ...prev,
      schedule_lines: [
        ...prev.schedule_lines,
        { day_of_week: nextDay, start_time: '09:00', end_time: '18:00', break_hours: 1.0, work_hours: 8.0 }
      ]
    }));
  };

  const handleRemoveDay = (index) => {
    if (!canManage) return;
    setFormData((prev) => ({
      ...prev,
      schedule_lines: prev.schedule_lines.filter((_, i) => i !== index)
    }));
  };

  const handleLineChange = (index, field, value) => {
    if (!canManage) return;
    setFormData((prev) => {
      const updated = [...prev.schedule_lines];
      updated[index] = { ...updated[index], [field]: value };

      if (field === 'start_time' || field === 'end_time' || field === 'break_hours') {
        const [startH, startM] = (updated[index].start_time || '09:00').split(':').map(Number);
        const [endH, endM] = (updated[index].end_time || '18:00').split(':').map(Number);
        const breakH = parseFloat(updated[index].break_hours) || 0;
        const totalHours = Math.max(0, (endH + endM / 60) - (startH + startM / 60) - breakH);
        updated[index].work_hours = Math.round(totalHours * 10) / 10;
      }

      const newTotal = updated.reduce(
        (acc, line) => acc + (parseFloat(line.work_hours) || 0),
        0
      );

      // Auto-update hours in the name if it follows standard pattern (e.g. "Standard 40 Hours/Week")
      let updatedName = prev.name;
      if (/\b\d+(\.\d+)?\s*(Hours|hrs|h)\/week\b/i.test(updatedName)) {
        updatedName = updatedName.replace(/\b\d+(\.\d+)?\s*(Hours|hrs|h)\/week\b/i, `${newTotal} Hours/Week`);
      }

      return { ...prev, schedule_lines: updated, name: updatedName };
    });
  };

  const totalCalculatedHours = formData.schedule_lines.reduce(
    (acc, line) => acc + (parseFloat(line.work_hours) || 0),
    0
  );

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!canManage) {
      setFormError('Employees have read-only access and cannot modify working schedules.');
      return;
    }
    if (!formData.name.trim()) {
      setFormError('Schedule name is required');
      return;
    }
    setSubmitting(true);
    setFormError(null);

    try {
      if (selectedSchedule) {
        // UPDATE existing schedule
        const updatePayload = {
          name: formData.name.trim(),
          company: formData.company.trim() || 'My Company',
          days_per_week: formData.schedule_lines.length,
          hours_per_week: totalCalculatedHours,
          timezone: formData.timezone.trim() || 'Asia/Kolkata (IST)',
          is_active: formData.is_active
        };
        await updateWorkingSchedule(selectedSchedule.id, updatePayload);
        showToast('Working schedule updated successfully!');
      } else {
        // CREATE new schedule
        const payload = {
          name: formData.name.trim(),
          company: formData.company.trim() || 'My Company',
          days_per_week: formData.schedule_lines.length,
          hours_per_week: totalCalculatedHours,
          timezone: formData.timezone.trim() || 'Asia/Kolkata (IST)',
          is_active: formData.is_active,
          schedule_lines: formData.schedule_lines.map((line) => ({
            day_of_week: line.day_of_week,
            start_time: line.start_time,
            end_time: line.end_time,
            break_hours: parseFloat(line.break_hours) || 1.0,
            work_hours: parseFloat(line.work_hours) || 8.0
          }))
        };
        await createWorkingSchedule(payload);
        showToast('Working schedule created successfully!');
      }

      await loadData();
      handleBackToList();
    } catch (err) {
      setFormError(err.message || 'Failed to save working schedule');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-layout-shell">
      <Navbar activeModule="employees" />

      <main className="app-layout-main">
        <div className="employees-page">
          {/* List View */}
          {currentView === 'list' ? (
            <>
              {/* Header */}
              <div className="employees-header">
                <h1 className="employees-title">Working Schedules</h1>
                <p className="employees-subtitle">
                  Define working hours, weekly shifts, and timezone parameters
                </p>
              </div>

              {/* Action Toolbar */}
              <div className="employees-toolbar">
                <div className="employees-toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                  {canManage && (
                    <button
                      type="button"
                      className="btn-new-employee"
                      onClick={handleOpenCreateForm}
                      id="btn-new-schedule"
                    >
                      <Plus size={16} />
                      <span>NEW SCHEDULE</span>
                    </button>
                  )}

                  <div className="employee-search-box" style={{ flex: 1, maxWidth: '360px' }}>
                    <Search size={16} className="employee-search-icon" />
                    <input
                      type="text"
                      placeholder="Search schedules..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="employee-search-input"
                      id="search-schedules-input"
                    />
                  </div>

                  {isEmployee && (
                    <div style={{
                      marginLeft: 'auto',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: 'var(--r-pill, 999px)',
                      backgroundColor: 'var(--neutral-100, #F1F5F9)',
                      color: 'var(--text-secondary, #475569)',
                      fontSize: '12px',
                      fontWeight: 600,
                      border: '1px solid var(--neutral-200, #E2E8F0)'
                    }}>
                      <Eye size={14} />
                      <span>Read-only View (Employee)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Toast / Alerts */}
              {successToast && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  backgroundColor: 'var(--color-success-bg, rgba(47, 163, 107, 0.12))',
                  border: '1px solid var(--color-success, #2FA36B)',
                  borderRadius: 'var(--radius-md, 6px)',
                  color: 'var(--color-success, #2FA36B)',
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
                  backgroundColor: 'var(--color-danger-bg, rgba(225, 82, 82, 0.12))',
                  border: '1px solid var(--color-danger, #E15252)',
                  borderRadius: 'var(--radius-md, 6px)',
                  color: 'var(--color-danger, #E15252)',
                  fontSize: 'var(--text-sm)'
                }}>
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {/* Table View matching 01-employees.md §59 */}
              {loading ? (
                <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Loading working schedules...
                </div>
              ) : filteredSchedules.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '48px 24px',
                  backgroundColor: 'var(--card)',
                  borderRadius: 'var(--r-lg, 16px)',
                  border: '1px dashed var(--border)',
                  color: 'var(--text-secondary)'
                }}>
                  <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>No working schedules found</p>
                  <p style={{ margin: 0, fontSize: '13px' }}>
                    {canManage ? 'Click "NEW SCHEDULE" above to define one.' : 'No working schedules are currently available.'}
                  </p>
                </div>
              ) : (
                <div className="employee-table-card">
                  <table className="employee-table">
                    <thead>
                      <tr>
                        <th>Schedule Name</th>
                        <th>Days / Week</th>
                        <th>Hours / Week</th>
                        <th>Company</th>
                        <th>Status</th>
                        {canManage && <th style={{ width: '80px', textAlign: 'center' }}>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSchedules.map((sched) => (
                        <tr
                          key={sched.id}
                          className="employee-table-row"
                          onClick={() => handleSelectSchedule(sched)}
                          title="Click to view working schedule"
                        >
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div
                                className="employee-cell-avatar"
                                style={{ backgroundColor: 'var(--sky, #6F93E3)' }}
                              >
                                <Calendar size={15} color="#FFFFFF" />
                              </div>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {sched.name}
                              </span>
                            </div>
                          </td>
                          <td>{sched.days_per_week ?? 5} days</td>
                          <td>
                            <span style={{ fontWeight: 600 }}>
                              {sched.hours_per_week ?? 40} hrs
                            </span>
                          </td>
                          <td>{sched.company || 'My Company'}</td>
                          <td>
                            <div className={`employee-status-indicator ${sched.is_active ? 'is-active' : 'is-inactive'}`}>
                              <span className={`status-bullet ${sched.is_active ? 'is-active' : 'is-inactive'}`} />
                              <span>{sched.is_active ? 'Active' : 'Inactive'}</span>
                            </div>
                          </td>
                          {canManage && (
                            <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => handleDeleteSchedule(sched)}
                                disabled={deleting}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--color-danger, #DC2626)',
                                  cursor: deleting ? 'not-allowed' : 'pointer',
                                  padding: '6px 8px',
                                  borderRadius: 'var(--radius-sm, 4px)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'background-color 0.15s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-danger-bg, #FEF2F2)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                title={`Delete "${sched.name}"`}
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Useful Note Footer */}
              <div className="useful-note-footer">
                <span>
                  <strong>Useful note:</strong> Selected schedules are automatically linked to employee contracts and attendance tracking logic.
                </span>
              </div>
            </>
          ) : (
            /* Form / Detail View matching 01-employees.md §61-§68 */
            <div style={{
              backgroundColor: 'var(--card, #FFFFFF)',
              border: '1px solid var(--border, #E8E9EC)',
              borderRadius: 'var(--r-lg, 16px)',
              padding: '24px',
              boxShadow: 'var(--shadow-card)'
            }}>
              {/* Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '20px',
                borderBottom: '1px solid var(--border)'
              }}>
                <button
                  type="button"
                  onClick={handleBackToList}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                >
                  <ArrowLeft size={16} />
                  <span>Back to list</span>
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h2 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '20px',
                    fontWeight: 600,
                    margin: 0,
                    color: 'var(--ink)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <span>{selectedSchedule ? formData.name : 'New Working Schedule'}</span>
                    <span style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 'var(--r-pill, 999px)',
                      backgroundColor: 'var(--muted, #EFEFF2)',
                      color: 'var(--text-secondary, #888D96)'
                    }}>
                      {totalCalculatedHours} hrs/week
                    </span>
                  </h2>

                  {!canManage && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '12px',
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: 'var(--r-pill, 999px)',
                      backgroundColor: 'var(--neutral-100, #F1F5F9)',
                      color: 'var(--text-secondary, #475569)',
                      border: '1px solid var(--neutral-200, #E2E8F0)'
                    }}>
                      <Eye size={13} />
                      Read-only (Employee View)
                    </span>
                  )}
                </div>
              </div>

              {formError && (
                <div style={{
                  marginTop: '16px',
                  padding: '10px 14px',
                  backgroundColor: 'var(--color-danger-bg, rgba(225, 82, 82, 0.12))',
                  border: '1px solid var(--color-danger, #E15252)',
                  borderRadius: 'var(--radius-sm, 4px)',
                  color: 'var(--color-danger, #E15252)',
                  fontSize: 'var(--text-xs)'
                }}>
                  {formError}
                </div>
              )}

              <form onSubmit={handleFormSubmit} style={{ marginTop: '20px' }}>
                {/* Top Fields: 2-column grid */}
                <div className="form-grid-2">
                  <div className="form-field-group">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label className="form-label">Schedule Name *</label>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => {
                              let newName = prev.name;
                              if (/\b\d+(\.\d+)?\s*(Hours|hrs|h)\b/i.test(newName)) {
                                newName = newName.replace(/\b\d+(\.\d+)?\s*(Hours|hrs|h)\b/i, `${totalCalculatedHours} Hours`);
                              } else {
                                newName = `${newName} (${totalCalculatedHours} Hours/Week)`;
                              }
                              return { ...prev, name: newName };
                            });
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--coral, #F1502A)',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: 0
                          }}
                          title="Sync schedule title with calculated total hours"
                        >
                          Sync title to {totalCalculatedHours}h
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Standard 40 Hours/Week"
                      value={formData.name}
                      disabled={!canManage}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      className="form-input"
                      style={{ opacity: canManage ? 1 : 0.85, cursor: canManage ? 'text' : 'default' }}
                    />
                  </div>

                  <div className="form-field-group">
                    <label className="form-label">Company</label>
                    <input
                      type="text"
                      value={formData.company}
                      disabled={!canManage}
                      onChange={(e) => setFormData((prev) => ({ ...prev, company: e.target.value }))}
                      className="form-input"
                      style={{ opacity: canManage ? 1 : 0.85, cursor: canManage ? 'text' : 'default' }}
                    />
                  </div>
                </div>

                <div className="form-grid-2" style={{ marginTop: '16px' }}>
                  <div className="form-field-group">
                    <label className="form-label">Days per Week</label>
                    <input
                      type="number"
                      readOnly
                      value={formData.schedule_lines.length}
                      className="form-input"
                      style={{ opacity: 0.8, cursor: 'default' }}
                    />
                  </div>

                  <div className="form-field-group">
                    <label className="form-label">Hours per Week (Calculated)</label>
                    <input
                      type="number"
                      readOnly
                      value={totalCalculatedHours}
                      className="form-input"
                      style={{ opacity: 0.8, cursor: 'default' }}
                    />
                  </div>
                </div>

                <div className="form-grid-2" style={{ marginTop: '16px' }}>
                  <div className="form-field-group">
                    <label className="form-label">Timezone</label>
                    <input
                      type="text"
                      value={formData.timezone}
                      disabled={!canManage}
                      onChange={(e) => setFormData((prev) => ({ ...prev, timezone: e.target.value }))}
                      className="form-input"
                      style={{ opacity: canManage ? 1 : 0.85, cursor: canManage ? 'text' : 'default' }}
                    />
                  </div>

                  <div className="form-field-group">
                    <label className="form-label">Status</label>
                    <select
                      value={formData.is_active ? 'active' : 'inactive'}
                      disabled={!canManage}
                      onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.value === 'active' }))}
                      className="form-select"
                      style={{ opacity: canManage ? 1 : 0.85, cursor: canManage ? 'pointer' : 'default' }}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* Weekly Schedule Table (§66–§67) */}
                <div style={{ marginTop: '30px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '12px'
                  }}>
                    <h3 style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '16px',
                      fontWeight: 600,
                      margin: 0,
                      color: 'var(--ink)'
                    }}>
                      Weekly Schedule Lines
                    </h3>
                    {canManage && (
                      <button
                        type="button"
                        onClick={handleAddDay}
                        className="btn-secondary"
                        style={{ height: '32px', fontSize: '12px' }}
                      >
                        + Add Day
                      </button>
                    )}
                  </div>

                  <div className="employee-table-card">
                    <table className="employee-table">
                      <thead>
                        <tr>
                          <th>Day</th>
                          <th>Start Time</th>
                          <th>End Time</th>
                          <th>Break (Hours)</th>
                          <th>Work Hours</th>
                          {canManage && <th style={{ width: '40px' }}></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {formData.schedule_lines.map((line, idx) => (
                          <tr key={idx}>
                            <td>
                              <input
                                type="text"
                                value={line.day_of_week}
                                disabled={!canManage}
                                onChange={(e) => handleLineChange(idx, 'day_of_week', e.target.value)}
                                style={{
                                  border: '1px solid var(--border)',
                                  borderRadius: 'var(--radius-sm)',
                                  padding: '4px 8px',
                                  fontSize: '13px',
                                  background: canManage ? 'var(--card)' : 'var(--neutral-50, #F8FAFC)',
                                  cursor: canManage ? 'text' : 'default',
                                  opacity: canManage ? 1 : 0.85
                                }}
                              />
                            </td>
                            <td>
                              <input
                                type="time"
                                value={line.start_time}
                                disabled={!canManage}
                                onChange={(e) => handleLineChange(idx, 'start_time', e.target.value)}
                                style={{
                                  border: '1px solid var(--border)',
                                  borderRadius: 'var(--radius-sm)',
                                  padding: '4px 8px',
                                  fontSize: '13px',
                                  background: canManage ? 'var(--card)' : 'var(--neutral-50, #F8FAFC)',
                                  cursor: canManage ? 'text' : 'default',
                                  opacity: canManage ? 1 : 0.85
                                }}
                              />
                            </td>
                            <td>
                              <input
                                type="time"
                                value={line.end_time}
                                disabled={!canManage}
                                onChange={(e) => handleLineChange(idx, 'end_time', e.target.value)}
                                style={{
                                  border: '1px solid var(--border)',
                                  borderRadius: 'var(--radius-sm)',
                                  padding: '4px 8px',
                                  fontSize: '13px',
                                  background: canManage ? 'var(--card)' : 'var(--neutral-50, #F8FAFC)',
                                  cursor: canManage ? 'text' : 'default',
                                  opacity: canManage ? 1 : 0.85
                                }}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.5"
                                value={line.break_hours}
                                disabled={!canManage}
                                onChange={(e) => handleLineChange(idx, 'break_hours', e.target.value)}
                                style={{
                                  width: '70px',
                                  border: '1px solid var(--border)',
                                  borderRadius: 'var(--radius-sm)',
                                  padding: '4px 8px',
                                  fontSize: '13px',
                                  background: canManage ? 'var(--card)' : 'var(--neutral-50, #F8FAFC)',
                                  cursor: canManage ? 'text' : 'default',
                                  opacity: canManage ? 1 : 0.85
                                }}
                              />
                            </td>
                            <td>
                              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                                {line.work_hours}h
                              </span>
                            </td>
                            {canManage && (
                              <td>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDay(idx)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    padding: '4px'
                                  }}
                                  title="Remove day"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Footer total */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    marginTop: '12px',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: 'var(--ink)'
                  }}>
                    Total Weekly Hours: {totalCalculatedHours}h
                  </div>
                </div>

                {/* Form Actions */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  marginTop: '28px',
                  paddingTop: '20px',
                  borderTop: '1px solid var(--border)'
                }}>
                  {/* Left: Delete Schedule (Admins/HR only on existing schedules) */}
                  <div>
                    {canManage && selectedSchedule && (
                      <button
                        type="button"
                        onClick={() => handleDeleteSchedule(selectedSchedule)}
                        disabled={submitting || deleting}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '9px 16px',
                          backgroundColor: 'transparent',
                          border: '1px solid var(--color-danger, #DC2626)',
                          borderRadius: 'var(--radius-md, 8px)',
                          color: 'var(--color-danger, #DC2626)',
                          cursor: (submitting || deleting) ? 'not-allowed' : 'pointer',
                          fontSize: '13px',
                          fontWeight: 600,
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (!submitting && !deleting) {
                            e.currentTarget.style.backgroundColor = 'var(--color-danger, #DC2626)';
                            e.currentTarget.style.color = '#FFFFFF';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = 'var(--color-danger, #DC2626)';
                        }}
                        id="btn-delete-schedule"
                      >
                        <Trash2 size={16} />
                        <span>{deleting ? 'Deleting...' : 'Delete Schedule'}</span>
                      </button>
                    )}
                  </div>

                  {/* Right: Cancel & Save */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleBackToList}
                      disabled={submitting || deleting}
                    >
                      {canManage ? 'Cancel' : 'Back to list'}
                    </button>
                    {canManage && (
                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={submitting || deleting}
                        id="btn-save-schedule"
                      >
                        {submitting ? 'Saving...' : 'Save Schedule'}
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default WorkingSchedulesPage;
