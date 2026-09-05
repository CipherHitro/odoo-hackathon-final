import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Plus, Search, ChevronDown, ChevronRight, X,
  AlertTriangle, CheckCircle2, AlertCircle, FileText, DollarSign,
  Layers, Settings, BarChart2, Zap, RefreshCw, Trash2, Eye, ArrowLeft, Edit2,
  Mail, Calendar, Users, ShieldAlert, Check
} from 'lucide-react';
import AppLayout from './AppLayout';
import { getEmployees, getDepartments } from '../api/employees';
import {
  getStructures, getStructureById, createStructure, updateStructure,
  deleteStructure, createRule, updateRule, deleteRule,
  getPayruns, getPayrunById, createPayrun, updatePayrun, deletePayrun,
  computePayrun, validatePayrun, markPayrunPaid, getPayrollDashboard,
  deletePayslipFromPayrun, assignContractToPayslip,
} from '../api/payroll';
import {
  UserRole,
  canAccessPayrollModule,
  canViewPayrollAdminTabs,
  canManagePayruns,
  canDeletePayrun,
  canManageStructures,
  canManageRules,
  getDepartmentColor,
} from '../utils/rbac';
import { getCurrentUser } from '../api/auth';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from 'recharts';

// ─── Formatters & Utility Helpers ─────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n) || 0);
const fmtNum = (n) => new Intl.NumberFormat('en-IN').format(Number(n) || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const CATEGORIES = ['BASIC', 'ALLOWANCE', 'DEDUCTION', 'GROSS', 'NET'];

const getInitials = (name) => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const getCategoryPillClass = (cat) => {
  const c = (cat || '').toUpperCase();
  if (c === 'NET') return 'status-pill-neutral';
  if (c === 'DEDUCTION') return 'status-pill-danger';
  if (c === 'BASIC' || c === 'GROSS' || c === 'ALLOWANCE') return 'status-pill-success';
  return 'status-pill-neutral';
};

const StatusPill = ({ status }) => {
  const s = (status || '').toLowerCase();
  let pillClass = 'status-pill-neutral';
  let label = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Draft';
  
  if (s === 'paid' || s === 'active' || s === 'done' || s === 'approved') {
    pillClass = 'status-pill-success';
  } else if (s === 'validated' || s === 'computed') {
    pillClass = 'status-pill-sky';
  } else if (s === 'draft') {
    pillClass = 'status-pill-warning';
  } else if (s === 'inactive' || s === 'cancelled') {
    pillClass = 'status-pill-danger';
  }

  return (
    <span className={`status-pill ${pillClass}`}>
      <span className="status-dot" />
      {label}
    </span>
  );
};

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: BarChart2, path: '/payroll/dashboard' },
  { key: 'payruns',   label: 'Payruns',   icon: Zap,      path: '/payroll/payruns'   },
  { key: 'payslips',  label: 'Payslips',  icon: FileText, path: '/payroll/payslips'  },
  { key: 'structures',label: 'Structures',icon: Layers,   path: '/payroll/structures'},
  { key: 'rules',     label: 'Rules',     icon: Settings, path: '/payroll/rules'     },
];

// ─── Dashboard Tab ────────────────────────────────────────────────────────────
const KPICard = ({ label, value, qualifier, qualifierPositive }) => (
  <div className='card' style={{ padding: '20px 24px', flex: 1, minWidth: 0 }}>
    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</div>
    <div className='font-display' style={{ fontSize: 28, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.1 }}>{value}</div>
    {qualifier && <div style={{ fontSize: 12, marginTop: 4, color: qualifierPositive ? 'var(--success)' : 'var(--text-secondary)', fontWeight: 500 }}>{qualifier}</div>}
  </div>
);

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return <div style={{ background: 'var(--ink)', color: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600 }}>{fmt(payload[0].value)}</div>;
  }
  return null;
};

const DashboardTab = ({ data, loading, error }) => {
  if (loading) return <div className='page-loading-state'><RefreshCw size={24} className='spin' /><span>Loading dashboard data…</span></div>;
  if (error) return (
    <div className="alert-box alert-box-danger" style={{ marginBottom: '1.25rem' }}>
      <AlertCircle size={16} />
      <span>{error}</span>
    </div>
  );
  if (!data) return (
    <div className='card' style={{ padding: 48, textAlign: 'center', background: 'var(--muted)', backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)', backgroundSize: '18px 18px' }}>
      <div className='font-display' style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Run your first payroll</div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>No payroll data yet. Create a payrun to see metrics here.</p>
    </div>
  );

  const trend = (data.monthly_trend || []).map((m) => ({ month: m.month, value: Number(m.total_net) }));
  const deptData = (data.cost_by_department || []).map((d) => ({ name: d.department_name, value: Number(d.total_cost) }));
  const peakValue = trend.length ? Math.max(...trend.map((t) => t.value)) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 16 }}>
        <KPICard label='Total Net Salary Paid'    value={fmt(data.total_payroll)}         qualifier='Current period' />
        <KPICard label='Payslips Generated'        value={fmtNum(data.payslips_generated)} qualifier='This payrun' />
        <KPICard label='Avg Salary / Employee'     value={fmt(data.average_salary)}        qualifier='Based on current payrun' />
        <KPICard label='Approved Time Off Days'    value={`${data.approved_time_off || 0} Days`} qualifier='Across selected period' />
        <KPICard label='Attendance Health'         value={`${Math.round((data.attendance_health || 0) * 100)}%`} qualifier='Present / reviewed records' qualifierPositive={(data.attendance_health || 0) >= 0.85} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <div className='card' style={{ padding: '20px 24px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Salary Cost by Department</div>
          <ResponsiveContainer width='100%' height={200}>
            <BarChart data={deptData} barSize={28}>
              <XAxis dataKey='name' tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)' }} />
              <Bar dataKey='value' fill='var(--sky)' radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className='card' style={{ padding: '20px 24px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Monthly Net Salary Trend</div>
          <ResponsiveContainer width='100%' height={200}>
            <LineChart data={trend}>
              <CartesianGrid vertical={false} stroke='var(--border)' />
              <XAxis dataKey='month' tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Line type='monotone' dataKey='value' stroke='var(--sky)' strokeWidth={1.5}
                dot={(props) => {
                  const isPeak = props.value === peakValue;
                  return <circle key={props.index} cx={props.cx} cy={props.cy} r={isPeak ? 6 : 4}
                    fill={isPeak ? 'var(--ink)' : 'var(--sky)'} stroke='white' strokeWidth={2} />;
                }}
                activeDot={{ r: 6, fill: 'var(--coral)' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className='card' style={{ padding: '20px 24px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Payslip Status</div>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', paddingBottom: 14, marginBottom: 14 }}>
            {[{ label: 'Total', count: data.payslips_generated || 0, color: 'var(--success)' },
              { label: 'Missing Contract', count: data.missing_contracts || 0, color: 'var(--warning)' }].map((item, i, arr) => (
              <div key={item.label} style={{ flex: 1, textAlign: 'center', borderRight: i < arr.length - 1 ? '1px solid var(--border)' : 'none', padding: '0 10px' }}>
                <div className='font-display' style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)' }}>{item.count}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{item.label}</div>
                <div style={{ display: 'flex', gap: 2, justifyContent: 'center', marginTop: 5 }}>
                  {[...Array(8)].map((_, j) => <div key={j} style={{ width: 3, height: 10, borderRadius: 2, background: j < Math.min(7, item.count) ? item.color : 'var(--border)' }} />)}
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Alerts</div>
          {data.missing_contracts > 0
            ? <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--warning)', flexShrink: 0 }} />
                <span style={{ fontSize: 13 }}>{data.missing_contracts} employee(s) missing active contract</span>
              </div>
            : <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No active alerts</div>}
        </div>
      </div>
    </div>
  );
};

// ─── Modal: New Payrun (2-Step Daybook Wizard) ─────────────────────────────────
const NewPayrunModal = ({ structures, onClose, onCreated }) => {
  const [step, setStep] = useState(1);
  const [employees, setEmployees] = useState([]);
  const [empSearch, setEmpSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [loadingEmps, setLoadingEmps] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [form, setForm] = useState({
    name: '',
    salary_structure_id: structures[0]?.id || '',
    date_from: '',
    date_to: '',
  });

  const goStep2 = async () => {
    if (!form.name || !form.salary_structure_id || !form.date_from || !form.date_to) {
      setFormError('All fields in Step 1 are required.');
      return;
    }
    setFormError(null);
    setLoadingEmps(true);
    try {
      const emps = await getEmployees();
      const list = Array.isArray(emps) ? emps : emps.items || [];
      setEmployees(list);
      setSelected(new Set(list.map((e) => e.id)));
    } catch {
      setEmployees([]);
    } finally {
      setLoadingEmps(false);
      setStep(2);
    }
  };

  const handleCreate = async () => {
    setSubmitting(true);
    setFormError(null);
    try {
      const payload = { ...form, salary_structure_id: Number(form.salary_structure_id) };
      const payrun = await createPayrun(payload);
      if (selected.size > 0) {
        await computePayrun(payrun.id, [...selected]);
      }
      onCreated(payrun);
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleEmp = (id) => setSelected((prev) => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const filteredEmps = employees.filter((e) =>
    !empSearch ||
    e.name?.toLowerCase().includes(empSearch.toLowerCase()) ||
    e.department_name?.toLowerCase().includes(empSearch.toLowerCase())
  );

  return (
    <div className="daybook-modal-backdrop" onClick={onClose}>
      <div className="daybook-modal-card" style={{ maxWidth: 580 }} onClick={(e) => e.stopPropagation()}>
        <div className="daybook-modal-header">
          <div>
            <h2 className="daybook-modal-title">New Pay Run</h2>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {step === 1 ? 'Step 1: Set pay period & salary structure' : 'Step 2: Select included employee records'}
            </div>
          </div>
          <button className="daybook-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="daybook-modal-body">
          {/* 2-Step Progress Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '4px 0 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: step > 1 ? 'var(--success)' : 'var(--ink)',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700
              }}>
                {step > 1 ? <Check size={14} /> : '1'}
              </div>
              <span style={{ fontSize: 13, fontWeight: step === 1 ? 600 : 500, color: step === 1 ? 'var(--ink)' : 'var(--text-secondary)' }}>
                Scope & Dates
              </span>
            </div>

            <div style={{ width: 48, height: 2, background: step > 1 ? 'var(--success)' : 'var(--border)' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: step === 2 ? 'var(--ink)' : 'var(--muted)',
                color: step === 2 ? '#fff' : 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700
              }}>
                2
              </div>
              <span style={{ fontSize: 13, fontWeight: step === 2 ? 600 : 500, color: step === 2 ? 'var(--ink)' : 'var(--text-secondary)' }}>
                Employees ({selected.size})
              </span>
            </div>
          </div>

          {formError && (
            <div className="alert-box alert-box-danger">
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}

          {step === 1 && (
            <div className="form-grid form-grid-1col">
              <div>
                <label className="form-label">Pay Run Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. September 2026 Payrun"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div>
                <label className="form-label">Salary Structure</label>
                <select
                  className="form-control"
                  value={form.salary_structure_id}
                  onChange={(e) => setForm((f) => ({ ...f, salary_structure_id: e.target.value }))}
                >
                  {structures.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="form-grid-2col" style={{ gap: 12 }}>
                <div>
                  <label className="form-label">Date From</label>
                  <input
                    type="date"
                    className="form-control"
                    value={form.date_from}
                    onChange={(e) => setForm((f) => ({ ...f, date_from: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="form-label">Date To</label>
                  <input
                    type="date"
                    className="form-control"
                    value={form.date_to}
                    onChange={(e) => setForm((f) => ({ ...f, date_to: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                <div className="search-pill-container" style={{ flex: 1 }}>
                  <Search size={14} className="search-pill-icon" />
                  <input
                    type="text"
                    placeholder="Search employees by name..."
                    value={empSearch}
                    onChange={(e) => setEmpSearch(e.target.value)}
                    className="search-pill-input"
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => selected.size === employees.length ? setSelected(new Set()) : setSelected(new Set(employees.map(e => e.id)))}
                >
                  {selected.size === employees.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="card table-card" style={{ maxHeight: 280, overflowY: 'auto' }}>
                <table className="daybook-table">
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}></th>
                      <th>Employee</th>
                      <th>Department</th>
                      <th style={{ textAlign: 'right' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmps.map((e) => {
                      const deptName = e.department_name || e.department?.name || 'General';
                      const deptColor = getDepartmentColor(deptName);
                      return (
                        <tr key={e.id} onClick={() => toggleEmp(e.id)} style={{ cursor: 'pointer' }}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selected.has(e.id)}
                              onChange={() => toggleEmp(e.id)}
                              onClick={(ev) => ev.stopPropagation()}
                              style={{ accentColor: 'var(--coral)', width: 15, height: 15 }}
                            />
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div className="dept-initials-chip-sm" style={{ backgroundColor: deptColor }}>
                                {getInitials(e.name)}
                              </div>
                              <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{e.name}</span>
                            </div>
                          </td>
                          <td>
                            <span style={{ color: deptColor, fontWeight: 500, fontSize: 13 }}>{deptName}</span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <StatusPill status={e.status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="daybook-modal-footer">
          {step === 1 ? (
            <>
              <button type="button" className="btn btn-outline" onClick={onClose}>Discard</button>
              <button type="button" className="btn-coral" onClick={goStep2} disabled={loadingEmps}>
                {loadingEmps ? 'Loading Employees…' : 'Continue to Employees'}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-outline" onClick={() => setStep(1)}>Back</button>
              <button type="button" className="btn-coral" onClick={handleCreate} disabled={submitting || selected.size === 0}>
                {submitting ? 'Generating Payrun…' : `Create Payrun (${selected.size})`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Modal: Edit Payrun ───────────────────────────────────────────────────────
const EditPayrunModal = ({ payrun, structures, onClose, onUpdated }) => {
  const [form, setForm] = useState({
    name: payrun.name,
    salary_structure_id: payrun.salary_structure_id,
    date_from: String(payrun.date_from).substring(0, 10),
    date_to: String(payrun.date_to).substring(0, 10),
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleUpdate = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const updated = await updatePayrun(payrun.id, {
        ...form,
        salary_structure_id: Number(form.salary_structure_id),
      });
      onUpdated(updated);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="daybook-modal-backdrop" onClick={onClose}>
      <div className="daybook-modal-card" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="daybook-modal-header">
          <h2 className="daybook-modal-title">Edit Pay Run</h2>
          <button className="daybook-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="daybook-modal-body">
          {error && (
            <div className="alert-box alert-box-danger">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
          {payrun.status !== 'draft' && (
            <div className="alert-box alert-box-warning" style={{ marginBottom: '1rem', fontSize: '0.8125rem' }}>
              <AlertTriangle size={15} />
              <span>
                This payrun is currently <strong>{payrun.status}</strong>. Modifying its period or structure will reset status to <strong>Draft</strong> so calculations can be regenerated.
              </span>
            </div>
          )}
          <div className="form-grid form-grid-1col">
            <div>
              <label className="form-label">Pay Run Name</label>
              <input
                type="text"
                className="form-control"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label">Salary Structure</label>
              <select
                className="form-control"
                value={form.salary_structure_id}
                onChange={(e) => setForm((f) => ({ ...f, salary_structure_id: e.target.value }))}
              >
                {structures.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-grid-2col" style={{ gap: 12 }}>
              <div>
                <label className="form-label">From</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.date_from}
                  onChange={(e) => setForm((f) => ({ ...f, date_from: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label">To</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.date_to}
                  onChange={(e) => setForm((f) => ({ ...f, date_to: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="daybook-modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-coral" onClick={handleUpdate} disabled={submitting}>
            {submitting ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Modal: Salary Structure ──────────────────────────────────────────────────
const StructureModal = ({ isOpen, onClose, onSaved, editingStructure }) => {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (editingStructure) {
      setName(editingStructure.name || '');
      setNotes(editingStructure.notes || '');
      setIsActive(editingStructure.is_active ?? true);
    } else {
      setName('');
      setNotes('');
      setIsActive(true);
    }
    setError(null);
  }, [editingStructure, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!name.trim()) { setError('Structure name is required.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      if (editingStructure?.id) {
        await updateStructure(editingStructure.id, { name, notes: notes || null, is_active: isActive });
        onSaved('Structure updated successfully');
      } else {
        await createStructure({ name, notes: notes || null, is_active: isActive });
        onSaved('Structure created successfully');
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="daybook-modal-backdrop" onClick={onClose}>
      <div className="daybook-modal-card" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div className="daybook-modal-header">
          <h2 className="daybook-modal-title">
            {editingStructure ? 'Edit Salary Structure' : 'New Salary Structure'}
          </h2>
          <button className="daybook-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="daybook-modal-body">
          {error && (
            <div className="alert-box alert-box-danger">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
          <div className="form-grid form-grid-1col">
            <div>
              <label className="form-label">Structure Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Regular Permanent Staff"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Notes & Description</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Optional description of this compensation structure..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, marginTop: 4 }}>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                style={{ accentColor: 'var(--coral)', width: 16, height: 16 }}
              />
              <span style={{ fontWeight: 500, color: 'var(--ink)' }}>Active Structure</span>
            </label>
          </div>
        </div>

        <div className="daybook-modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="button" className="btn-coral" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving…' : editingStructure ? 'Save Changes' : 'Create Structure'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Modal: Salary Rule (with 3-Column Panel) ─────────────────────────────────
const SalaryRuleModal = ({ isOpen, onClose, onSaved, editingRule, structures, defaultStructureId }) => {
  const [form, setForm] = useState({
    name: '',
    code: '',
    category: 'BASIC',
    sequence: 10,
    salary_structure_id: defaultStructureId || (structures[0]?.id ? String(structures[0].id) : ''),
    computation: 'fixed',
    fixed_amount: '',
    percentage: '',
    percentage_base: 'BASIC',
    python_code: 'result = CONTRACT_WAGE * 0.5',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (editingRule) {
      setForm({
        name: editingRule.name || '',
        code: editingRule.code || '',
        category: editingRule.category || 'BASIC',
        sequence: editingRule.sequence ?? 10,
        salary_structure_id: editingRule.salary_structure_id ? String(editingRule.salary_structure_id) : (defaultStructureId ? String(defaultStructureId) : ''),
        computation: editingRule.computation || 'fixed',
        fixed_amount: editingRule.fixed_amount != null ? String(editingRule.fixed_amount) : '',
        percentage: editingRule.percentage != null ? String(editingRule.percentage) : '',
        percentage_base: editingRule.percentage_base || 'BASIC',
        python_code: editingRule.python_code || '',
      });
    } else {
      setForm({
        name: '',
        code: '',
        category: 'BASIC',
        sequence: 10,
        salary_structure_id: defaultStructureId ? String(defaultStructureId) : (structures[0]?.id ? String(structures[0].id) : ''),
        computation: 'fixed',
        fixed_amount: '',
        percentage: '',
        percentage_base: 'BASIC',
        python_code: '',
      });
    }
    setError(null);
  }, [editingRule, defaultStructureId, structures, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!form.name || !form.code) {
      setError('Rule name and code are required.');
      return;
    }
    const structId = Number(form.salary_structure_id || defaultStructureId);
    if (!structId) {
      setError('Please select a Salary Structure.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        code: form.code.toUpperCase(),
        category: form.category,
        sequence: Number(form.sequence) || 10,
        computation: form.computation,
        fixed_amount: form.computation === 'fixed' ? (Number(form.fixed_amount) || 0) : null,
        percentage: form.computation === 'percentage' ? (Number(form.percentage) || 0) : null,
        percentage_base: form.computation === 'percentage' ? form.percentage_base : null,
        python_code: form.computation === 'python' ? form.python_code : null,
      };

      if (editingRule?.id) {
        await updateRule(editingRule.id, payload);
      } else {
        await createRule(structId, payload);
      }
      onSaved(editingRule?.id ? 'Rule updated successfully' : 'Rule created successfully');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="daybook-modal-backdrop" onClick={onClose}>
      <div className="daybook-modal-card" style={{ maxWidth: 580 }} onClick={(e) => e.stopPropagation()}>
        <div className="daybook-modal-header">
          <h2 className="daybook-modal-title">
            {editingRule ? 'Edit Salary Rule' : 'New Salary Rule'}
          </h2>
          <button className="daybook-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="daybook-modal-body">
          {error && (
            <div className="alert-box alert-box-danger">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-grid-2col" style={{ gap: 14 }}>
            <div>
              <label className="form-label">Rule Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Basic Salary"
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label">Code</label>
              <input
                type="text"
                className="form-control font-mono"
                placeholder="e.g. BASIC"
                value={form.code}
                onChange={(e) => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
              />
            </div>
            <div>
              <label className="form-label">Category</label>
              <select
                className="form-control"
                value={form.category}
                onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Sequence (Order)</label>
              <input
                type="number"
                className="form-control font-mono"
                value={form.sequence}
                onChange={(e) => setForm(f => ({ ...f, sequence: e.target.value }))}
              />
            </div>
            {(!defaultStructureId || structures.length > 1) && (
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Salary Structure</label>
                <select
                  className="form-control"
                  value={form.salary_structure_id}
                  onChange={(e) => setForm(f => ({ ...f, salary_structure_id: e.target.value }))}
                >
                  {structures.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* 3-Column Computation Selector Panel (§6G) */}
          <div style={{ marginTop: 16 }}>
            <label className="form-label" style={{ marginBottom: 8 }}>Computation Method</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[
                { key: 'fixed', label: 'Fixed Amount', sub: 'Fixed monetary value' },
                { key: 'percentage', label: 'Percentage %', sub: '% of base code' },
                { key: 'python', label: 'Python Formula', sub: 'Dynamic code expression' },
              ].map(opt => {
                const active = form.computation === opt.key;
                return (
                  <div
                    key={opt.key}
                    onClick={() => setForm(f => ({ ...f, computation: opt.key }))}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--r-md)',
                      border: active ? '2px solid var(--coral)' : '1px solid var(--border)',
                      background: active ? 'var(--coral-bg)' : 'var(--card)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ fontWeight: active ? 700 : 600, color: active ? 'var(--ink)' : 'var(--text-secondary)', fontSize: 13 }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: 11, color: active ? 'var(--coral)' : 'var(--text-muted)', marginTop: 3 }}>
                      {active ? '● Selected' : opt.sub}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Computation Dynamic Inputs */}
          <div style={{ marginTop: 14 }}>
            {form.computation === 'fixed' && (
              <div>
                <label className="form-label">Fixed Amount (₹)</label>
                <input
                  type="number"
                  className="form-control font-mono"
                  placeholder="e.g. 25000"
                  value={form.fixed_amount}
                  onChange={(e) => setForm(f => ({ ...f, fixed_amount: e.target.value }))}
                />
              </div>
            )}
            {form.computation === 'percentage' && (
              <div className="form-grid-2col" style={{ gap: 12 }}>
                <div>
                  <label className="form-label">Percentage %</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-control font-mono"
                    placeholder="e.g. 12"
                    value={form.percentage}
                    onChange={(e) => setForm(f => ({ ...f, percentage: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="form-label">Base Code</label>
                  <input
                    type="text"
                    className="form-control font-mono"
                    placeholder="e.g. BASIC"
                    value={form.percentage_base}
                    onChange={(e) => setForm(f => ({ ...f, percentage_base: e.target.value.toUpperCase() }))}
                  />
                </div>
              </div>
            )}
            {form.computation === 'python' && (
              <div>
                <label className="form-label">Python Code Expression</label>
                <textarea
                  rows={3}
                  className="form-control font-mono"
                  placeholder="result = CONTRACT_WAGE * 0.5"
                  value={form.python_code}
                  onChange={(e) => setForm(f => ({ ...f, python_code: e.target.value }))}
                />
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                  Examples: <code>result = categories['BASIC'] * 0.1</code> or <code>result = CONTRACT_WAGE * 0.5</code>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="daybook-modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="button" className="btn-coral" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving…' : editingRule ? 'Save Changes' : 'Create Rule'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Component: Payslip Ledger Lines Table ─────────────────────────────────────
const SlipLinesTable = ({ lines }) => (
  <table className="daybook-table" style={{ margin: 0 }}>
    <thead>
      <tr>
        <th style={{ width: '40%' }}>Rule Name</th>
        <th style={{ width: '20%' }}>Category</th>
        <th style={{ width: '20%' }}>Code</th>
        <th style={{ width: '20%', textAlign: 'right' }}>Amount</th>
      </tr>
    </thead>
    <tbody>
      {lines.map((line) => {
        const isDed = (line.category || '').toUpperCase() === 'DEDUCTION';
        const isNet = (line.category || '').toUpperCase() === 'NET';
        return (
          <tr
            key={line.id}
            style={{
              background: isNet ? 'rgba(23, 27, 38, 0.05)' : 'transparent',
              borderTop: isNet ? '2px solid var(--border)' : undefined
            }}
          >
            <td>
              <span style={{ fontWeight: isNet ? 700 : 500, color: 'var(--ink)', fontSize: isNet ? '0.95rem' : '0.875rem' }}>
                {line.rule_name}
              </span>
            </td>
            <td>
              <span className={`status-pill ${getCategoryPillClass(line.category)}`}>
                {line.category}
              </span>
            </td>
            <td>
              <span className="font-mono" style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                {line.code}
              </span>
            </td>
            <td style={{ textAlign: 'right' }}>
              <span
                className={isNet ? 'font-display' : 'font-mono'}
                style={{
                  fontWeight: isNet ? 800 : 500,
                  fontSize: isNet ? '1.15rem' : '0.875rem',
                  color: isDed ? 'var(--danger)' : isNet ? 'var(--ink)' : 'inherit',
                }}
              >
                {isDed ? '−' : ''}{fmt(line.amount)}
              </span>
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
);

// ─── View: Dedicated Payslip Detail ───────────────────────────────────────────
const PayslipDetail = ({ slip, payrunName, onBack }) => {
  const deptName = slip.employee?.department_name || slip.employee?.department?.name || 'General';
  const deptColor = getDepartmentColor(deptName);
  const employeeName = slip.employee?.name || `Employee #${slip.employee_id}`;

  return (
    <div>
      {/* Top Breadcrumb Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="button" className="btn btn-outline btn-sm" onClick={onBack}>
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>
          <div>
            <h1 className="page-title font-display" style={{ margin: 0, fontSize: '1.375rem' }}>
              Payslip / {employeeName}
            </h1>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Period: {fmtDate(slip.date_from)} – {fmtDate(slip.date_to)}
            </span>
          </div>
        </div>

        <div className="page-actions-group">
          <StatusPill status={slip.status} />
          <button
            type="button"
            className="btn btn-outline"
            style={{ background: 'var(--sky)', color: '#fff', borderColor: 'var(--sky)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => window.print()}
          >
            <FileText size={15} />
            <span>Print Payslip</span>
          </button>
        </div>
      </div>

      {slip.has_warning && (
        <div
          className="alert-box alert-box-warning"
          style={{ marginBottom: '1.25rem', alignItems: 'flex-start' }}
        >
          <AlertTriangle size={18} style={{ marginTop: 2, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
              {slip.warning_message?.includes('Post-tenure')
                ? 'Post-Tenure Settlement Notice'
                : 'Notice: Contract Advisory'}
            </div>
            <div style={{ fontSize: '0.8125rem', marginTop: 2, lineHeight: 1.5 }}>
              {slip.warning_message || 'Notice: Discrepancy flagged on working hours or contract.'}
            </div>
            {!slip.contract_id && (
              <div style={{ marginTop: 8 }}>
                <a
                  href="/contracts"
                  className="btn btn-outline btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, background: '#fff' }}
                >
                  <FileText size={13} />
                  <span>Open Contracts Module to create or activate a contract →</span>
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hero Overview Card */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
          <div className="dept-initials-chip" style={{ backgroundColor: deptColor, width: 48, height: 48, fontSize: 16 }}>
            {getInitials(employeeName)}
          </div>
          <div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--ink)' }}>{employeeName}</div>
            <div style={{ fontSize: '0.8125rem', color: deptColor, fontWeight: 500 }}>{deptName}</div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Net Salary</div>
            <div className="font-display" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--ink)' }}>
              {fmt(slip.net_wage)}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Pay Run</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{payrunName || `#${slip.payrun_id}`}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Worked Days</div>
            <div className="font-mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{slip.worked_days ?? '—'} days</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Basic Wage</div>
            <div className="font-mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{fmt(slip.basic_wage)}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Gross Wage</div>
            <div className="font-mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{fmt(slip.gross_wage)}</div>
          </div>
        </div>
      </div>

      {/* Salary Computation Ledger Card */}
      <div className="card table-card">
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 className="font-display" style={{ fontSize: '0.9375rem', fontWeight: 600, margin: 0, color: 'var(--ink)' }}>
            Salary Computation Ledger
          </h3>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {(slip.lines || []).length} calculation rules applied
          </span>
        </div>
        {(slip.lines || []).length === 0 ? (
          <div style={{ padding: 36, textAlign: 'center', color: 'var(--text-muted)' }}>
            No calculation lines available for this payslip. Compute the payrun to generate items.
          </div>
        ) : (
          <SlipLinesTable lines={slip.lines} />
        )}
      </div>
    </div>
  );
};

// ─── View: Payrun Detail ──────────────────────────────────────────────────────
const PayrunDetail = ({ payrunId, onBack, onRefresh, currentUser }) => {
  const [payrun, setPayrun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [acting, setActing] = useState(false);
  const [toast, setToast] = useState(null);
  const [expandedSlip, setExpandedSlip] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [structures, setStructures] = useState([]);

  useEffect(() => {
    getStructures().then((d) => setStructures(Array.isArray(d) ? d : d.items || []));
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const d = await getPayrunById(payrunId);
      setPayrun(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [payrunId]);

  useEffect(() => { load(); }, [load]);

  const doAction = async (fn, label) => {
    setActing(true);
    setError(null);
    try {
      await fn();
      setToast(`${label} action completed successfully.`);
      await load();
      onRefresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setActing(false);
    }
  };

  const handleRemovePayslip = async (slipId, empName, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Remove ${empName} from this payrun?`)) return;
    try {
      await deletePayslipFromPayrun(payrun.id, slipId);
      setToast(`Removed ${empName} from payrun.`);
      await load();
      onRefresh();
    } catch (err) {
      setError(err.message || 'Failed to remove employee from payrun');
    }
  };

  if (loading) {
    return (
      <div className="page-loading-state">
        <RefreshCw size={24} className="spin" />
        <span>Loading payrun details…</span>
      </div>
    );
  }

  if (!payrun) {
    return (
      <div className="alert-box alert-box-danger">
        <AlertCircle size={16} />
        <span>{error || 'Payrun could not be found.'}</span>
      </div>
    );
  }

  const status = payrun.status;
  const canCompute  = status === 'draft';
  const canValidate = status === 'computed';
  const canPaid     = status === 'validated';
  const warnings    = (payrun.payslips || []).filter((p) => p.has_warning).length;
  const hasDoublePaymentRisk = (payrun.payslips || []).some((p) => p.warning_message?.includes('Double payment'));
  const totalNet    = (payrun.payslips || []).reduce((acc, p) => acc + (Number(p.net_wage) || 0), 0);
  const doneCount   = (payrun.payslips || []).filter((p) => p.status === 'done').length;

  if (expandedSlip) {
    const slip = (payrun.payslips || []).find((s) => s.id === expandedSlip);
    if (slip) return <PayslipDetail slip={slip} payrunName={payrun.name} onBack={() => setExpandedSlip(null)} />;
  }

  return (
    <div>
      {/* Top Breadcrumb Nav Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="button" className="btn btn-outline btn-sm" onClick={onBack}>
            <ArrowLeft size={14} />
            <span>Back to Payruns</span>
          </button>
          <div>
            <h1 className="page-title font-display" style={{ margin: 0, fontSize: '1.375rem' }}>
              Payrun / {payrun.name}
            </h1>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Period: {fmtDate(payrun.date_from)} – {fmtDate(payrun.date_to)}
            </span>
          </div>
          <StatusPill status={status} />
        </div>

        <div className="page-actions-group">
          {!canManagePayruns(currentUser) && (
            <span className="status-pill status-pill-neutral">
              <Eye size={13} style={{ marginRight: 4 }} />
              Read-Only Payrun
            </span>
          )}
          {status !== 'paid' && canManagePayruns(currentUser) && (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowEdit(true)} title="Edit Payrun parameters">
              <Edit2 size={13} />
              <span>Edit</span>
            </button>
          )}

          {status !== 'draft' && status !== 'paid' && canManagePayruns(currentUser) && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => doAction(async () => {
                await updatePayrun(payrun.id, { status: 'draft' });
              }, 'Reset to Draft')}
              title="Reset payrun back to Draft to re-calculate"
            >
              <RefreshCw size={13} />
              <span>Reset to Draft</span>
            </button>
          )}

          {status !== 'paid' && canDeletePayrun(currentUser) && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ color: 'var(--danger)', borderColor: 'rgba(220, 38, 38, 0.25)', background: 'var(--danger-bg)' }}
              onClick={async () => {
                if (!window.confirm(`Are you sure you want to delete payrun "${payrun.name}"? This cannot be undone.`)) return;
                try {
                  await deletePayrun(payrun.id);
                  onBack();
                  onRefresh();
                } catch (e) {
                  setError(e.message);
                }
              }}
              title="Delete Payrun"
            >
              <Trash2 size={13} />
              <span>Delete</span>
            </button>
          )}

          {canManagePayruns(currentUser) && (
            <>
              <button
                type="button"
                className={canCompute ? 'btn-coral' : 'btn btn-outline'}
                disabled={!canCompute || acting}
                onClick={() => doAction(() => computePayrun(payrun.id), 'Compute')}
              >
                <Zap size={14} />
                <span>Compute</span>
              </button>

              <button
                type="button"
                className={canValidate ? 'btn-coral' : 'btn btn-outline'}
                disabled={!canValidate || acting}
                onClick={() => doAction(() => validatePayrun(payrun.id), 'Validate')}
              >
                <CheckCircle2 size={14} />
                <span>Validate</span>
              </button>

              <button
                type="button"
                className={canPaid ? 'btn-coral' : 'btn btn-outline'}
                disabled={!canPaid || acting}
                onClick={() => doAction(() => markPayrunPaid(payrun.id), 'Mark Paid')}
              >
                <Check size={14} />
                <span>Mark Paid</span>
              </button>

              <button
                type="button"
                className="btn btn-outline"
                style={{ background: 'var(--sky)', color: '#fff', borderColor: 'var(--sky)' }}
                onClick={() => setToast('Payslips generated & dispatched to employees.')}
              >
                <Mail size={14} />
                <span>Send Payslips</span>
              </button>
            </>
          )}
        </div>
      </div>

      {toast && (
        <div className="alert-box alert-box-success" style={{ marginBottom: '1.25rem' }}>
          <CheckCircle2 size={16} />
          <span>{toast}</span>
        </div>
      )}

      {error && (
        <div className="alert-box alert-box-danger" style={{ marginBottom: '1.25rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {showEdit && (
        <EditPayrunModal
          payrun={payrun}
          structures={structures}
          onClose={() => setShowEdit(false)}
          onUpdated={() => { setShowEdit(false); setToast('Payrun updated.'); load(); onRefresh(); }}
        />
      )}

      {/* 4-Stat Overview Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4 }}>Pay Period</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{fmtDate(payrun.date_from)} – {fmtDate(payrun.date_to)}</div>
        </div>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4 }}>Structure ID</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>#{payrun.salary_structure_id}</div>
        </div>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4 }}>Total Net Payout</div>
          <div className="font-display" style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{fmt(totalNet)}</div>
        </div>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4 }}>Payslip Progress</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
            {doneCount} / {(payrun.payslips || []).length} finalized
          </div>
        </div>
      </div>

      {/* Payslips in this Payrun Table */}
      <div className="card table-card">
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 className="font-display" style={{ fontSize: '0.9375rem', fontWeight: 600, margin: 0, color: 'var(--ink)' }}>
            Payslips in this Payrun ({(payrun.payslips || []).length})
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {hasDoublePaymentRisk && (
              <span className="status-pill status-pill-danger">
                <AlertTriangle size={12} />
                Double Payment Risk
              </span>
            )}
            {warnings > 0 && !hasDoublePaymentRisk && (
              <span className="status-pill status-pill-warning">
                <AlertTriangle size={12} />
                {warnings} Advisory Warning{warnings > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <table className="daybook-table" style={{ margin: 0 }}>
          <thead>
            <tr>
              <th style={{ width: '28%' }}>Employee</th>
              <th style={{ width: '12%' }}>Worked</th>
              <th style={{ width: '15%', textAlign: 'right' }}>Basic</th>
              <th style={{ width: '15%', textAlign: 'right' }}>Gross</th>
              <th style={{ width: '15%', textAlign: 'right' }}>Net</th>
              <th style={{ width: '10%' }}>Status</th>
              <th style={{ width: '5%', textAlign: 'right' }}></th>
            </tr>
          </thead>
          <tbody>
            {(payrun.payslips || []).length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 36 }}>
                  No payslips generated yet. Click <strong>Compute</strong> above to run calculation.
                </td>
              </tr>
            ) : (
              (payrun.payslips || []).map((slip) => {
                const empName = slip.employee?.name || `Employee #${slip.employee_id}`;
                const deptName = slip.employee?.department_name || slip.employee?.department?.name || 'General';
                const deptColor = getDepartmentColor(deptName);

                return (
                  <tr key={slip.id} style={{ cursor: 'pointer' }} onClick={() => setExpandedSlip(slip.id)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="dept-initials-chip-sm" style={{ backgroundColor: deptColor }}>
                          {getInitials(empName)}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{empName}</span>
                            {slip.has_warning && (
                              <span
                                className={`status-pill ${slip.warning_message?.includes('Double payment') ? 'status-pill-danger' : 'status-pill-warning'}`}
                                style={{ padding: '2px 6px', fontSize: 10 }}
                                title={slip.warning_message || 'Warning'}
                              >
                                <AlertTriangle size={10} style={{ marginRight: 2 }} />
                                {slip.warning_message?.includes('Double payment') ? 'Double Payment Risk' : 'Warning'}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            {deptName}
                            {slip.has_warning && slip.warning_message && (
                              <span style={{ color: slip.warning_message?.includes('Double payment') ? 'var(--danger)' : '#d97706', marginLeft: 6 }}>
                                • {slip.warning_message}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="font-mono">{slip.worked_days} d</td>
                    <td className="font-mono" style={{ textAlign: 'right' }}>{fmt(slip.basic_wage)}</td>
                    <td className="font-mono" style={{ textAlign: 'right' }}>{fmt(slip.gross_wage)}</td>
                    <td className="font-mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--ink)' }}>
                      {fmt(slip.net_wage)}
                    </td>
                    <td><StatusPill status={slip.status} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {canManagePayruns(currentUser) && (payrun.status === 'draft' || payrun.status === 'computed') && (
                          <button
                            type="button"
                            className="btn-icon btn-icon-danger"
                            style={{ padding: 4 }}
                            onClick={(e) => handleRemovePayslip(slip.id, empName, e)}
                            title="Remove this employee from this payrun"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                        <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); setExpandedSlip(slip.id); }} title="View Payslip Details">
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Tab: Payruns (Accordion List) ────────────────────────────────────────────
const PayrunsTab = ({ structures, onRefresh, currentUser }) => {
  const [payruns, setPayruns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editingPayrun, setEditingPayrun] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [toast, setToast] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const d = await getPayruns();
      setPayruns(Array.isArray(d) ? d : d.items || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDeletePayrun = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this payrun? This action cannot be undone.')) return;
    try {
      await deletePayrun(id);
      setToast('Payrun deleted successfully.');
      load();
      onRefresh();
    } catch (err) {
      setError(err.message || 'Failed to delete payrun');
    }
  };

  useEffect(() => { load(); }, [load]);

  if (detailId) {
    return <PayrunDetail payrunId={detailId} onBack={() => setDetailId(null)} onRefresh={() => { load(); onRefresh(); }} currentUser={currentUser} />;
  }

  const filtered = payruns.filter((p) => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const yearStr = p.date_from ? new Date(p.date_from).getFullYear().toString() : '';
    const matchesYear = yearFilter === 'All' || yearStr === yearFilter;
    return matchesSearch && matchesYear;
  });

  return (
    <div>
      {/* Header Row per 00-foundations.md */}
      <div className="page-header-row" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title font-display">Pay Runs</h1>
          <p className="page-subtitle">Schedule, compute, and validate monthly payroll runs and employee payslips.</p>
        </div>
        <div className="page-actions-group">
          {!canManagePayruns(currentUser) && (
            <span className="status-pill status-pill-neutral">
              <Eye size={13} style={{ marginRight: 4 }} />
              Read-Only Access
            </span>
          )}
          {canManagePayruns(currentUser) && (
            <button
              type="button"
              className="btn-coral"
              onClick={() => setShowModal(true)}
              disabled={structures.length === 0}
            >
              <Plus size={16} />
              <span>New Pay Run</span>
            </button>
          )}
        </div>
      </div>

      {toast && (
        <div className="alert-box alert-box-success" style={{ marginBottom: '1.25rem' }}>
          <CheckCircle2 size={16} />
          <span>{toast}</span>
        </div>
      )}

      {error && (
        <div className="alert-box alert-box-danger" style={{ marginBottom: '1.25rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {showModal && structures.length > 0 && (
        <NewPayrunModal
          structures={structures}
          onClose={() => setShowModal(false)}
          onCreated={(pr) => {
            setShowModal(false);
            setToast(`Payrun "${pr.name}" created successfully.`);
            load();
            onRefresh();
          }}
        />
      )}

      {editingPayrun && (
        <EditPayrunModal
          payrun={editingPayrun}
          structures={structures}
          onClose={() => setEditingPayrun(null)}
          onUpdated={() => {
            setEditingPayrun(null);
            setToast('Payrun updated successfully.');
            load();
            onRefresh();
          }}
        />
      )}

      {/* Toolbar: Search Pill & Year Filter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: '1.25rem' }}>
        <div className="search-pill-container" style={{ minWidth: 280 }}>
          <Search size={15} className="search-pill-icon" />
          <input
            type="text"
            placeholder="Search payruns by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-pill-input"
          />
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            className="form-control"
            style={{ width: 'auto', padding: '0.45rem 1rem', fontSize: '0.84rem' }}
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
          >
            <option value="All">All Years</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="page-loading-state">
          <RefreshCw size={22} className="spin" />
          <span>Loading payruns…</span>
        </div>
      ) : (
        /* Accordion motif per 05-payroll.md §Screen: Payruns — List */
        <div className="card" style={{ overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Zap size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
              <p style={{ margin: 0, fontSize: 14 }}>
                {search ? 'No payruns match your search filters.' : 'No payruns created yet. Click "+ New Pay Run" above to get started.'}
              </p>
            </div>
          ) : (
            filtered.map((pr, i) => {
              const slips = pr.payslips || [];
              const warns = slips.filter((s) => s.has_warning).length;
              const expanded = expandedRow === pr.id;
              const canEdit = pr.status === 'draft';
              const doneSlips = slips.filter((s) => s.status === 'done').length;

              return (
                <div key={pr.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  {/* Accordion Row Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      padding: '16px 20px',
                      cursor: 'pointer',
                      transition: 'background 0.12s ease',
                      background: expanded ? 'rgba(239, 239, 242, 0.4)' : 'transparent',
                    }}
                    onClick={() => setExpandedRow(expanded ? null : pr.id)}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 'var(--r-md)', background: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)' }}>
                      <Zap size={16} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="font-display" style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--ink)' }}>
                        {pr.name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                        {fmtDate(pr.date_from)} – {fmtDate(pr.date_to)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', background: 'var(--muted)', padding: '3px 10px', borderRadius: 'var(--r-pill)' }}>
                        {slips.length} employees
                      </span>

                      {warns > 0 && (
                        <span className="status-pill status-pill-warning">
                          <AlertTriangle size={12} />
                          {warns} warning{warns > 1 ? 's' : ''}
                        </span>
                      )}

                      <StatusPill status={pr.status} />

                      {pr.status !== 'paid' && canManagePayruns(currentUser) && (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={(e) => { e.stopPropagation(); setEditingPayrun(pr); }}
                          title="Edit Payrun parameters"
                        >
                          <Edit2 size={13} />
                          <span>Edit</span>
                        </button>
                      )}

                      {pr.status !== 'paid' && canDeletePayrun(currentUser) && (
                        <button
                          type="button"
                          className="btn-icon btn-icon-danger"
                          title="Delete Payrun"
                          onClick={(e) => handleDeletePayrun(pr.id, e)}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={(e) => { e.stopPropagation(); setDetailId(pr.id); }}
                      >
                        <Eye size={13} />
                        <span>View</span>
                      </button>

                      <ChevronDown
                        size={16}
                        style={{
                          color: 'var(--text-secondary)',
                          transform: expanded ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.2s ease',
                        }}
                      />
                    </div>
                  </div>

                  {/* Expanded Accordion Area */}
                  {expanded && (
                    <div style={{ padding: '16px 24px 20px', background: 'var(--muted)', borderTop: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                        <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                          Status overview: <strong style={{ color: 'var(--ink)' }}>{slips.length}</strong> total payslips —{' '}
                          <strong style={{ color: 'var(--success)' }}>{doneSlips}</strong> completed,{' '}
                          <strong style={{ color: 'var(--ink)' }}>{slips.length - doneSlips}</strong> draft.
                          {warns > 0 && <span style={{ color: 'var(--warning)', fontWeight: 600 }}> ({warns} flagged with warnings).</span>}
                        </div>
                        <button
                          type="button"
                          className="btn-coral btn-sm"
                          onClick={() => setDetailId(pr.id)}
                        >
                          <span>Open Full Payrun View</span>
                          <ChevronRight size={13} />
                        </button>
                      </div>

                      {slips.length > 0 && (
                        <div className="card table-card" style={{ background: '#fff' }}>
                          <table className="daybook-table" style={{ margin: 0 }}>
                            <thead>
                              <tr>
                                <th>Employee</th>
                                <th style={{ textAlign: 'right' }}>Worked</th>
                                <th style={{ textAlign: 'right' }}>Basic</th>
                                <th style={{ textAlign: 'right' }}>Net</th>
                                <th style={{ textAlign: 'right' }}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {slips.slice(0, 5).map(s => (
                                <tr key={s.id}>
                                  <td style={{ fontWeight: 600, color: 'var(--ink)' }}>
                                    {s.employee?.name || `#${s.employee_id}`}
                                  </td>
                                  <td className="font-mono" style={{ textAlign: 'right' }}>{s.worked_days} d</td>
                                  <td className="font-mono" style={{ textAlign: 'right' }}>{fmt(s.basic_wage)}</td>
                                  <td className="font-mono" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(s.net_wage)}</td>
                                  <td style={{ textAlign: 'right' }}><StatusPill status={s.status} /></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {slips.length > 5 && (
                            <div style={{ padding: '8px 16px', fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', background: 'var(--card)', borderTop: '1px solid var(--border)' }}>
                              + {slips.length - 5} more payslips. Open full payrun view to see all records.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

// ─── Tab: Payslips (Directory List) ───────────────────────────────────────────
const PayslipsTab = ({ currentUser }) => {
  const [payruns, setPayruns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [expandedSlip, setExpandedSlip] = useState(null);

  const isEmployee = currentUser?.role === UserRole.EMPLOYEE;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const d = await getPayruns();
      setPayruns(Array.isArray(d) ? d : d.items || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const allSlips = payruns.flatMap((pr) => (pr.payslips || []).map((s) => ({ ...s, payrun_name: pr.name })));
  const filtered = allSlips
    .filter((s) => {
      if (isEmployee && currentUser) {
        const matchesId = s.employee_id === currentUser.id || s.employee?.user_id === currentUser.id;
        const matchesEmail = s.employee?.work_email && currentUser.email && s.employee.work_email.toLowerCase() === currentUser.email.toLowerCase();
        return matchesId || matchesEmail;
      }
      return true;
    })
    .filter((s) =>
      !search ||
      s.payrun_name.toLowerCase().includes(search.toLowerCase()) ||
      (s.employee?.name && s.employee.name.toLowerCase().includes(search.toLowerCase())) ||
      String(s.employee_id).includes(search)
    );

  if (expandedSlip) {
    const slip = allSlips.find((s) => s.id === expandedSlip);
    if (slip) return <PayslipDetail slip={slip} payrunName={slip.payrun_name} onBack={() => setExpandedSlip(null)} />;
  }

  return (
    <div>
      <div className="page-header-row" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title font-display">{isEmployee ? 'My Payslips' : 'Employee Payslips'}</h1>
          <p className="page-subtitle">
            {isEmployee
              ? 'Your official compensation records and monthly salary statements.'
              : 'Master ledger of generated compensation records and computed salary lines.'}
          </p>
        </div>
      </div>

      {error && (
        <div className="alert-box alert-box-danger" style={{ marginBottom: '1.25rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: '1.25rem' }}>
        <div className="search-pill-container" style={{ minWidth: 280 }}>
          <Search size={15} className="search-pill-icon" />
          <input
            type="text"
            placeholder={isEmployee ? "Search payslips by pay run..." : "Search payslips by employee or pay run..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-pill-input"
          />
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Showing <strong>{filtered.length}</strong> payslips
        </div>
      </div>

      {loading ? (
        <div className="page-loading-state">
          <RefreshCw size={22} className="spin" />
          <span>Loading payslips…</span>
        </div>
      ) : (
        <div className="card table-card">
          <table className="daybook-table">
            <thead>
              <tr>
                <th style={{ width: '25%' }}>Employee</th>
                <th style={{ width: '15%' }}>Pay Period</th>
                <th style={{ width: '18%' }}>Pay Run</th>
                <th style={{ width: '12%', textAlign: 'right' }}>Basic</th>
                <th style={{ width: '12%', textAlign: 'right' }}>Gross</th>
                <th style={{ width: '12%', textAlign: 'right' }}>Net</th>
                <th style={{ width: '6%', textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 36 }}>
                    No payslips match your query.
                  </td>
                </tr>
              ) : (
                filtered.map((slip) => {
                  const empName = slip.employee?.name || `Employee #${slip.employee_id}`;
                  const deptName = slip.employee?.department_name || slip.employee?.department?.name || 'General';
                  const deptColor = getDepartmentColor(deptName);

                  return (
                    <tr
                      key={slip.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setExpandedSlip(slip.id)}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="dept-initials-chip-sm" style={{ backgroundColor: deptColor }}>
                            {getInitials(empName)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{empName}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{deptName}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {fmtDate(slip.date_from)} – {fmtDate(slip.date_to)}
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                        {slip.payrun_name}
                      </td>
                      <td className="font-mono" style={{ textAlign: 'right' }}>{fmt(slip.basic_wage)}</td>
                      <td className="font-mono" style={{ textAlign: 'right' }}>{fmt(slip.gross_wage)}</td>
                      <td className="font-mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--ink)' }}>
                        {fmt(slip.net_wage)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <StatusPill status={slip.status} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── Tab: Salary Structures ───────────────────────────────────────────────────
const StructuresTab = ({ structures, loading, error, onRefresh, currentUser }) => {
  const canManage = canManageStructures(currentUser);
  const [search, setSearch] = useState('');
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [editingStructure, setEditingStructure] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [toast, setToast] = useState(null);
  const [formError, setFormError] = useState(null);

  const filtered = structures.filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase()));

  const openDetail = async (id) => {
    setDetailId(id);
    setDetailLoading(true);
    try {
      const d = await getStructureById(id);
      setDetail(d);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDeleteStructure = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this salary structure? This cannot be undone.')) return;
    try {
      await deleteStructure(id);
      setToast('Structure deleted successfully.');
      if (detailId === id) { setDetailId(null); setDetail(null); }
      onRefresh();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm('Are you sure you want to delete this salary rule?')) return;
    try {
      await deleteRule(ruleId);
      setToast('Salary rule removed.');
      if (detailId) await openDetail(detailId);
      onRefresh();
    } catch (e) {
      setFormError(e.message);
    }
  };

  if (detailId) {
    return (
      <div>
        <StructureModal
          isOpen={showStructureModal}
          onClose={() => { setShowStructureModal(false); setEditingStructure(null); }}
          onSaved={(msg) => { setToast(msg); openDetail(detailId); onRefresh(); }}
          editingStructure={editingStructure}
        />
        <SalaryRuleModal
          isOpen={showRuleModal}
          onClose={() => { setShowRuleModal(false); setEditingRule(null); }}
          onSaved={(msg) => { setToast(msg); openDetail(detailId); onRefresh(); }}
          editingRule={editingRule}
          structures={structures}
          defaultStructureId={detailId}
        />

        {/* Top Breadcrumb Nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => { setDetailId(null); setDetail(null); }}>
              <ArrowLeft size={14} />
              <span>Back to Structures</span>
            </button>
            <h1 className="page-title font-display" style={{ margin: 0, fontSize: '1.375rem' }}>
              Salary Structure / {detail?.name || 'Structure'}
            </h1>
            <StatusPill status={detail?.is_active ? 'active' : 'inactive'} />
          </div>

          <div className="page-actions-group">
            {!canManage && (
              <span className="status-pill status-pill-neutral">
                <Eye size={13} style={{ marginRight: 4 }} />
                Read-Only Structure
              </span>
            )}
            {canManage && (
              <>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => { setEditingStructure(detail); setShowStructureModal(true); }}
                >
                  <Edit2 size={13} />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ color: 'var(--danger)', borderColor: 'var(--border)' }}
                  onClick={(e) => handleDeleteStructure(detail.id, e)}
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
                </button>
                <button
                  type="button"
                  className="btn-coral"
                  onClick={() => { setEditingRule(null); setShowRuleModal(true); }}
                >
                  <Plus size={15} />
                  <span>Add Rule</span>
                </button>
              </>
            )}
          </div>
        </div>

        {toast && (
          <div className="alert-box alert-box-success" style={{ marginBottom: '1.25rem' }}>
            <CheckCircle2 size={16} />
            <span>{toast}</span>
          </div>
        )}

        {formError && (
          <div className="alert-box alert-box-danger" style={{ marginBottom: '1.25rem' }}>
            <AlertCircle size={16} />
            <span>{formError}</span>
          </div>
        )}

        {detailLoading ? (
          <div className="page-loading-state">
            <RefreshCw size={22} className="spin" />
            <span>Loading structure rules…</span>
          </div>
        ) : detail && (
          <div>
            {/* Overview Card */}
            <div className="card" style={{ padding: '16px 20px', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {detail.notes ? detail.notes : 'Standard calculation structure applied to contracts and pay runs.'}
              </div>
            </div>

            {/* Nested Salary Rules Table in sequence order per 05-payroll.md */}
            <div className="card table-card">
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 className="font-display" style={{ fontSize: '0.9375rem', fontWeight: 600, margin: 0, color: 'var(--ink)' }}>
                  Salary Calculation Rules ({(detail.salary_rules || []).length})
                </h3>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Evaluated in sequence order from top to bottom
                </span>
              </div>
              <table className="daybook-table">
                <thead>
                  <tr>
                    <th style={{ width: '8%' }}>Seq</th>
                    <th style={{ width: '32%' }}>Rule Name</th>
                    <th style={{ width: '15%' }}>Code</th>
                    <th style={{ width: '15%' }}>Category</th>
                    <th style={{ width: '15%' }}>Computation</th>
                    <th style={{ width: '15%', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail.salary_rules || []).length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 36 }}>
                        No calculation rules defined for this structure. Click <strong>+ Add Rule</strong> above.
                      </td>
                    </tr>
                  ) : (
                    (detail.salary_rules || [])
                      .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
                      .map((rule) => (
                        <tr key={rule.id}>
                          <td className="font-mono" style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                            {rule.sequence}
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--ink)' }}>
                            {rule.name}
                          </td>
                          <td>
                            <span className="font-mono" style={{ color: 'var(--sky)', fontWeight: 500, fontSize: 12 }}>
                              {rule.code}
                            </span>
                          </td>
                          <td>
                            <span className={`status-pill ${getCategoryPillClass(rule.category)}`}>
                              {rule.category}
                            </span>
                          </td>
                          <td style={{ fontSize: 13, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                            {rule.computation === 'fixed' && `Fixed: ${fmt(rule.fixed_amount)}`}
                            {rule.computation === 'percentage' && `${rule.percentage}% of ${rule.percentage_base}`}
                            {rule.computation === 'python' && 'Python Formula'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {canManage ? (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <button
                                  type="button"
                                  className="btn btn-outline btn-sm"
                                  onClick={() => { setEditingRule(rule); setShowRuleModal(true); }}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="btn-icon btn-icon-danger"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteRule(rule.id); }}
                                  title="Delete Rule"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>—</span>
                            )}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="page-header-row" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title font-display">Salary Structures</h1>
          <p className="page-subtitle">Configure compensation structure templates and their evaluation rules.</p>
        </div>
        <div className="page-actions-group">
          {!canManage && (
            <span className="status-pill status-pill-neutral">
              <Eye size={13} style={{ marginRight: 4 }} />
              Read-Only Access
            </span>
          )}
          {canManage && (
            <button
              type="button"
              className="btn-coral"
              onClick={() => { setEditingStructure(null); setShowStructureModal(true); setFormError(null); }}
            >
              <Plus size={16} />
              <span>New Structure</span>
            </button>
          )}
        </div>
      </div>

      {toast && (
        <div className="alert-box alert-box-success" style={{ marginBottom: '1.25rem' }}>
          <CheckCircle2 size={16} />
          <span>{toast}</span>
        </div>
      )}

      {(error || formError) && (
        <div className="alert-box alert-box-danger" style={{ marginBottom: '1.25rem' }}>
          <AlertCircle size={16} />
          <span>{error || formError}</span>
        </div>
      )}

      <StructureModal
        isOpen={showStructureModal}
        onClose={() => { setShowStructureModal(false); setEditingStructure(null); }}
        onSaved={(msg) => { setToast(msg); onRefresh(); }}
        editingStructure={editingStructure}
      />

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: '1.25rem' }}>
        <div className="search-pill-container" style={{ minWidth: 280 }}>
          <Search size={15} className="search-pill-icon" />
          <input
            type="text"
            placeholder="Search salary structures…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-pill-input"
          />
        </div>
      </div>

      {loading ? (
        <div className="page-loading-state">
          <RefreshCw size={22} className="spin" />
          <span>Loading salary structures…</span>
        </div>
      ) : (
        <div className="card table-card">
          <table className="daybook-table">
            <thead>
              <tr>
                <th style={{ width: '35%' }}>Structure Name</th>
                <th style={{ width: '20%' }}>Rules Count</th>
                <th style={{ width: '25%' }}>Notes</th>
                <th style={{ width: '10%' }}>Status</th>
                <th style={{ width: '10%', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 36 }}>
                    No salary structures found. Click <strong>+ New Structure</strong> to create one.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => openDetail(s.id)}>
                    <td style={{ fontWeight: 600, color: 'var(--ink)' }}>
                      {s.name}
                    </td>
                    <td>
                      <span style={{ background: 'var(--muted)', padding: '3px 10px', borderRadius: 'var(--r-pill)', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                        {(s.salary_rules || []).length} rules
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                      {s.notes || '—'}
                    </td>
                    <td>
                      <StatusPill status={s.is_active ? 'active' : 'inactive'} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => openDetail(s.id)}
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>
                        {canManage && (
                          <>
                            <button
                              type="button"
                              className="btn-icon"
                              onClick={() => { setEditingStructure(s); setShowStructureModal(true); }}
                              title="Edit"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              className="btn-icon btn-icon-danger"
                              onClick={(e) => { e.stopPropagation(); handleDeleteStructure(s.id, e); }}
                              title="Delete Structure"
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── Tab: Salary Rules ────────────────────────────────────────────────────────
const RulesTab = ({ structures, onRefresh, currentUser }) => {
  const canManage = canManageRules(currentUser);
  const [search, setSearch] = useState('');
  const [filterStructure, setFilterStructure] = useState('');
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [toast, setToast] = useState(null);
  const [formError, setFormError] = useState(null);

  const allRules = structures.flatMap((s) => (s.salary_rules || []).map((r) => ({ ...r, structure_name: s.name })));
  const filtered = allRules
    .filter((r) => !filterStructure || String(r.salary_structure_id) === filterStructure)
    .filter((r) => !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.code.toLowerCase().includes(search.toLowerCase()));

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) return;
    try {
      await deleteRule(ruleId);
      setToast('Salary rule deleted successfully.');
      if (onRefresh) onRefresh();
    } catch (e) {
      setFormError(e.message);
    }
  };

  return (
    <div>
      <div className="page-header-row" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title font-display">Salary Rules</h1>
          <p className="page-subtitle">Directory of calculation algorithms, allowances, deductions, and tax formulas.</p>
        </div>
        <div className="page-actions-group">
          {!canManage && (
            <span className="status-pill status-pill-neutral">
              <Eye size={13} style={{ marginRight: 4 }} />
              Read-Only Access
            </span>
          )}
          {canManage && (
            <button
              type="button"
              className="btn-coral"
              onClick={() => { setEditingRule(null); setShowRuleModal(true); }}
              disabled={structures.length === 0}
            >
              <Plus size={16} />
              <span>New Rule</span>
            </button>
          )}
        </div>
      </div>

      {toast && (
        <div className="alert-box alert-box-success" style={{ marginBottom: '1.25rem' }}>
          <CheckCircle2 size={16} />
          <span>{toast}</span>
        </div>
      )}

      {formError && (
        <div className="alert-box alert-box-danger" style={{ marginBottom: '1.25rem' }}>
          <AlertCircle size={16} />
          <span>{formError}</span>
        </div>
      )}

      <SalaryRuleModal
        isOpen={showRuleModal}
        onClose={() => { setShowRuleModal(false); setEditingRule(null); }}
        onSaved={(msg) => { setToast(msg); if (onRefresh) onRefresh(); }}
        editingRule={editingRule}
        structures={structures}
        defaultStructureId={filterStructure ? Number(filterStructure) : (structures[0]?.id || '')}
      />

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: '1.25rem' }}>
        <div className="search-pill-container" style={{ minWidth: 280 }}>
          <Search size={15} className="search-pill-icon" />
          <input
            type="text"
            placeholder="Search rules by name or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-pill-input"
          />
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            className="form-control"
            style={{ width: 'auto', padding: '0.45rem 1rem', fontSize: '0.84rem' }}
            value={filterStructure}
            onChange={(e) => setFilterStructure(e.target.value)}
          >
            <option value="">All Structures</option>
            {structures.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <div className="card table-card">
        <table className="daybook-table">
          <thead>
            <tr>
              <th style={{ width: '6%' }}>Seq</th>
              <th style={{ width: '26%' }}>Rule Name</th>
              <th style={{ width: '12%' }}>Code</th>
              <th style={{ width: '12%' }}>Category</th>
              <th style={{ width: '20%' }}>Structure</th>
              <th style={{ width: '14%' }}>Computation</th>
              <th style={{ width: '10%', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 36 }}>
                  No salary rules found. Click <strong>New Rule</strong> above.
                </td>
              </tr>
            ) : (
              filtered.map((rule) => (
                <tr key={rule.id}>
                  <td className="font-mono" style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    {rule.sequence}
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--ink)' }}>
                    {rule.name}
                  </td>
                  <td>
                    <span className="font-mono" style={{ color: 'var(--sky)', fontWeight: 500, fontSize: 12 }}>
                      {rule.code}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${getCategoryPillClass(rule.category)}`}>
                      {rule.category}
                    </span>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {rule.structure_name}
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                    {rule.computation === 'fixed' && `Fixed: ${fmt(rule.fixed_amount)}`}
                    {rule.computation === 'percentage' && `${rule.percentage}% of ${rule.percentage_base}`}
                    {rule.computation === 'python' && 'Python Formula'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {canManage ? (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => { setEditingRule(rule); setShowRuleModal(true); }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-icon btn-icon-danger"
                          onClick={(e) => { e.stopPropagation(); handleDeleteRule(rule.id); }}
                          title="Delete Rule"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Main Payroll Page Shell ──────────────────────────────────────────────────
const PayrollPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then((u) => setCurrentUser(u))
      .catch(() => setCurrentUser(null))
      .finally(() => setUserLoading(false));
  }, []);

  const getTabFromPath = () => {
    const p = location.pathname;
    if (p.includes('/payroll/payruns'))    return 'payruns';
    if (p.includes('/payroll/payslips'))   return 'payslips';
    if (p.includes('/payroll/structures')) return 'structures';
    if (p.includes('/payroll/rules'))      return 'rules';
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState(getTabFromPath());
  const [structures, setStructures] = useState([]);
  const [structuresLoading, setStructuresLoading] = useState(true);
  const [structuresError, setStructuresError] = useState(null);
  const [dashData, setDashData] = useState(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [dashError, setDashError] = useState(null);

  const isEmployee = currentUser?.role === UserRole.EMPLOYEE;
  const isHrManager = currentUser?.role === UserRole.HR_MANAGER;
  const canViewAdminTabs = canViewPayrollAdminTabs(currentUser);

  useEffect(() => {
    if (isEmployee) {
      setActiveTab('payslips');
      if (location.pathname !== '/payroll/payslips') {
        navigate('/payroll/payslips', { replace: true });
      }
    } else {
      setActiveTab(getTabFromPath());
    }
  }, [location.pathname, isEmployee, navigate]);

  const loadStructures = useCallback(async () => {
    if (!canViewAdminTabs) return;
    try {
      setStructuresLoading(true);
      const d = await getStructures();
      setStructures(Array.isArray(d) ? d : d.items || []);
    } catch (e) {
      setStructuresError(e.message);
    } finally {
      setStructuresLoading(false);
    }
  }, [canViewAdminTabs]);

  const loadDashboard = useCallback(async () => {
    if (!canViewAdminTabs) return;
    try {
      setDashLoading(true);
      const d = await getPayrollDashboard();
      setDashData(d);
    } catch {
      setDashError(null);
    } finally {
      setDashLoading(false);
    }
  }, [canViewAdminTabs]);

  useEffect(() => {
    if (canViewAdminTabs) {
      loadStructures();
      loadDashboard();
    }
  }, [canViewAdminTabs, loadStructures, loadDashboard]);

  const switchTab = (key) => {
    setActiveTab(key);
    const tab = TABS.find((t) => t.key === key);
    if (tab) navigate(tab.path);
  };

  if (userLoading) {
    return (
      <AppLayout activeModule="payroll">
        <div className="page-container">
          <div className="page-loading-state">
            <RefreshCw size={24} className="spin" />
            <span>Loading payroll access…</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  // HR Managers are not permitted to access Payroll module per permission.txt
  if (isHrManager) {
    return (
      <AppLayout activeModule="payroll">
        <div className="page-container" style={{ maxWidth: 620, margin: '60px auto', textAlign: 'center' }}>
          <div className="card" style={{ padding: '48px 32px' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(220, 38, 38, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'var(--danger)' }}>
              <ShieldAlert size={32} />
            </div>
            <h2 className="font-display" style={{ fontSize: '1.45rem', marginBottom: 12, color: 'var(--ink)' }}>
              Payroll Access Restricted
            </h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24, fontSize: '0.925rem' }}>
              Per company Role-Based Access Control (RBAC) security policy, <strong>HR Managers</strong> do not have access to the Payroll module, employee compensation calculations, or pay runs.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button type="button" className="btn btn-outline" onClick={() => navigate('/employees')}>
                Go to Employees
              </button>
              <button type="button" className="btn-coral" onClick={() => navigate('/')}>
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  const visibleTabs = isEmployee
    ? [{ key: 'payslips', label: 'My Payslips', icon: FileText, path: '/payroll/payslips' }]
    : TABS;

  return (
    <AppLayout activeModule="payroll">
      <div className="page-container">
        {/* Module Sub-Nav Tab Bar */}
        <div className="payroll-tabs-bar">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                className={`payroll-tab-btn ${isActive ? 'is-active' : ''}`}
                onClick={() => switchTab(tab.key)}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {activeTab === 'dashboard'  && canViewAdminTabs && <DashboardTab data={dashData} loading={dashLoading} error={dashError} />}
        {activeTab === 'payruns'    && canViewAdminTabs && <PayrunsTab structures={structures} currentUser={currentUser} onRefresh={() => { loadDashboard(); loadStructures(); }} />}
        {activeTab === 'payslips'   && <PayslipsTab currentUser={currentUser} />}
        {activeTab === 'structures' && canViewAdminTabs && <StructuresTab structures={structures} loading={structuresLoading} error={structuresError} currentUser={currentUser} onRefresh={loadStructures} />}
        {activeTab === 'rules'      && canViewAdminTabs && <RulesTab structures={structures} currentUser={currentUser} onRefresh={loadStructures} />}
      </div>
    </AppLayout>
  );
};

export default PayrollPage;
