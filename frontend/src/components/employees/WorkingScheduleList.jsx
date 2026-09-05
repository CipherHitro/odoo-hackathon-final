import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Calendar, 
  List as ListIcon, 
  ArrowLeft, 
  SlidersHorizontal,
  X,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Coffee,
  Briefcase,
  Globe,
  Edit2
} from 'lucide-react';
import AppLayout from '../AppLayout';
import { 
  getWorkingSchedules, 
  getWorkingScheduleById, 
  createWorkingSchedule, 
  updateWorkingSchedule 
} from '../../api/employees';
import { getCurrentUser } from '../../api/auth';
import { canManageEmployees } from '../../utils/rbac';

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday', short: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { key: 'thursday', label: 'Thursday', short: 'Thu' },
  { key: 'friday', label: 'Friday', short: 'Fri' },
  { key: 'saturday', label: 'Saturday', short: 'Sat' },
  { key: 'sunday', label: 'Sunday', short: 'Sun' },
];

const DEFAULT_DAYS = [
  { day_of_week: 'monday', work_from: '09:00', work_to: '17:00', break_hours: 1.0 },
  { day_of_week: 'tuesday', work_from: '09:00', work_to: '17:00', break_hours: 1.0 },
  { day_of_week: 'wednesday', work_from: '09:00', work_to: '17:00', break_hours: 1.0 },
  { day_of_week: 'thursday', work_from: '09:00', work_to: '17:00', break_hours: 1.0 },
  { day_of_week: 'friday', work_from: '09:00', work_to: '17:00', break_hours: 1.0 },
];

const WorkingScheduleList = () => {
  const [schedules, setSchedules] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('list'); // 'list' | 'calendar'
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    company: 'My Company (San Francisco)',
    days_per_week: 5,
    hours_per_week: 40.0,
    timezone: 'America/Los_Angeles',
    is_active: true,
    lines: DEFAULT_DAYS,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [data, me] = await Promise.all([
        getWorkingSchedules(),
        getCurrentUser().catch(() => null),
      ]);
      setSchedules(data || []);
      setCurrentUser(me);
    } catch (err) {
      console.error('Error fetching schedules', err);
      showNotice('error', err.message || 'Failed to load schedules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotice = (type, text) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 3500);
  };

  const [selectedCalendarScheduleId, setSelectedCalendarScheduleId] = useState(null);

  const formatTime12h = (timeStr) => {
    if (!timeStr) return '';
    const [hStr, mStr] = timeStr.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  };

  const getTimelineStyle = (start, end) => {
    if (!start || !end) return { left: '0%', width: '0%' };
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    const startMins = h1 * 60 + m1;
    const endMins = h2 * 60 + m2;
    const dayStart = 360; // 06:00
    const dayTotal = 960; // 16 hrs (until 22:00)
    const left = Math.max(0, Math.min(100, ((startMins - dayStart) / dayTotal) * 100));
    const right = Math.max(0, Math.min(100, ((endMins - dayStart) / dayTotal) * 100));
    const width = Math.max(8, right - left);
    return { left: `${left}%`, width: `${width}%` };
  };

  const handleOpenCreate = () => {
    setFormData({
      id: null,
      name: '',
      company: 'My Company (San Francisco)',
      days_per_week: 5,
      hours_per_week: 40.0,
      timezone: 'America/Los_Angeles',
      is_active: true,
      lines: [...DEFAULT_DAYS],
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = async (schedule) => {
    try {
      const detailed = await getWorkingScheduleById(schedule.id);
      const rawLines = detailed.schedule_lines || detailed.lines || [];
      setFormData({
        id: detailed.id,
        name: detailed.name,
        company: detailed.company || 'My Company (San Francisco)',
        days_per_week: detailed.days_per_week || 5,
        hours_per_week: detailed.hours_per_week || 40.0,
        timezone: detailed.timezone || 'America/Los_Angeles',
        is_active: detailed.is_active !== false,
        lines: rawLines.length > 0 
          ? rawLines.map(l => ({
              day_of_week: (l.day_of_week || 'monday').toLowerCase(),
              work_from: l.start_time || l.work_from || '09:00',
              work_to: l.end_time || l.work_to || '17:00',
              break_hours: l.break_hours ?? 1.0,
            }))
          : [...DEFAULT_DAYS],
      });
      setIsFormOpen(true);
    } catch (err) {
      const rawLines = schedule.schedule_lines || schedule.lines || [];
      setFormData({
        id: schedule.id,
        name: schedule.name,
        company: schedule.company || 'My Company (San Francisco)',
        days_per_week: schedule.days_per_week || 5,
        hours_per_week: schedule.hours_per_week || 40.0,
        timezone: schedule.timezone || 'America/Los_Angeles',
        is_active: schedule.is_active !== false,
        lines: rawLines.length > 0 
          ? rawLines.map(l => ({
              day_of_week: (l.day_of_week || 'monday').toLowerCase(),
              work_from: l.start_time || l.work_from || '09:00',
              work_to: l.end_time || l.work_to || '17:00',
              break_hours: l.break_hours ?? 1.0,
            }))
          : [...DEFAULT_DAYS],
      });
      setIsFormOpen(true);
    }
  };

  const calculateHours = (from, to, breakHours = 0) => {
    if (!from || !to) return 0;
    const [h1, m1] = from.split(':').map(Number);
    const [h2, m2] = to.split(':').map(Number);
    const totalMins = (h2 * 60 + m2) - (h1 * 60 + m1);
    const grossHours = Math.max(0, totalMins / 60);
    return Math.max(0, grossHours - Number(breakHours));
  };

  const totalWeeklyHours = formData.lines.reduce((acc, line) => {
    return acc + calculateHours(line.work_from, line.work_to, line.break_hours);
  }, 0);

  const handleAddDay = () => {
    setFormData(prev => ({
      ...prev,
      lines: [
        ...prev.lines,
        { day_of_week: 'monday', work_from: '09:00', work_to: '17:00', break_hours: 1.0 }
      ]
    }));
  };

  const handleRemoveDay = (index) => {
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index)
    }));
  };

  const handleLineChange = (index, field, value) => {
    setFormData(prev => {
      const newLines = [...prev.lines];
      newLines[index] = { ...newLines[index], [field]: value };
      return { ...prev, lines: newLines };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        name: formData.name.trim(),
        company: formData.company.trim(),
        days_per_week: formData.lines.length,
        hours_per_week: Number(totalWeeklyHours.toFixed(1)),
        timezone: formData.timezone,
        is_active: formData.is_active,
        lines: formData.lines.map((line, idx) => ({
          day_of_week: line.day_of_week,
          day_period: 'morning',
          work_from: line.work_from,
          work_to: line.work_to,
          sequence: idx + 1,
        })),
      };

      if (formData.id) {
        await updateWorkingSchedule(formData.id, payload);
        showNotice('success', `Schedule "${formData.name}" updated successfully.`);
      } else {
        await createWorkingSchedule(payload);
        showNotice('success', `New working schedule "${formData.name}" created.`);
      }

      await loadData();
      setIsFormOpen(false);
    } catch (err) {
      showNotice('error', err.message || 'Failed to save schedule');
    } finally {
      setSubmitting(false);
    }
  };

  const canEdit = canManageEmployees(currentUser);

  const filteredSchedules = schedules.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout activeModule="employees">
      <div className="page-container">
        {notification && (
          <div className={`alert-box alert-box-${notification.type === 'error' ? 'danger' : 'success'}`} style={{ marginBottom: '16px' }}>
            {notification.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            <span>{notification.text}</span>
          </div>
        )}

        {isFormOpen ? (
          /* Working Schedule Form Screen per 01-employees.md §6 */
          <div className="working-schedule-form-view">
            <div className="detail-top-nav">
              <button 
                type="button" 
                className="btn btn-outline btn-sm"
                onClick={() => setIsFormOpen(false)}
              >
                <ArrowLeft size={14} style={{ marginRight: '6px' }} />
                Back to list
              </button>
              <h2 className="font-display" style={{ fontSize: '18px', margin: 0 }}>
                {formData.id ? formData.name : 'New Working Schedule'}
              </h2>
            </div>

            <div className="card" style={{ padding: '24px', marginTop: '16px' }}>
              <form onSubmit={handleSave}>
                <div className="form-grid-2col">
                  <div className="form-column">
                    <div className="form-group">
                      <label className="form-label" htmlFor="sch-name">
                        Schedule Name <span style={{ color: 'var(--coral)' }}>*</span>
                      </label>
                      <input
                        type="text"
                        id="sch-name"
                        className="form-control"
                        placeholder="e.g. Standard 40 Hours/Week"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="sch-company">
                        Company
                      </label>
                      <input
                        type="text"
                        id="sch-company"
                        className="form-control"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-column">
                    <div className="form-group">
                      <label className="form-label">
                        Days per Week / Calculated Hours
                      </label>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <input
                          type="number"
                          className="form-control"
                          readOnly
                          value={formData.lines.length}
                          title="Days per week is calculated from schedule lines"
                        />
                        <input
                          type="text"
                          className="form-control"
                          readOnly
                          value={`${totalWeeklyHours.toFixed(1)} hrs/week`}
                          title="Total weekly hours"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="sch-timezone">
                        Timezone
                      </label>
                      <input
                        type="text"
                        id="sch-timezone"
                        className="form-control"
                        value={formData.timezone}
                        onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Weekly Schedule Table per 01-employees.md §6 */}
                <div style={{ marginTop: '28px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 className="font-display" style={{ fontSize: '16px', margin: 0 }}>
                      Weekly Working Lines
                    </h3>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={handleAddDay}
                    >
                      <Plus size={14} style={{ marginRight: '4px' }} />
                      Add Day
                    </button>
                  </div>

                  <div className="table-container" style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
                    <table className="daybook-table">
                      <thead>
                        <tr>
                          <th style={{ width: '25%' }}>Day</th>
                          <th style={{ width: '20%' }}>Start Time</th>
                          <th style={{ width: '20%' }}>End Time</th>
                          <th style={{ width: '15%' }}>Break (hrs)</th>
                          <th style={{ width: '15%' }}>Hours</th>
                          <th style={{ width: '5%', textAlign: 'center' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.lines.map((line, idx) => {
                          const lineHrs = calculateHours(line.work_from, line.work_to, line.break_hours);
                          return (
                            <tr key={idx}>
                              <td>
                                <select
                                  className="form-control"
                                  value={line.day_of_week}
                                  onChange={(e) => handleLineChange(idx, 'day_of_week', e.target.value)}
                                >
                                  <option value="monday">Monday</option>
                                  <option value="tuesday">Tuesday</option>
                                  <option value="wednesday">Wednesday</option>
                                  <option value="thursday">Thursday</option>
                                  <option value="friday">Friday</option>
                                  <option value="saturday">Saturday</option>
                                  <option value="sunday">Sunday</option>
                                </select>
                              </td>
                              <td>
                                <input
                                  type="time"
                                  className="form-control"
                                  value={line.work_from}
                                  onChange={(e) => handleLineChange(idx, 'work_from', e.target.value)}
                                />
                              </td>
                              <td>
                                <input
                                  type="time"
                                  className="form-control"
                                  value={line.work_to}
                                  onChange={(e) => handleLineChange(idx, 'work_to', e.target.value)}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  step="0.5"
                                  className="form-control"
                                  value={line.break_hours || 0}
                                  onChange={(e) => handleLineChange(idx, 'break_hours', parseFloat(e.target.value) || 0)}
                                />
                              </td>
                              <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                                {lineHrs.toFixed(1)}h
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDay(idx)}
                                  className="btn-icon"
                                  style={{ color: 'var(--text-muted)' }}
                                  title="Remove day"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'right', fontWeight: '600', color: 'var(--ink)' }}>
                            Total Weekly Hours:
                          </td>
                          <td colSpan={2} style={{ fontWeight: '700', color: 'var(--coral)', fontFamily: 'var(--font-mono)' }}>
                            {totalWeeklyHours.toFixed(1)}h
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                <div className="detail-form-actions" style={{ marginTop: '24px' }}>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-primary"
                  >
                    {submitting ? 'Saving...' : formData.id ? 'Update Schedule' : 'Create Schedule'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setIsFormOpen(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* Working Schedule List Screen per 01-employees.md §5 */
          <>
            <div className="page-header-row">
              <div className="page-header-left">
                <h1 className="page-title font-display">Working Schedules</h1>
                <p className="page-subtitle">Standard work week, shift definitions, and contracted working times.</p>
              </div>

              {canEdit && (
                <div className="page-header-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleOpenCreate}
                  >
                    <Plus size={15} style={{ marginRight: '6px' }} />
                    New Schedule
                  </button>
                </div>
              )}
            </div>

            {/* Sub-tabs: List / Calendar (Underline style per §5) */}
            <div className="detail-tabs-bar" style={{ marginBottom: '16px' }}>
              <button
                type="button"
                className={`detail-tab-item ${activeSubTab === 'list' ? 'is-active' : ''}`}
                onClick={() => setActiveSubTab('list')}
              >
                <ListIcon size={14} style={{ display: 'inline', marginRight: '6px' }} />
                List View
              </button>
              <button
                type="button"
                className={`detail-tab-item ${activeSubTab === 'calendar' ? 'is-active' : ''}`}
                onClick={() => setActiveSubTab('calendar')}
              >
                <Calendar size={14} style={{ display: 'inline', marginRight: '6px' }} />
                Calendar View
              </button>
            </div>

            {/* Toolbar: search pill + outline buttons */}
            <div className="toolbar-cluster">
              <div className="navbar-search-pill" style={{ width: '280px', background: 'var(--card)' }}>
                <Search size={14} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search schedules..."
                  className="search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <button type="button" className="btn btn-outline btn-sm">
                <SlidersHorizontal size={13} style={{ marginRight: '4px' }} />
                Columns
              </button>

              <div style={{ marginLeft: 'auto', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Showing <strong>{filteredSchedules.length}</strong> schedules
              </div>
            </div>

            {/* Content: List Table OR Calendar View */}
            {activeSubTab === 'list' ? (
              <div className="card table-card" style={{ marginTop: '16px', overflow: 'hidden' }}>
                {loading ? (
                  <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Loading working schedules...
                  </div>
                ) : filteredSchedules.length === 0 ? (
                  <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No working schedules found.
                  </div>
                ) : (
                  <table className="daybook-table">
                    <thead>
                      <tr>
                        <th style={{ width: '35%' }}>Schedule Name</th>
                        <th style={{ width: '15%' }}>Days / Week</th>
                        <th style={{ width: '15%' }}>Hours / Week</th>
                        <th style={{ width: '25%' }}>Company</th>
                        <th style={{ width: '10%', textAlign: 'right' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSchedules.map((sch) => {
                        const isActive = sch.is_active !== false;

                        return (
                          <tr
                            key={sch.id}
                            onClick={() => {
                              handleOpenEdit(sch);
                            }}
                            className="cursor-pointer"
                          >
                            <td>
                              <span style={{ fontWeight: '600', color: 'var(--ink)' }}>
                                {sch.name}
                              </span>
                            </td>
                            <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                              {sch.days_per_week || 5} days
                            </td>
                            <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                              {sch.hours_per_week || 40} hrs
                            </td>
                            <td style={{ color: 'var(--text-secondary)' }}>
                              {sch.company || 'My Company (San Francisco)'}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <span className={`status-pill ${isActive ? 'status-pill-success' : 'status-pill-danger'}`}>
                                <span className="status-dot" />
                                {isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            ) : (
              /* Calendar View */
              (() => {
                const activeCalendarSchedule = schedules.find(s => s.id === selectedCalendarScheduleId) || filteredSchedules[0] || schedules[0] || null;

                return (
                  <div className="schedule-calendar-container">
                    {/* Schedule Selector & Overview Header */}
                    <div className="schedule-calendar-header-card">
                      <div className="schedule-selector-row">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            Schedule:
                          </span>
                          <div className="schedule-chips-group">
                            {schedules.map(sch => {
                              const isActive = (selectedCalendarScheduleId === sch.id) || (!selectedCalendarScheduleId && sch.id === activeCalendarSchedule?.id);
                              return (
                                <button
                                  key={sch.id}
                                  type="button"
                                  className={`schedule-chip ${isActive ? 'is-active' : ''}`}
                                  onClick={() => setSelectedCalendarScheduleId(sch.id)}
                                >
                                  <Calendar size={13} />
                                  <span>{sch.name}</span>
                                  <span style={{ fontSize: '0.72rem', opacity: 0.8, marginLeft: '2px' }}>
                                    ({sch.hours_per_week || 40}h)
                                  </span>
                                </button>
                              );
                            })}
                            <button
                              type="button"
                              className={`schedule-chip ${selectedCalendarScheduleId === 'all' ? 'is-active' : ''}`}
                              onClick={() => setSelectedCalendarScheduleId('all')}
                            >
                              <SlidersHorizontal size={13} />
                              <span>Compare All</span>
                            </button>
                          </div>
                        </div>

                        {activeCalendarSchedule && canEdit && selectedCalendarScheduleId !== 'all' && (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => handleOpenEdit(activeCalendarSchedule)}
                          >
                            <Edit2 size={13} style={{ marginRight: '6px' }} />
                            Edit Schedule
                          </button>
                        )}
                      </div>

                      {/* Stats row for the active schedule */}
                      {selectedCalendarScheduleId !== 'all' && activeCalendarSchedule && (
                        <div className="schedule-stats-grid">
                          <div className="schedule-stat-chip">
                            <div className="schedule-stat-icon-wrap">
                              <Clock size={18} />
                            </div>
                            <div>
                              <div className="schedule-stat-label">Weekly Hours</div>
                              <div className="schedule-stat-value">{activeCalendarSchedule.hours_per_week || 40} hrs / week</div>
                            </div>
                          </div>

                          <div className="schedule-stat-chip">
                            <div className="schedule-stat-icon-wrap">
                              <Calendar size={18} />
                            </div>
                            <div>
                              <div className="schedule-stat-label">Working Days</div>
                              <div className="schedule-stat-value">{activeCalendarSchedule.days_per_week || 5} days / week</div>
                            </div>
                          </div>

                          <div className="schedule-stat-chip">
                            <div className="schedule-stat-icon-wrap">
                              <Briefcase size={18} />
                            </div>
                            <div>
                              <div className="schedule-stat-label">Average / Day</div>
                              <div className="schedule-stat-value">
                                {(Number(activeCalendarSchedule.hours_per_week || 40) / (activeCalendarSchedule.days_per_week || 5)).toFixed(1)} hrs / day
                              </div>
                            </div>
                          </div>

                          <div className="schedule-stat-chip">
                            <div className="schedule-stat-icon-wrap">
                              <Globe size={18} />
                            </div>
                            <div>
                              <div className="schedule-stat-label">Timezone</div>
                              <div className="schedule-stat-value" style={{ fontSize: '0.82rem' }}>
                                {activeCalendarSchedule.timezone || 'Asia/Kolkata'}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Calendar Content: Single Schedule 7-Day Grid OR Compare All Matrix */}
                    {selectedCalendarScheduleId === 'all' ? (
                      /* Comparison Matrix of All Schedules */
                      <div className="card table-card" style={{ overflow: 'hidden' }}>
                        <table className="daybook-table">
                          <thead>
                            <tr>
                              <th style={{ width: '25%' }}>Schedule Name</th>
                              <th style={{ width: '10%' }}>Weekly</th>
                              {DAYS_OF_WEEK.map(d => (
                                <th key={d.key} style={{ textAlign: 'center', width: '9%' }}>{d.short}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {schedules.map(sch => {
                              const lines = sch.schedule_lines || sch.lines || [];
                              return (
                                <tr 
                                  key={sch.id}
                                  className="cursor-pointer"
                                  onClick={() => handleOpenEdit(sch)}
                                  title="Click to edit schedule"
                                >
                                  <td>
                                    <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{sch.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{sch.company}</div>
                                  </td>
                                  <td>
                                    <span style={{ fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>
                                      {sch.hours_per_week}h
                                    </span>
                                  </td>
                                  {DAYS_OF_WEEK.map(d => {
                                    const match = lines.find(l => (l.day_of_week || '').toLowerCase() === d.key);
                                    if (match) {
                                      const from = match.start_time || match.work_from || '09:00';
                                      const to = match.end_time || match.work_to || '18:00';
                                      return (
                                        <td key={d.key} style={{ textAlign: 'center' }}>
                                          <div style={{
                                            display: 'inline-block',
                                            padding: '4px 8px',
                                            background: 'rgba(217, 56, 30, 0.08)',
                                            color: 'var(--coral)',
                                            borderRadius: 'var(--r-sm)',
                                            fontSize: '0.72rem',
                                            fontWeight: 600,
                                            fontFamily: 'var(--font-mono)'
                                          }}>
                                            {from}–{to}
                                          </div>
                                        </td>
                                      );
                                    }
                                    return (
                                      <td key={d.key} style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                        —
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      /* 7-Day Weekly Shift Grid */
                      activeCalendarSchedule ? (
                        <div className="schedule-week-grid">
                          {DAYS_OF_WEEK.map(day => {
                            const lines = activeCalendarSchedule.schedule_lines || activeCalendarSchedule.lines || [];
                            const dayLine = lines.find(l => (l.day_of_week || '').toLowerCase() === day.key);
                            const isWorkDay = Boolean(dayLine);
                            const workFrom = dayLine ? (dayLine.start_time || dayLine.work_from || '09:00') : null;
                            const workTo = dayLine ? (dayLine.end_time || dayLine.work_to || '18:00') : null;
                            const breakHrs = dayLine ? (dayLine.break_hours ?? 1.0) : 0;
                            const workHrs = dayLine ? (dayLine.work_hours ?? calculateHours(workFrom, workTo, breakHrs)) : 0;
                            const timelineStyle = isWorkDay ? getTimelineStyle(workFrom, workTo) : null;

                            return (
                              <div key={day.key} className="schedule-day-column">
                                <div className="schedule-day-header">
                                  <span className="schedule-day-name">{day.label}</span>
                                  <span className={`status-pill ${isWorkDay ? 'status-pill-success' : 'status-pill-neutral'}`} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                                    <span className="status-dot" />
                                    <span>{isWorkDay ? 'Work Day' : 'Off'}</span>
                                  </span>
                                </div>

                                <div className="schedule-day-body">
                                  {isWorkDay ? (
                                    <div 
                                      className="schedule-shift-card"
                                      onClick={() => handleOpenEdit(activeCalendarSchedule)}
                                      title="Click to edit shift"
                                    >
                                      <div className="schedule-shift-time">
                                        <Clock size={13} style={{ color: 'var(--coral)' }} />
                                        <span>{formatTime12h(workFrom)} – {formatTime12h(workTo)}</span>
                                      </div>

                                      <div className="schedule-shift-meta">
                                        <span>Working: <strong>{workHrs}h</strong></span>
                                        {breakHrs > 0 && <span>Break: {breakHrs}h</span>}
                                      </div>

                                      {/* Mini Day Timeline bar */}
                                      <div className="schedule-timeline-bar" title={`Shift span: ${workFrom} to ${workTo}`}>
                                        <div 
                                          className="schedule-timeline-fill" 
                                          style={timelineStyle}
                                        />
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                        <span>6 AM</span>
                                        <span>12 PM</span>
                                        <span>6 PM</span>
                                        <span>10 PM</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="schedule-off-card">
                                      <Coffee size={22} style={{ opacity: 0.6 }} />
                                      <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        Rest Day
                                      </div>
                                      <div style={{ fontSize: '0.72rem' }}>
                                        No scheduled hours
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                          No working schedules available to display.
                        </div>
                      )
                    )}
                  </div>
                );
              })()
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default WorkingScheduleList;
