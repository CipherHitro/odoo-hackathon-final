import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  X, 
  AlertCircle,
  FileText,
  User,
  Layers,
  ArrowRight
} from 'lucide-react';
import Navbar from './Navbar';
import { getCurrentUser } from '../api/auth';
import { 
  getTimeOffTypes, 
  createTimeOffType,
  getAllocations, 
  createAllocation,
  approveAllocation,
  refuseAllocation,
  getTimeOffRequests, 
  createTimeOffRequest,
  approveTimeOffRequest,
  refuseTimeOffRequest
} from '../api/time_off';
import { getEmployees } from '../api/employees';

const TimeOffPage = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'allocations' | 'types'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  // Data states
  const [requests, setRequests] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [types, setTypes] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Modals
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isAllocModalOpen, setIsAllocModalOpen] = useState(false);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Form inputs
  const [requestForm, setRequestForm] = useState({
    employee_id: '',
    time_off_type_id: '',
    start_date: '',
    end_date: '',
    reason: ''
  });

  const [allocForm, setAllocForm] = useState({
    employee_id: '',
    time_off_type_id: '',
    allocated_days: '',
    description: ''
  });

  const [typeForm, setTypeForm] = useState({
    name: '',
    unit: 'days',
    requires_allocation: true,
    approval: 'officer'
  });

  const isAdminOrHr = user && ['admin', 'hr_manager', 'hr_payroll_user', 'hr_payroll_admin'].includes(user.role);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [userData, typesData, allocsData, reqsData, empsData] = await Promise.all([
        getCurrentUser().catch(() => null),
        getTimeOffTypes().catch(() => []),
        getAllocations().catch(() => []),
        getTimeOffRequests().catch(() => []),
        getEmployees().catch(() => [])
      ]);

      setUser(userData);
      setTypes(typesData);
      setAllocations(allocsData);
      setRequests(reqsData);
      setEmployees(empsData);

      if (typesData.length > 0 && !requestForm.time_off_type_id) {
        setRequestForm(prev => ({ ...prev, time_off_type_id: typesData[0].id }));
      }
      if (typesData.length > 0 && empsData.length > 0 && !allocForm.employee_id) {
        setAllocForm(prev => ({ 
          ...prev, 
          employee_id: empsData[0].id, 
          time_off_type_id: typesData[0].id 
        }));
      }
    } catch (err) {
      console.error('Error loading time off data', err);
      setError(err.message || 'Failed to load time off data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Submit Leave Request
  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const payload = {
        time_off_type_id: parseInt(requestForm.time_off_type_id, 10),
        start_date: requestForm.start_date,
        end_date: requestForm.end_date,
        reason: requestForm.reason.trim() || null
      };
      if (requestForm.employee_id) {
        payload.employee_id = parseInt(requestForm.employee_id, 10);
      }
      await createTimeOffRequest(payload);
      showToast('Time off request submitted successfully!');
      setIsRequestModalOpen(false);
      setRequestForm({
        employee_id: '',
        time_off_type_id: types.length > 0 ? types[0].id : '',
        start_date: '',
        end_date: '',
        reason: ''
      });
      await loadAllData();
    } catch (err) {
      setFormError(err.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  // Approve / Refuse Leave Request
  const handleApproveRequest = async (id) => {
    try {
      await approveTimeOffRequest(id);
      showToast('Leave request approved!');
      await loadAllData();
    } catch (err) {
      setError(err.message || 'Approval failed');
    }
  };

  const handleRefuseRequest = async (id) => {
    try {
      await refuseTimeOffRequest(id);
      showToast('Leave request refused.');
      await loadAllData();
    } catch (err) {
      setError(err.message || 'Action failed');
    }
  };

  // Submit Allocation
  const handleAllocSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      if (!allocForm.employee_id) {
        throw new Error('Please select an employee');
      }
      if (!allocForm.time_off_type_id) {
        throw new Error('Please select a leave type');
      }
      if (!allocForm.allocated_days || parseFloat(allocForm.allocated_days) <= 0) {
        throw new Error('Allocated days must be greater than 0');
      }
      await createAllocation({
        employee_id: parseInt(allocForm.employee_id, 10),
        time_off_type_id: parseInt(allocForm.time_off_type_id, 10),
        allocated_days: parseFloat(allocForm.allocated_days),
        description: allocForm.description.trim() || null
      });
      showToast('Leave allocation created!');
      setIsAllocModalOpen(false);
      await loadAllData();
    } catch (err) {
      setFormError(err.message || 'Failed to create allocation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveAlloc = async (id) => {
    try {
      await approveAllocation(id);
      showToast('Allocation approved!');
      await loadAllData();
    } catch (err) {
      setError(err.message || 'Approval failed');
    }
  };

  const handleRefuseAlloc = async (id) => {
    try {
      await refuseAllocation(id);
      showToast('Allocation refused.');
      await loadAllData();
    } catch (err) {
      setError(err.message || 'Action failed');
    }
  };

  // Submit Leave Type
  const handleTypeSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await createTimeOffType({
        name: typeForm.name.trim(),
        unit: typeForm.unit,
        requires_allocation: typeForm.requires_allocation,
        approval: typeForm.approval
      });
      showToast('New leave type created!');
      setIsTypeModalOpen(false);
      setTypeForm({
        name: '',
        unit: 'days',
        requires_allocation: true,
        approval: 'officer'
      });
      await loadAllData();
    } catch (err) {
      setFormError(err.message || 'Failed to create type');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingRequestsCount = requests.filter(r => ['confirm', 'to_approve'].includes(r.status)).length;
  const pendingAllocsCount = allocations.filter(a => ['to_approve', 'draft'].includes(a.status)).length;

  return (
    <div className="app-layout-shell">
      <Navbar activeModule="time-off" />

      <main className="app-layout-main">
        <div className="employees-page">
          {/* Header */}
          <div className="employees-toolbar" style={{ alignItems: 'flex-start' }}>
            <div className="employees-header">
              <h1 className="employees-title">Time Off & Leaves</h1>
              <p className="employees-subtitle">
                {isAdminOrHr 
                  ? 'Manage team leave requests, employee allocations, and leave policy types.' 
                  : 'Check your available leave balances and submit time off requests.'}
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setFormError(null);
                  setIsRequestModalOpen(true);
                }}
              >
                <Plus size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                Request Time Off
              </button>

              {isAdminOrHr && (
                <>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setFormError(null);
                      setIsAllocModalOpen(true);
                    }}
                  >
                    <Plus size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                    Allocate Leave
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setFormError(null);
                      setIsTypeModalOpen(true);
                    }}
                  >
                    <Plus size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                    New Leave Type
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Toast Notification */}
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

          {/* Leave Balances KPI Cards */}
          {allocations.length > 0 && (
            <div>
              <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--neutral-600)', marginBottom: '10px' }}>
                {isAdminOrHr ? 'Overview of Active Leave Allocations' : 'My Leave Balances'}
              </h3>
              <div className="leave-balance-grid">
                {allocations.slice(0, 4).map((alloc) => {
                  const rem = alloc.remaining_days;
                  const total = alloc.allocated_days;
                  const pct = total > 0 ? Math.round(((total - rem) / total) * 100) : 0;

                  return (
                    <div key={alloc.id} className="leave-balance-card">
                      <div className="balance-card-header">
                        <span className="balance-card-title">{alloc.type_name || 'Annual Leave'}</span>
                        <span className="balance-card-badge">{alloc.status}</span>
                      </div>
                      <div className="balance-card-numbers">
                        <span className="balance-big-num">{rem}</span>
                        <span className="balance-sub-label">/ {total} days remaining</span>
                      </div>
                      <div className="balance-progress-bar">
                        <div className="balance-progress-fill" style={{ width: `${pct}%` }}></div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--neutral-600)' }}>
                        <span>Taken: {alloc.taken_days} days</span>
                        {alloc.employee_name && <span>{alloc.employee_name}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Module Tabs (Requests, Allocations, Types) */}
          {isAdminOrHr && (
            <div className="module-tabs-nav">
              <button
                type="button"
                className={`module-tab-btn ${activeTab === 'requests' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('requests')}
              >
                <Clock size={16} />
                <span>Leave Requests</span>
                {pendingRequestsCount > 0 && (
                  <span className="tab-badge" style={{ backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}>
                    {pendingRequestsCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                className={`module-tab-btn ${activeTab === 'allocations' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('allocations')}
              >
                <Layers size={16} />
                <span>Allocations</span>
                {pendingAllocsCount > 0 && (
                  <span className="tab-badge">{pendingAllocsCount}</span>
                )}
              </button>

              <button
                type="button"
                className={`module-tab-btn ${activeTab === 'types' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('types')}
              >
                <Calendar size={16} />
                <span>Leave Types</span>
              </button>
            </div>
          )}

          {/* TAB 1: LEAVE REQUESTS TABLE */}
          {activeTab === 'requests' && (
            <div className="employee-table-card">
              <table className="employee-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Leave Type</th>
                    <th>Dates</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th>Reason</th>
                    {isAdminOrHr && <th style={{ textAlign: 'right' }}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan={isAdminOrHr ? 7 : 6} style={{ textAlign: 'center', padding: '32px', color: 'var(--neutral-600)' }}>
                        No leave requests submitted yet. Click "Request Time Off" to create one.
                      </td>
                    </tr>
                  ) : (
                    requests.map((req) => {
                      const isPending = ['confirm', 'to_approve'].includes(req.status);
                      const isApproved = ['validate', 'approved'].includes(req.status);

                      return (
                        <tr key={req.id} className="employee-table-row" style={{ cursor: 'default' }}>
                          <td>
                            <strong style={{ color: 'var(--neutral-900)' }}>
                              {req.employee_name || `Employee #${req.employee_id}`}
                            </strong>
                          </td>
                          <td>
                            <span className="employee-cell-dept-badge">
                              {req.type_name || 'Vacation'}
                            </span>
                          </td>
                          <td style={{ fontSize: 'var(--text-xs)', color: 'var(--neutral-600)' }}>
                            {req.start_date} <ArrowRight size={12} style={{ display: 'inline', margin: '0 4px', verticalAlign: 'middle' }} /> {req.end_date}
                          </td>
                          <td>
                            <strong>{req.duration_days || req.duration} days</strong>
                          </td>
                          <td>
                            <span className={`status-pill ${isApproved ? 'status-approved' : isPending ? 'status-pending' : 'status-refused'}`}>
                              &bull; {req.status === 'to_approve' ? 'To Approve' : isApproved ? 'Approved' : req.status === 'refused' ? 'Refused' : req.status}
                            </span>
                          </td>
                          <td style={{ color: 'var(--neutral-600)', fontSize: 'var(--text-xs)' }}>
                            {req.reason || '—'}
                          </td>
                          {isAdminOrHr && (
                            <td style={{ textAlign: 'right' }}>
                              {isPending ? (
                                <div style={{ display: 'inline-flex', gap: '6px' }}>
                                  <button
                                    type="button"
                                    className="btn-action-approve"
                                    onClick={() => handleApproveRequest(req.id)}
                                    title="Approve Leave Request"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-action-refuse"
                                    onClick={() => handleRefuseRequest(req.id)}
                                    title="Refuse Leave Request"
                                  >
                                    Refuse
                                  </button>
                                </div>
                              ) : (
                                <span style={{ color: 'var(--neutral-400)', fontSize: '11px' }}>Processed</span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: ALLOCATIONS TABLE */}
          {activeTab === 'allocations' && (
            <div className="employee-table-card">
              <table className="employee-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Leave Type</th>
                    <th>Allocated</th>
                    <th>Taken</th>
                    <th>Remaining</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {allocations.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--neutral-600)' }}>
                        No allocations recorded yet.
                      </td>
                    </tr>
                  ) : (
                    allocations.map((alloc) => {
                      const isPending = ['to_approve', 'draft'].includes(alloc.status);

                      return (
                        <tr key={alloc.id} className="employee-table-row" style={{ cursor: 'default' }}>
                          <td>
                            <strong>{alloc.employee_name || `Employee #${alloc.employee_id}`}</strong>
                          </td>
                          <td>
                            <span className="employee-cell-dept-badge">{alloc.type_name || 'Standard'}</span>
                          </td>
                          <td>{alloc.allocated_days} days</td>
                          <td style={{ color: 'var(--neutral-600)' }}>{alloc.taken_days} days</td>
                          <td>
                            <strong style={{ color: 'var(--color-primary)' }}>{alloc.remaining_days} days</strong>
                          </td>
                          <td>
                            <span className={`status-pill ${alloc.status === 'approved' ? 'status-approved' : isPending ? 'status-pending' : 'status-refused'}`}>
                              &bull; {alloc.status === 'to_approve' ? 'To Approve' : alloc.status === 'approved' ? 'Approved' : alloc.status === 'refused' ? 'Refused' : alloc.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {isPending ? (
                              <div style={{ display: 'inline-flex', gap: '6px' }}>
                                <button
                                  type="button"
                                  className="btn-action-approve"
                                  onClick={() => handleApproveAlloc(alloc.id)}
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  className="btn-action-refuse"
                                  onClick={() => handleRefuseAlloc(alloc.id)}
                                >
                                  Refuse
                                </button>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--neutral-400)', fontSize: '11px' }}>Active</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: LEAVE TYPES TABLE */}
          {activeTab === 'types' && (
            <div className="employee-table-card">
              <table className="employee-table">
                <thead>
                  <tr>
                    <th>Type Name</th>
                    <th>Unit</th>
                    <th>Requires Allocation</th>
                    <th>Approval Level</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {types.map((t) => (
                    <tr key={t.id} className="employee-table-row" style={{ cursor: 'default' }}>
                      <td>
                        <strong>{t.name}</strong>
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>{t.unit}</td>
                      <td>{t.requires_allocation ? 'Yes (Strict Balance)' : 'No (Open)'}</td>
                      <td style={{ textTransform: 'capitalize' }}>{t.approval}</td>
                      <td>
                        <span className="status-pill status-approved">
                          &bull; {t.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* =========================================================================
          MODAL 1: REQUEST TIME OFF
          ========================================================================= */}
      {isRequestModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsRequestModalOpen(false)}>
          <div className="modal-content-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Request Time Off</h2>
              <button type="button" className="btn-close-modal" onClick={() => setIsRequestModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleRequestSubmit}>
              <div className="modal-body">
                {formError && (
                  <div style={{ padding: '10px', backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)', borderRadius: '4px', fontSize: '13px' }}>
                    {formError}
                  </div>
                )}
                {isAdminOrHr && (
                  <div className="form-field-group">
                    <label className="form-label">Employee (Optional)</label>
                    <select
                      className="form-select"
                      value={requestForm.employee_id}
                      onChange={e => setRequestForm({ ...requestForm, employee_id: e.target.value })}
                    >
                      <option value="">-- Current User Employee Profile --</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.work_email || emp.job_position || `ID: ${emp.id}`})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="form-field-group">
                  <label className="form-label">Leave Type *</label>
                  <select
                    className="form-select"
                    required
                    value={requestForm.time_off_type_id}
                    onChange={e => setRequestForm({ ...requestForm, time_off_type_id: e.target.value })}
                  >
                    {types.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-grid-2">
                  <div className="form-field-group">
                    <label className="form-label">Start Date *</label>
                    <input
                      type="date"
                      className="form-input"
                      required
                      value={requestForm.start_date}
                      onChange={e => setRequestForm({ ...requestForm, start_date: e.target.value })}
                    />
                  </div>
                  <div className="form-field-group">
                    <label className="form-label">End Date *</label>
                    <input
                      type="date"
                      className="form-input"
                      required
                      value={requestForm.end_date}
                      onChange={e => setRequestForm({ ...requestForm, end_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-field-group">
                  <label className="form-label">Reason</label>
                  <textarea
                    className="form-input"
                    style={{ height: '70px', padding: '8px 12px' }}
                    placeholder="Brief description of leave..."
                    value={requestForm.reason}
                    onChange={e => setRequestForm({ ...requestForm, reason: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsRequestModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: ALLOCATE LEAVE (HR/ADMIN)
          ========================================================================= */}
      {isAllocModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAllocModalOpen(false)}>
          <div className="modal-content-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Allocate Leave to Employee</h2>
              <button type="button" className="btn-close-modal" onClick={() => setIsAllocModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAllocSubmit}>
              <div className="modal-body">
                {formError && (
                  <div style={{ padding: '10px', backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)', borderRadius: '4px', fontSize: '13px' }}>
                    {formError}
                  </div>
                )}
                <div className="form-grid-2">
                  <div className="form-field-group">
                    <label className="form-label">Employee *</label>
                    <select
                      className="form-select"
                      required
                      value={allocForm.employee_id}
                      onChange={e => setAllocForm({ ...allocForm, employee_id: e.target.value })}
                    >
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.work_email || emp.job_position})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field-group">
                    <label className="form-label">Leave Type *</label>
                    <select
                      className="form-select"
                      required
                      value={allocForm.time_off_type_id}
                      onChange={e => setAllocForm({ ...allocForm, time_off_type_id: e.target.value })}
                    >
                      {types.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-field-group">
                  <label className="form-label">Number of Days *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    className="form-input"
                    required
                    placeholder="e.g. 15"
                    value={allocForm.allocated_days}
                    onChange={e => setAllocForm({ ...allocForm, allocated_days: e.target.value })}
                  />
                </div>
                <div className="form-field-group">
                  <label className="form-label">Notes / Description</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 2026 Annual Leave Balance"
                    value={allocForm.description}
                    onChange={e => setAllocForm({ ...allocForm, description: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsAllocModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Allocating...' : 'Allocate Balance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: CREATE LEAVE TYPE (HR/ADMIN)
          ========================================================================= */}
      {isTypeModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsTypeModalOpen(false)}>
          <div className="modal-content-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Create Leave Type</h2>
              <button type="button" className="btn-close-modal" onClick={() => setIsTypeModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleTypeSubmit}>
              <div className="modal-body">
                {formError && (
                  <div style={{ padding: '10px', backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)', borderRadius: '4px', fontSize: '13px' }}>
                    {formError}
                  </div>
                )}
                <div className="form-field-group">
                  <label className="form-label">Type Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    placeholder="e.g. Sick Leave"
                    value={typeForm.name}
                    onChange={e => setTypeForm({ ...typeForm, name: e.target.value })}
                  />
                </div>
                <div className="form-grid-2">
                  <div className="form-field-group">
                    <label className="form-label">Unit</label>
                    <select
                      className="form-select"
                      value={typeForm.unit}
                      onChange={e => setTypeForm({ ...typeForm, unit: e.target.value })}
                    >
                      <option value="days">Days</option>
                      <option value="hours">Hours</option>
                    </select>
                  </div>
                  <div className="form-field-group">
                    <label className="form-label">Approval Level</label>
                    <select
                      className="form-select"
                      value={typeForm.approval}
                      onChange={e => setTypeForm({ ...typeForm, approval: e.target.value })}
                    >
                      <option value="officer">HR Officer</option>
                      <option value="manager">Department Manager</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsTypeModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeOffPage;
