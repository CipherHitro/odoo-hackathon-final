import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Layers, 
  X, 
  Users, 
  AlertCircle, 
  CheckCircle2,
  Building 
} from 'lucide-react';
import AppLayout from '../AppLayout';
import { getDepartments, getEmployees, createDepartment, updateDepartment } from '../../api/employees';
import { getCurrentUser } from '../../api/auth';
import { canManageEmployees, getDepartmentColor } from '../../utils/rbac';

const TOKEN_PALETTE = [
  { id: 'var(--coral)', label: 'Coral (HR)', bg: '#D9381E' },
  { id: 'var(--sky)', label: 'Blue (Finance)', bg: '#2563EB' },
  { id: 'var(--ink)', label: 'Ink (Engineering)', bg: '#111827' },
  { id: 'var(--warning)', label: 'Warning (Sales)', bg: '#C96C00' },
  { id: 'var(--success)', label: 'Success (Support)', bg: '#0E8A42' },
];

const DepartmentList = () => {
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  const [formData, setFormData] = useState({
    id: null,
    name: '',
    manager_id: '',
    parent_department_id: '',
    color: 'var(--sky)',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [deptData, empData, meData] = await Promise.all([
        getDepartments(),
        getEmployees(),
        getCurrentUser().catch(() => null),
      ]);
      setDepartments(deptData || []);
      setEmployees(empData || []);
      setCurrentUser(meData);
    } catch (err) {
      console.error('Error fetching departments', err);
      showNotice('error', err.message || 'Failed to load departments');
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

  const handleOpenCreate = () => {
    setSelectedDept(null);
    setFormData({
      id: null,
      name: '',
      manager_id: '',
      parent_department_id: '',
      color: 'var(--sky)',
    });
    setIsDrawerOpen(true);
  };

  const handleSelectDept = (dept) => {
    setSelectedDept(dept);
    setFormData({
      id: dept.id,
      name: dept.name,
      manager_id: dept.manager_id ? String(dept.manager_id) : '',
      parent_department_id: dept.parent_department_id ? String(dept.parent_department_id) : '',
      color: getDepartmentColor(dept.name),
    });
    setIsDrawerOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        manager_id: formData.manager_id ? parseInt(formData.manager_id, 10) : null,
        parent_department_id: formData.parent_department_id ? parseInt(formData.parent_department_id, 10) : null,
      };

      if (formData.id) {
        const updated = await updateDepartment(formData.id, payload);
        setDepartments(prev => prev.map(d => d.id === updated.id ? updated : d));
        showNotice('success', `Department "${updated.name}" updated.`);
      } else {
        const created = await createDepartment(payload);
        setDepartments(prev => [...prev, created]);
        showNotice('success', `Department "${created.name}" created.`);
      }
      setIsDrawerOpen(false);
    } catch (err) {
      showNotice('error', err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const canEdit = canManageEmployees(currentUser);

  // Compute headcounts per department
  const headcountMap = {};
  employees.forEach(emp => {
    if (emp.department_id) {
      headcountMap[emp.department_id] = (headcountMap[emp.department_id] || 0) + 1;
    }
  });

  const empMap = Object.fromEntries(employees.map(e => [e.id, e.name]));

  const filteredDepts = departments.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
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

        <div className="page-header-row">
          <div className="page-header-left">
            <h1 className="page-title font-display">Departments</h1>
            <p className="page-subtitle">Organizational business units and reporting hierarchies.</p>
          </div>

          {canEdit && (
            <div className="page-header-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenCreate}
              >
                <Plus size={15} style={{ marginRight: '6px' }} />
                New Department
              </button>
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div className="toolbar-cluster">
          <div className="navbar-search-pill" style={{ width: '280px', background: 'var(--card)' }}>
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search departments..."
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ marginLeft: 'auto', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Total <strong>{filteredDepts.length}</strong> departments
          </div>
        </div>

        {/* Table / Grid */}
        <div className="card table-card" style={{ marginTop: '16px', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Loading organizational departments...
            </div>
          ) : filteredDepts.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No departments found.
            </div>
          ) : (
            <table className="daybook-table">
              <thead>
                <tr>
                  <th style={{ width: '35%' }}>Department Name</th>
                  <th style={{ width: '25%' }}>Department Lead / Manager</th>
                  <th style={{ width: '20%' }}>Headcount</th>
                  <th style={{ width: '20%', textAlign: 'right' }}>Color Swatch</th>
                </tr>
              </thead>
              <tbody>
                {filteredDepts.map((dept) => {
                  const color = getDepartmentColor(dept.name);
                  const count = headcountMap[dept.id] || 0;
                  const managerName = dept.manager_id ? empMap[dept.manager_id] : 'Unassigned';

                  return (
                    <tr 
                      key={dept.id}
                      onClick={() => canEdit && handleSelectDept(dept)}
                      className={canEdit ? "cursor-pointer" : ""}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span 
                            style={{ 
                              width: '12px', 
                              height: '12px', 
                              borderRadius: '3px', 
                              backgroundColor: color, 
                              display: 'inline-block' 
                            }} 
                          />
                          <span style={{ fontWeight: '600', color: 'var(--ink)' }}>
                            {dept.name}
                          </span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {managerName}
                      </td>
                      <td>
                        <span className="role-pill" style={{ background: 'var(--muted)', color: 'var(--ink)' }}>
                          <Users size={12} style={{ marginRight: '4px', display: 'inline' }} />
                          {count} {count === 1 ? 'employee' : 'employees'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span 
                          className="status-pill"
                          style={{ borderColor: color, color: color, background: 'transparent' }}
                        >
                          Token Swatch
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create / Edit Drawer */}
      {isDrawerOpen && (
        <div className="drawer-overlay" onClick={() => setIsDrawerOpen(false)}>
          <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <h3 className="drawer-title font-display">
                  {formData.id ? 'Edit Department' : 'New Department'}
                </h3>
                <p className="drawer-subtitle">Configure organization unit settings</p>
              </div>
              <button 
                type="button" 
                className="btn-icon" 
                onClick={() => setIsDrawerOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="drawer-body">
              <div className="form-group">
                <label className="form-label" htmlFor="dept-name">
                  Department Name <span style={{ color: 'var(--coral)' }}>*</span>
                </label>
                <input
                  type="text"
                  id="dept-name"
                  className="form-control"
                  placeholder="e.g. Engineering, Finance, HR"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="dept-manager">
                  Department Manager
                </label>
                <select
                  id="dept-manager"
                  className="form-control"
                  value={formData.manager_id}
                  onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                >
                  <option value="">-- No Manager Assigned --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.job_position || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="dept-parent">
                  Parent Department (Optional)
                </label>
                <select
                  id="dept-parent"
                  className="form-control"
                  value={formData.parent_department_id}
                  onChange={(e) => setFormData({ ...formData, parent_department_id: e.target.value })}
                >
                  <option value="">-- None (Top Level) --</option>
                  {departments
                    .filter(d => d.id !== formData.id)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Color swatch selection per 01-employees.md §4 */}
              <div className="form-group">
                <label className="form-label">System Token Color Palette</label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  {TOKEN_PALETTE.map((pal) => (
                    <button
                      key={pal.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: pal.id })}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        backgroundColor: pal.bg,
                        border: formData.color === pal.id ? '2px solid var(--ink)' : '2px solid transparent',
                        cursor: 'pointer',
                        transform: formData.color === pal.id ? 'scale(1.1)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                      title={pal.label}
                    />
                  ))}
                </div>
                <span className="form-hint">Color tokens map directly to avatar chips across all ERP views.</span>
              </div>

              <div className="drawer-footer">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary w-full"
                >
                  {submitting ? 'Saving...' : formData.id ? 'Save Department' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default DepartmentList;
