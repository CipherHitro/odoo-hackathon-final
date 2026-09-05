import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Clock,
  Layers,
  Calendar,
  CheckCircle2,
  AlertCircle,
  X,
  Check,
  Info,
  ArrowRight
} from 'lucide-react';
import AppLayout from './AppLayout';
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

const TOKEN_COLORS = [
  { id: 'sky', label: 'Sky Blue', hex: 'var(--sky)' },
  { id: 'danger', label: 'Soft Red', hex: 'var(--danger)' },
  { id: 'ink', label: 'Ink Dark', hex: 'var(--ink)' },
  { id: 'warning', label: 'Amber Warning', hex: 'var(--warning)' },
  { id: 'success', label: 'Emerald Green', hex: 'var(--success)' },
];

const getTypeColor = (item) => {
  if (!item) return 'sky';
  const name = (typeof item === 'string' ? item : item.name || item.type_name || '').toLowerCase();
  const color = typeof item === 'object' ? item.display_color : null;
  if (color && ['sky', 'danger', 'ink', 'warning', 'success'].includes(color.toLowerCase())) {
    return color.toLowerCase();
  }
  if (name.includes('paid') || name.includes('annual') || name.includes('vacation')) return 'sky';
  if (name.includes('sick') || name.includes('medical') || name.includes('unwell')) return 'danger';
  if (name.includes('comp') || name.includes('overtime') || name.includes('compensatory')) return 'ink';
  if (name.includes('casual') || name.includes('unpaid') || name.includes('leave')) return 'warning';
  return 'sky';
};

const TimeOffPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Route Synchronization for tabs
  const getTabFromPath = () => {
    if (location.pathname.includes('/allocations')) return 'allocations';
    if (location.pathname.includes('/types')) return 'types';
    return 'requests';
  };

  const [activeTab, setActiveTab] = useState(getTabFromPath());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  // Data states
  const [requests, setRequests] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [types, setTypes] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPendingOnly, setFilterPendingOnly] = useState(false);

  // Modals
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isAllocModalOpen, setIsAllocModalOpen] = useState(false);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Form states
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
    validity_label: '',
    description: ''
  });

  const [typeForm, setTypeForm] = useState({
    name: '',
    unit: 'days',
    requires_allocation: true,
    approval: 'officer',
    display_color: 'sky',
    notes: ''
  });

  const isAdminOrHr = user && ['admin', 'hr_manager', 'hr_payroll_user', 'hr_payroll_admin'].includes(user.role);

  // Synchronize tab with URL when user navigates
  useEffect(() => {
    setActiveTab(getTabFromPath());
  }, [location.pathname]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    navigate(`/time-off/${newTab}`);
  };

  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Load all Time Off data
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
      console.error('Error loading time off data:', err);
      setError(err.message || 'Failed to load time off data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Submit Leave Request
  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      if (!requestForm.time_off_type_id) {
        throw new Error('Please select a leave type');
      }
      if (!requestForm.start_date || !requestForm.end_date) {
        throw new Error('Start date and End date are required');
      }

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
      setFormError(err.message || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  // Inline Approve / Refuse Leave Request
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
      setError(err.message || 'Refusal failed');
    }
  };

  // Submit Leave Allocation (HR/Admin)
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
      const days = parseFloat(allocForm.allocated_days);
      if (isNaN(days) || days <= 0) {
        throw new Error('Allocated days must be greater than 0');
      }

      await createAllocation({
        employee_id: parseInt(allocForm.employee_id, 10),
        time_off_type_id: parseInt(allocForm.time_off_type_id, 10),
        allocated_days: days,
        validity_label: allocForm.validity_label.trim() || null,
        description: allocForm.description.trim() || null
      });

      showToast('Leave allocation created successfully!');
      setIsAllocModalOpen(false);
      setAllocForm({
        employee_id: employees.length > 0 ? employees[0].id : '',
        time_off_type_id: types.length > 0 ? types[0].id : '',
        allocated_days: '',
        validity_label: '',
        description: ''
      });
      await loadAllData();
    } catch (err) {
      setFormError(err.message || 'Failed to create allocation');
    } finally {
      setSubmitting(false);
    }
  };

  // Inline Approve / Refuse Allocation
  const handleApproveAlloc = async (id) => {
    try {
      await approveAllocation(id);
      showToast('Allocation approved successfully!');
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
      setError(err.message || 'Refusal failed');
    }
  };

  // Submit Leave Type (HR/Admin)
  const handleTypeSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      if (!typeForm.name.trim()) {
        throw new Error('Type name is required');
      }

      await createTimeOffType({
        name: typeForm.name.trim(),
        unit: typeForm.unit,
        requires_allocation: Boolean(typeForm.requires_allocation),
        approval: typeForm.approval,
        display_color: typeForm.display_color,
        notes: typeForm.notes.trim() || null
      });

      showToast(`Leave type "${typeForm.name}" created!`);
      setIsTypeModalOpen(false);
      setTypeForm({
        name: '',
        unit: 'days',
        requires_allocation: true,
        approval: 'officer',
        display_color: 'sky',
        notes: ''
      });
      await loadAllData();
    } catch (err) {
      setFormError(err.message || 'Failed to create leave type');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingRequestsCount = requests.filter(r => ['confirm', 'to_approve'].includes(r.status)).length;
  const pendingAllocsCount = allocations.filter(a => ['to_approve', 'draft'].includes(a.status)).length;

  // Filtered lists
  const filteredRequests = requests.filter(req => {
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = req.employee_name && req.employee_name.toLowerCase().includes(q);
    const typeMatch = req.type_name && req.type_name.toLowerCase().includes(q);
    const reasonMatch = req.reason && req.reason.toLowerCase().includes(q);
    const matchesSearch = !q || nameMatch || typeMatch || reasonMatch;

    const isPending = ['confirm', 'to_approve'].includes(req.status);
    const matchesPending = !filterPendingOnly || isPending;

    return matchesSearch && matchesPending;
  });

  const filteredAllocations = allocations.filter(alloc => {
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = alloc.employee_name && alloc.employee_name.toLowerCase().includes(q);
    const typeMatch = alloc.type_name && alloc.type_name.toLowerCase().includes(q);
    const descMatch = alloc.description && alloc.description.toLowerCase().includes(q);
    const matchesSearch = !q || nameMatch || typeMatch || descMatch;

    const isPending = ['to_approve', 'draft'].includes(alloc.status);
    const matchesPending = !filterPendingOnly || isPending;

    return matchesSearch && matchesPending;
  });

  const filteredTypes = types.filter(t => {
    const q = searchQuery.toLowerCase().trim();
    return !q || t.name.toLowerCase().includes(q) || (t.notes && t.notes.toLowerCase().includes(q));
  });

  // Aggregate balance cards by leave type so multiple allocations for the same leave type combine
  const displayBalanceCards = React.useMemo(() => {
    const map = new Map();
    allocations.forEach((alloc) => {
      const key = alloc.time_off_type_id || alloc.type_name;
      if (!map.has(key)) {
        map.set(key, {
          id: alloc.id,
          type_name: alloc.type_name || 'Annual Leave',
          time_off_type_id: alloc.time_off_type_id,
          allocated_days: 0,
          taken_days: 0,
          remaining_days: 0,
          status: alloc.status,
          employee_name: alloc.employee_name,
        });
      }
      const item = map.get(key);
      item.allocated_days += Number(alloc.allocated_days) || 0;
      item.taken_days += Number(alloc.taken_days) || 0;
      item.remaining_days = Math.max(0, item.allocated_days - item.taken_days);
      if (alloc.status === 'approved') {
        item.status = 'approved';
      }
    });
    return Array.from(map.values());
  }, [allocations]);

  return (
    <AppLayout activeModule="time-off">
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

        {/* Header Row */}
        <div className="page-header-row" style={{ marginBottom: '1.5rem' }}>
          <div>
            <h1 className="page-title font-display">Time Off & Leaves</h1>
            <p className="page-subtitle">
              {isAdminOrHr
                ? 'Manage employee leave requests, policy allocations, and leave types.'
                : 'View your leave balances and submit time off requests.'}
            </p>
          </div>

          <div className="page-actions-group">
            <button
              type="button"
              className="btn-coral"
              onClick={() => {
                setFormError(null);
                setIsRequestModalOpen(true);
              }}
              id="btn-request-time-off"
            >
              <Plus size={16} />
              <span>Request Time Off</span>
            </button>

            {isAdminOrHr && (
              <>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => {
                    setFormError(null);
                    setIsAllocModalOpen(true);
                  }}
                  id="btn-new-allocation"
                >
                  <Plus size={16} />
                  <span>New Allocation</span>
                </button>

                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => {
                    setFormError(null);
                    setIsTypeModalOpen(true);
                  }}
                  id="btn-new-leave-type"
                >
                  <Plus size={16} />
                  <span>New Leave Type</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Leave Balances KPI Cards */}
        {displayBalanceCards.length > 0 && (
          <div style={{ marginBottom: '1.75rem' }}>
            <h3 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem' }}>
              {isAdminOrHr ? 'Overview of Active Leave Allocations' : 'My Leave Balances'}
            </h3>
            <div className="timeoff-balances-grid">
              {displayBalanceCards.map((alloc) => {
                const rem = alloc.remaining_days;
                const total = alloc.allocated_days;
                const pct = total > 0 ? Math.min(100, Math.max(0, Math.round(((total - rem) / total) * 100))) : 0;
                const colorKey = getTypeColor(alloc.type_name);

                return (
                  <div key={alloc.id || alloc.type_name} className="timeoff-balance-card">
                    <div className="balance-card-head">
                      <span className="timeoff-type-label">
                        <span className={`timeoff-type-dot dot-${colorKey}`} />
                        <span className="balance-card-title">{alloc.type_name || 'Annual Leave'}</span>
                      </span>
                      <span className={`status-pill ${alloc.status === 'approved' ? 'status-pill-success' : 'status-pill-warning'}`}>
                        {alloc.status === 'approved' ? 'Active' : 'Pending'}
                      </span>
                    </div>

                    <div className="balance-card-stat">
                      <span className="balance-card-stat-num">{rem}</span>
                      <span className="balance-card-stat-sub">/ {total} days left</span>
                    </div>

                    <div className="balance-card-progress">
                      <div className="balance-card-progress-bar" style={{ width: `${pct}%` }} />
                    </div>

                    <div className="balance-card-footer">
                      <span>Taken: {alloc.taken_days} days</span>
                      {alloc.employee_name && <span>{alloc.employee_name}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Sub-Navigation Tabs per 04-timeoff.md */}
        <div className="timeoff-tabs-bar">
          <button
            type="button"
            className={`timeoff-tab-btn ${activeTab === 'requests' ? 'is-active' : ''}`}
            onClick={() => handleTabChange('requests')}
            id="tab-requests"
          >
            <Clock size={16} />
            <span>Time Off Requests</span>
            {pendingRequestsCount > 0 && (
              <span className="tab-counter-badge">{pendingRequestsCount}</span>
            )}
          </button>

          <button
            type="button"
            className={`timeoff-tab-btn ${activeTab === 'allocations' ? 'is-active' : ''}`}
            onClick={() => handleTabChange('allocations')}
            id="tab-allocations"
          >
            <Layers size={16} />
            <span>Allocations</span>
            {pendingAllocsCount > 0 && (
              <span className="tab-counter-badge">{pendingAllocsCount}</span>
            )}
          </button>

          {isAdminOrHr && (
            <button
              type="button"
              className={`timeoff-tab-btn ${activeTab === 'types' ? 'is-active' : ''}`}
              onClick={() => handleTabChange('types')}
              id="tab-types"
            >
              <Calendar size={16} />
              <span>Time Off Types</span>
            </button>
          )}
        </div>

        {/* Toolbar: Search Pill & Filters */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '1.25rem'
        }}>
          <div className="search-pill-container" style={{ minWidth: '280px' }}>
            <Search size={15} className="search-pill-icon" />
            <input
              type="text"
              placeholder={
                activeTab === 'requests'
                  ? 'Search by employee or reason...'
                  : activeTab === 'allocations'
                    ? 'Search by employee or allocation...'
                    : 'Search leave types...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-pill-input"
              id="search-timeoff-input"
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

          {activeTab !== 'types' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className={`filter-pill ${filterPendingOnly ? 'is-active' : ''}`}
                onClick={() => setFilterPendingOnly(prev => !prev)}
              >
                <span>To Approve</span>
                {filterPendingOnly && <span style={{ fontSize: '10px' }}>&bull;</span>}
              </button>
            </div>
          )}
        </div>

        {/* =========================================================================
            TAB 1: LEAVE REQUESTS TABLE (04-timeoff.md §Screen: Time Off Requests — List)
            ========================================================================= */}
        {activeTab === 'requests' && (
          <div className="table-wrapper">
            <table className="daybook-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Dates</th>
                  <th style={{ textAlign: 'right' }}>Duration</th>
                  <th>Status</th>
                  <th>Reason</th>
                  {isAdminOrHr && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={isAdminOrHr ? 7 : 6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      Loading leave requests...
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={isAdminOrHr ? 7 : 6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No time off requests found. Click "Request Time Off" to submit one.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((req) => {
                    const isPending = ['confirm', 'to_approve'].includes(req.status);
                    const isApproved = ['validate', 'approved'].includes(req.status);
                    const isRefused = req.status === 'refused';
                    const colorKey = getTypeColor(req.type_name);

                    return (
                      <tr key={req.id}>
                        {/* Employee */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className="avatar-circle-sm" style={{ background: 'var(--ink)' }}>
                              {req.employee_name ? req.employee_name.slice(0, 2).toUpperCase() : `#${req.employee_id}`}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--ink)' }}>
                                {req.employee_name || `Employee #${req.employee_id}`}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                ID: {req.employee_id}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Type with color dot */}
                        <td>
                          <span className="timeoff-type-label">
                            <span className={`timeoff-type-dot dot-${colorKey}`} />
                            <span>{req.type_name || 'Paid Time Off'}</span>
                          </span>
                        </td>

                        {/* Dates */}
                        <td>
                          <span style={{ fontSize: '0.84rem', color: 'var(--ink)' }}>
                            {req.start_date} <ArrowRight size={11} style={{ display: 'inline', margin: '0 3px', verticalAlign: 'middle', color: 'var(--text-muted)' }} /> {req.end_date}
                          </span>
                        </td>

                        {/* Duration in JetBrains Mono */}
                        <td className="wage-mono">
                          {req.duration_days || req.duration} days
                        </td>

                        {/* Status Pill */}
                        <td>
                          {isApproved ? (
                            <span className="status-pill status-pill-success">
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)', display: 'inline-block', marginRight: '5px' }} />
                              Approved
                            </span>
                          ) : isPending ? (
                            <span className="status-pill status-pill-warning">
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--warning)', display: 'inline-block', marginRight: '5px' }} />
                              To Approve
                            </span>
                          ) : (
                            <span className="status-pill status-pill-danger">
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--danger)', display: 'inline-block', marginRight: '5px' }} />
                              {req.status}
                            </span>
                          )}
                        </td>

                        {/* Reason */}
                        <td>
                          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                            {req.reason || '—'}
                          </span>
                        </td>

                        {/* Inline Actions per 04-timeoff.md */}
                        {isAdminOrHr && (
                          <td style={{ textAlign: 'right' }}>
                            {isPending ? (
                              <div style={{ display: 'inline-flex', gap: '6px' }}>
                                <button
                                  type="button"
                                  className="btn-action-approve"
                                  onClick={() => handleApproveRequest(req.id)}
                                  title="Approve Leave"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  className="btn-action-refuse"
                                  onClick={() => handleRefuseRequest(req.id)}
                                  title="Refuse Leave"
                                >
                                  Refuse
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span>
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

        {/* =========================================================================
            TAB 2: ALLOCATIONS TABLE (04-timeoff.md §Screen: Allocations — List)
            ========================================================================= */}
        {activeTab === 'allocations' && (
          <div className="table-wrapper">
            <table className="daybook-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th style={{ textAlign: 'right' }}>Allocated</th>
                  <th style={{ textAlign: 'right' }}>Taken</th>
                  <th style={{ textAlign: 'right' }}>Remaining</th>
                  <th>Status</th>
                  <th>Description</th>
                  {isAdminOrHr && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={isAdminOrHr ? 8 : 7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      Loading allocations...
                    </td>
                  </tr>
                ) : filteredAllocations.length === 0 ? (
                  <tr>
                    <td colSpan={isAdminOrHr ? 8 : 7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No allocations recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredAllocations.map((alloc) => {
                    const isPending = ['to_approve', 'draft'].includes(alloc.status);
                    const isApproved = alloc.status === 'approved';
                    const colorKey = getTypeColor(alloc.type_name);

                    return (
                      <tr key={alloc.id}>
                        {/* Employee */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className="avatar-circle-sm" style={{ background: 'var(--ink)' }}>
                              {alloc.employee_name ? alloc.employee_name.slice(0, 2).toUpperCase() : `#${alloc.employee_id}`}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--ink)' }}>
                                {alloc.employee_name || `Employee #${alloc.employee_id}`}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                ID: {alloc.employee_id}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Type with color dot */}
                        <td>
                          <span className="timeoff-type-label">
                            <span className={`timeoff-type-dot dot-${colorKey}`} />
                            <span>{alloc.type_name || 'Standard'}</span>
                          </span>
                        </td>

                        {/* Allocated / Taken / Remaining in JetBrains Mono per 04-timeoff.md */}
                        <td className="wage-mono">{alloc.allocated_days} days</td>
                        <td className="wage-mono" style={{ color: 'var(--text-secondary)' }}>{alloc.taken_days} days</td>
                        <td className="wage-mono" style={{ fontWeight: 700, color: 'var(--coral)' }}>
                          {alloc.remaining_days} days
                        </td>

                        {/* Status */}
                        <td>
                          {isApproved ? (
                            <span className="status-pill status-pill-success">
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)', display: 'inline-block', marginRight: '5px' }} />
                              Approved
                            </span>
                          ) : isPending ? (
                            <span className="status-pill status-pill-warning">
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--warning)', display: 'inline-block', marginRight: '5px' }} />
                              To Approve
                            </span>
                          ) : (
                            <span className="status-pill status-pill-danger">
                              {alloc.status}
                            </span>
                          )}
                        </td>

                        {/* Description */}
                        <td>
                          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                            {alloc.description || alloc.validity_label || '—'}
                          </span>
                        </td>

                        {/* Inline Actions */}
                        {isAdminOrHr && (
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
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span>
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

        {/* =========================================================================
            TAB 3: TIME OFF TYPES (04-timeoff.md §Screen: Time Off Types — List)
            ========================================================================= */}
        {activeTab === 'types' && (
          <div className="table-wrapper">
            <table className="daybook-table">
              <thead>
                <tr>
                  <th>Type Name</th>
                  <th>Unit</th>
                  <th>Allocation Required</th>
                  <th>Approval Level</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredTypes.map((t) => {
                  const colorKey = getTypeColor(t);
                  return (
                    <tr key={t.id}>
                      <td>
                        <span className="timeoff-type-label">
                          <span className={`timeoff-type-dot dot-${colorKey}`} />
                          <strong style={{ color: 'var(--ink)' }}>{t.name}</strong>
                        </span>
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>{t.unit}</td>
                      <td>
                        {t.requires_allocation ? (
                          <span className="status-pill status-pill-warning">Required</span>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>No (Open)</span>
                        )}
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>
                        {t.approval === 'officer' ? 'HR Officer' : 'Department Manager'}
                      </td>
                      <td>
                        <span className="status-pill status-pill-success">
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)', display: 'inline-block', marginRight: '5px' }} />
                          {t.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                          {t.notes || '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL 1: REQUEST TIME OFF
          ========================================================================= */}
      {isRequestModalOpen && (
        <div className="daybook-modal-backdrop" onClick={() => setIsRequestModalOpen(false)}>
          <div className="daybook-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="daybook-modal-header">
              <h2 className="daybook-modal-title">Request Time Off</h2>
              <button
                type="button"
                className="daybook-modal-close"
                onClick={() => setIsRequestModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRequestSubmit}>
              <div className="daybook-modal-body">
                {formError && (
                  <div className="alert-box alert-box-danger">
                    <AlertCircle size={15} />
                    <span>{formError}</span>
                  </div>
                )}

                {isAdminOrHr && (
                  <div className="form-group">
                    <label className="form-label">Employee (Optional)</label>
                    <select
                      className="form-select"
                      value={requestForm.employee_id}
                      onChange={e => setRequestForm({ ...requestForm, employee_id: e.target.value })}
                    >
                      <option value="">-- Current User Profile --</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.work_email || emp.job_position || `ID: ${emp.id}`})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Time Off Type *</label>
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

                <div className="form-grid-2col">
                  <div className="form-group">
                    <label className="form-label">Start Date *</label>
                    <input
                      type="date"
                      className="form-input"
                      required
                      value={requestForm.start_date}
                      onChange={e => setRequestForm({ ...requestForm, start_date: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
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

                <div className="form-group">
                  <label className="form-label">Reason</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Brief description of leave reason..."
                    value={requestForm.reason}
                    onChange={e => setRequestForm({ ...requestForm, reason: e.target.value })}
                  />
                </div>
              </div>

              <div className="daybook-modal-footer">
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setIsRequestModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-coral"
                  disabled={submitting}
                >
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
        <div className="daybook-modal-backdrop" onClick={() => setIsAllocModalOpen(false)}>
          <div className="daybook-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="daybook-modal-header">
              <h2 className="daybook-modal-title">Allocate Leave to Employee</h2>
              <button
                type="button"
                className="daybook-modal-close"
                onClick={() => setIsAllocModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAllocSubmit}>
              <div className="daybook-modal-body">
                {formError && (
                  <div className="alert-box alert-box-danger">
                    <AlertCircle size={15} />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="form-grid-2col">
                  <div className="form-group">
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

                  <div className="form-group">
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

                <div className="form-grid-2col">
                  <div className="form-group">
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

                  <div className="form-group">
                    <label className="form-label">Validity Label (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. FY 2026-2027"
                      value={allocForm.validity_label}
                      onChange={e => setAllocForm({ ...allocForm, validity_label: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes / Description</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Annual leave balance granted at start of policy year"
                    value={allocForm.description}
                    onChange={e => setAllocForm({ ...allocForm, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="daybook-modal-footer">
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setIsAllocModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-coral"
                  disabled={submitting}
                >
                  {submitting ? 'Allocating...' : 'Allocate Balance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: CREATE LEAVE TYPE (HR/ADMIN) per 04-timeoff.md §Screen: Time Off Type — Form
          ========================================================================= */}
      {isTypeModalOpen && (
        <div className="daybook-modal-backdrop" onClick={() => setIsTypeModalOpen(false)}>
          <div className="daybook-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="daybook-modal-header">
              <h2 className="daybook-modal-title">Create Leave Type</h2>
              <button
                type="button"
                className="daybook-modal-close"
                onClick={() => setIsTypeModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTypeSubmit}>
              <div className="daybook-modal-body">
                {formError && (
                  <div className="alert-box alert-box-danger">
                    <AlertCircle size={15} />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Type Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    placeholder="e.g. Wellness Leave, Paternity Leave"
                    value={typeForm.name}
                    onChange={e => setTypeForm({ ...typeForm, name: e.target.value })}
                  />
                </div>

                <div className="form-grid-2col">
                  <div className="form-group">
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

                  <div className="form-group">
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

                {/* Display Color Swatch Picker constrained to Daybook token palette per 04-timeoff.md */}
                <div className="form-group">
                  <label className="form-label">Display Color Token (Badge / Chip)</label>
                  <div className="palette-swatches-row">
                    {TOKEN_COLORS.map(col => (
                      <button
                        key={col.id}
                        type="button"
                        className={`palette-swatch-btn ${typeForm.display_color === col.id ? 'is-selected' : ''}`}
                        style={{ backgroundColor: col.hex }}
                        onClick={() => setTypeForm({ ...typeForm, display_color: col.id })}
                        title={col.label}
                      >
                        {typeForm.display_color === col.id && (
                          <Check size={14} style={{ color: '#ffffff', strokeWidth: 3 }} />
                        )}
                      </button>
                    ))}
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginLeft: '6px' }}>
                      Selected: <strong style={{ color: 'var(--ink)' }}>{typeForm.display_color}</strong>
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes / Policy Details</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Requires medical certificate if > 2 consecutive days"
                    value={typeForm.notes}
                    onChange={e => setTypeForm({ ...typeForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="daybook-modal-footer">
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setIsTypeModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-coral"
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Create Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default TimeOffPage;
