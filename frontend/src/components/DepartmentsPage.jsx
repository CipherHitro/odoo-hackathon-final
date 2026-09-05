import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Layers,
  X,
  User,
  Users,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import Navbar from './Navbar';
import { getCurrentUser } from '../api/auth';
import { getDepartments, getEmployees, createDepartment } from '../api/employees';

export const getDeptColor = (deptName) => {
  if (!deptName) return '#714B67';
  const lower = deptName.toLowerCase();
  if (lower.includes('finance') || lower.includes('account')) return 'var(--sky, #6F93E3)';
  if (lower.includes('hr') || lower.includes('human') || lower.includes('recruit')) return 'var(--coral, #F1502A)';
  if (lower.includes('eng') || lower.includes('tech') || lower.includes('dev') || lower.includes('software')) return 'var(--ink, #171B26)';
  if (lower.includes('sale') || lower.includes('market') || lower.includes('business')) return 'var(--warning, #E8A33D)';
  if (lower.includes('support') || lower.includes('operat') || lower.includes('customer')) return 'var(--success, #2FA36B)';
  return '#714B67';
};

const DepartmentsPage = () => {
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successToast, setSuccessToast] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    manager_id: ''
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [deptData, empData, userData] = await Promise.all([
        getDepartments(),
        getEmployees(),
        getCurrentUser().catch(() => null)
      ]);
      setDepartments(deptData || []);
      setEmployees(empData || []);
      if (userData) {
        setCurrentUser(userData);
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
      setError(err.message || 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Role permissions per permission.txt
  const userRole = (currentUser?.role || '').toLowerCase();
  const canManage = ['admin', 'hr_manager', 'hr_payroll_admin', 'hr_payroll_user'].includes(userRole);
  const isEmployee = userRole === 'employee';

  const employeeMap = Object.fromEntries(employees.map((e) => [e.id, e.name]));

  // Count employees per department
  const headcountMap = employees.reduce((acc, emp) => {
    if (emp.department_id) {
      acc[emp.department_id] = (acc[emp.department_id] || 0) + 1;
    }
    return acc;
  }, {});

  const filteredDepartments = departments.filter((d) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const managerName = employeeMap[d.manager_id] || '';
    return d.name.toLowerCase().includes(term) || managerName.toLowerCase().includes(term);
  });

  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleOpenModal = () => {
    if (!canManage) return;
    setFormData({ name: '', manager_id: '' });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormError(null);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!canManage) {
      setFormError('Employees have read-only access and cannot create departments.');
      return;
    }
    if (!formData.name.trim()) {
      setFormError('Department name is required');
      return;
    }
    setSubmitting(true);
    setFormError(null);

    try {
      await createDepartment({
        name: formData.name.trim(),
        manager_id: formData.manager_id ? parseInt(formData.manager_id, 10) : null
      });
      showToast('Department created successfully!');
      handleCloseModal();
      await loadData();
    } catch (err) {
      setFormError(err.message || 'Failed to create department');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-layout-shell">
      <Navbar activeModule="employees" />

      <main className="app-layout-main">
        <div className="employees-page">
          {/* Header */}
          <div className="employees-header">
            <h1 className="employees-title">Departments</h1>
            <p className="employees-subtitle">
              Manage organizational units, department managers, and headcount distribution
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="employees-toolbar">
            <div className="employees-toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {canManage && (
                <button
                  type="button"
                  className="btn-new-employee"
                  onClick={handleOpenModal}
                  id="btn-new-dept"
                >
                  <Plus size={16} />
                  <span>NEW DEPARTMENT</span>
                </button>
              )}

              {isEmployee && (
                <div style={{
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
                  <span>Read-only View (Employee)</span>
                </div>
              )}

              <div className="employee-search-box">
                <Search size={16} className="employee-search-icon" />
                <input
                  type="text"
                  placeholder="Search departments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="employee-search-input"
                  id="search-dept-input"
                />
              </div>
            </div>
          </div>

          {/* Toasts / Alerts */}
          {successToast && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              backgroundColor: 'var(--success-bg, rgba(47, 163, 107, 0.12))',
              border: '1px solid var(--success, #2FA36B)',
              borderRadius: 'var(--radius-md, 6px)',
              color: 'var(--success, #2FA36B)',
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
              backgroundColor: 'var(--danger-bg, rgba(225, 82, 82, 0.12))',
              border: '1px solid var(--danger, #E15252)',
              borderRadius: 'var(--radius-md, 6px)',
              color: 'var(--danger, #E15252)',
              fontSize: 'var(--text-sm)'
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Department Cards Grid (4 per row on desktop) */}
          {loading ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Loading departments...
            </div>
          ) : filteredDepartments.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '48px 24px',
              backgroundColor: 'var(--card)',
              borderRadius: 'var(--r-lg, 16px)',
              border: '1px dashed var(--border)',
              color: 'var(--text-secondary)'
            }}>
              <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>No departments found</p>
              <p style={{ margin: 0, fontSize: '13px' }}>Click "NEW DEPARTMENT" above to add one.</p>
            </div>
          ) : (
            <div className="kanban-grid">
              {filteredDepartments.map((dept) => {
                const color = getDeptColor(dept.name);
                const count = headcountMap[dept.id] || 0;
                const managerName = employeeMap[dept.manager_id] || 'Not assigned';

                return (
                  <div key={dept.id} className="employee-card" style={{ cursor: 'default' }}>
                    <div className="employee-card-top">
                      <div
                        className="employee-avatar-box"
                        style={{ backgroundColor: color }}
                      >
                        <Layers size={18} color="#FFFFFF" />
                      </div>
                      <div className="employee-card-info">
                        <h3 className="employee-card-name">{dept.name}</h3>
                        <p className="employee-card-position">
                          Manager: {managerName}
                        </p>
                      </div>
                    </div>

                    <div className="employee-card-bottom">
                      <span className="employee-card-dept" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <Users size={13} />
                        <span>{count} {count === 1 ? 'member' : 'members'}</span>
                      </span>

                      <div className="employee-status-indicator is-active">
                        <span className="status-bullet is-active" />
                        <span>Active</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Useful Note Footer */}
          <div className="useful-note-footer">
            <span>
              <strong>Useful note:</strong> Department icon chips use consistent Daybook color tokens (§6C) across all employee profiles and leaves.
            </span>
          </div>
        </div>
      </main>

      {/* New Department Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div
            className="modal-content-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <div className="modal-title-wrap">
                <div
                  className="employee-avatar-box"
                  style={{ width: '42px', height: '42px', backgroundColor: getDeptColor(formData.name) }}
                >
                  <Layers size={20} color="#FFFFFF" />
                </div>
                <div>
                  <h2 className="modal-title">New Department</h2>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    Add an organizational team to your company
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

            <form onSubmit={handleFormSubmit}>
              <div className="modal-body">
                {formError && (
                  <div style={{
                    padding: '10px 14px',
                    backgroundColor: 'var(--danger-bg, rgba(225, 82, 82, 0.12))',
                    border: '1px solid var(--danger, #E15252)',
                    borderRadius: 'var(--radius-sm, 4px)',
                    color: 'var(--danger, #E15252)',
                    fontSize: 'var(--text-xs)'
                  }}>
                    {formError}
                  </div>
                )}

                <div className="form-field-group">
                  <label className="form-label" htmlFor="dept-name">Department Name *</label>
                  <input
                    type="text"
                    id="dept-name"
                    required
                    placeholder="e.g. Finance, Engineering, Operations"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    className="form-input"
                  />
                </div>

                <div className="form-field-group">
                  <label className="form-label" htmlFor="dept-manager">Department Manager</label>
                  <select
                    id="dept-manager"
                    value={formData.manager_id}
                    onChange={(e) => setFormData((prev) => ({ ...prev, manager_id: e.target.value }))}
                    className="form-select"
                  >
                    <option value="">-- No Manager Assigned --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.job_position || 'Staff'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCloseModal}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentsPage;
