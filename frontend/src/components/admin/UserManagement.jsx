import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Plus, 
  Filter, 
  X, 
  Check, 
  AlertCircle,
  CheckCircle2,
  Lock,
  User as UserIcon,
  ShieldAlert
} from 'lucide-react';
import AppLayout from '../AppLayout';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { listUsers, registerUser, updateUser, getCurrentUser } from '../../api/auth';
import { getEmployees } from '../../api/employees';
import { UserRole, getDepartmentColor, canManageUsers } from '../../utils/rbac';

const ROLE_OPTIONS = [
  { id: UserRole.EMPLOYEE, label: 'Employee', desc: 'Can view own profile, submit leave, and track attendance' },
  { id: UserRole.HR_MANAGER, label: 'HR Manager', desc: 'Can manage employees, approve leaves, and oversee contracts' },
  { id: UserRole.HR_PAYROLL_USER, label: 'HR Payroll User', desc: 'Can calculate salary and generate payslips' },
  { id: UserRole.HR_PAYROLL_ADMIN, label: 'HR Payroll Admin', desc: 'Full control over payroll structures and bank payment batches' },
  { id: UserRole.ADMIN, label: 'Admin', desc: 'Full system configuration, security, and user management access' },
];

const UserManagement = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Form State for slide-in panel
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    email: '',
    password: '',
    role: UserRole.EMPLOYEE,
    status: 'active',
    is_active: true,
    employee_id: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [userData, employeesData, meData] = await Promise.all([
        listUsers(),
        getEmployees().catch(() => []),
        getCurrentUser().catch(() => null),
      ]);
      setUsers(userData || []);
      setEmployees(employeesData || []);
      setCurrentUser(meData);
    } catch (err) {
      console.error('Failed to load user management data', err);
      showNotice('error', err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showNotice = (type, text) => {
    setNotification({ type, text });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const handleOpenCreate = () => {
    setSearchParams({ action: 'new' });
  };

  const handleSelectRow = (user) => {
    setSearchParams({ edit: String(user.id) });
  };

  const handleClosePanel = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      setSearchParams({});
    }
  };

  useEffect(() => {
    const action = searchParams.get('action');
    const editId = searchParams.get('edit');

    if (action === 'new') {
      setSelectedUser(null);
      setFormData({
        id: null,
        name: '',
        email: '',
        password: 'Password123!',
        role: UserRole.EMPLOYEE,
        status: 'active',
        is_active: true,
        employee_id: '',
      });
      setIsPanelOpen(true);
    } else if (editId) {
      const found = users.find(u => String(u.id) === String(editId));
      if (found) {
        setSelectedUser(found);
        const linkedEmp = employees.find(e => e.user_id === found.id || e.work_email === found.email);
        const userStatus = found.status || linkedEmp?.status || (found.is_active ? 'active' : 'inactive');
        setFormData({
          id: found.id,
          name: found.name,
          email: found.email,
          password: '',
          role: found.role,
          status: userStatus,
          is_active: userStatus === 'active',
          employee_id: linkedEmp ? String(linkedEmp.id) : '',
        });
        setIsPanelOpen(true);
      }
    } else {
      setIsPanelOpen(false);
      setSelectedUser(null);
    }
  }, [searchParams, users, employees]);

  const handleEmployeeSelectChange = (e) => {
    const empId = e.target.value;
    const selectedEmp = employees.find(emp => String(emp.id) === empId);
    if (selectedEmp) {
      setFormData(prev => ({
        ...prev,
        employee_id: empId,
        name: selectedEmp.name,
        email: selectedEmp.work_email || prev.email,
      }));
    } else {
      setFormData(prev => ({ ...prev, employee_id: empId }));
    }
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (formData.id) {
        // Edit User
        const payload = {
          name: formData.name,
          email: formData.email,
          status: formData.status,
          is_active: formData.status === 'active',
        };
        // If not editing self, include role
        if (currentUser?.id !== formData.id) {
          payload.role = formData.role;
        }

        const updated = await updateUser(formData.id, payload);
        const mergedUser = { ...updated, status: formData.status, is_active: formData.status === 'active' };
        setUsers(prev => prev.map(u => u.id === updated.id ? mergedUser : u));
        setSelectedUser(mergedUser);
        showNotice('success', `User "${updated.name}" updated successfully.`);
        fetchData();
      } else {
        // Create User
        const payload = {
          name: formData.name,
          email: formData.email,
          password: formData.password || 'Password123!',
          role: formData.role,
          status: formData.status,
          is_active: formData.status === 'active',
        };
        const createdResponse = await registerUser(payload);
        const newUser = { ...createdResponse.user, status: formData.status, is_active: formData.status === 'active' };
        setUsers(prev => [...prev, newUser]);
        setSelectedUser(newUser);
        showNotice('success', `User "${newUser.name}" created successfully.`);
        fetchData();
      }
      handleClosePanel();
    } catch (err) {
      showNotice('error', err.message || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const isEditingSelf = currentUser?.id === formData.id;

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const isAuthorized = canManageUsers(currentUser);

  return (
    <AppLayout activeModule="admin">
      <div className="page-container">
        {/* Toast / Notification Banner */}
        {notification && (
          <div className={`alert-box alert-box-${notification.type === 'error' ? 'danger' : 'success'}`} style={{ marginBottom: '16px' }}>
            {notification.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            <span>{notification.text}</span>
          </div>
        )}

        {!loading && !isAuthorized ? (
          <div className="restricted-access-card">
            <ShieldAlert size={48} style={{ color: 'var(--coral)', margin: '0 auto 1rem auto' }} />
            <h2 className="font-display" style={{ fontSize: '1.25rem', color: 'var(--ink)', marginBottom: '0.5rem' }}>
              Access Restricted
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              User management, role assignments, and security administration are restricted to System Administrators.
            </p>
            <div style={{ display: 'inline-flex', padding: '0.35rem 0.85rem', background: 'var(--muted)', borderRadius: 'var(--r-pill)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Logged in as: {currentUser?.role ? currentUser.role.toUpperCase() : 'EMPLOYEE'}
            </div>
          </div>
        ) : (
          <>
            {/* Header Strip per 07-auth-admin.md */}
            <div className="page-header-row">
              <div className="page-header-left">
                <div className="page-title-cluster">
                  <h1 className="page-title font-display">User Management</h1>
                  <span className="admin-outline-pill">ADMIN ONLY</span>
                </div>
                <p className="page-subtitle">Configure system users, assign role-based access, and manage accounts.</p>
              </div>

          <div className="page-header-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenCreate}
            >
              <Plus size={15} style={{ marginRight: '6px' }} />
              New User
            </button>
          </div>
        </div>

        {/* Toolbar: Search & Role Filter */}
        <div className="toolbar-cluster">
          <div className="navbar-search-pill" style={{ width: '280px', background: 'var(--card)' }}>
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search user name or email..."
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="role-filter-group">
            <Filter size={14} style={{ color: 'var(--text-secondary)', marginRight: '6px' }} />
            <select
              className="filter-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">All Roles</option>
              <option value={UserRole.ADMIN}>Admin</option>
              <option value={UserRole.HR_MANAGER}>HR Manager</option>
              <option value={UserRole.HR_PAYROLL_ADMIN}>HR Payroll Admin</option>
              <option value={UserRole.HR_PAYROLL_USER}>HR Payroll User</option>
              <option value={UserRole.EMPLOYEE}>Employee</option>
            </select>
          </div>

          <div style={{ marginLeft: 'auto', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Showing <strong>{filteredUsers.length}</strong> {filteredUsers.length === 1 ? 'user' : 'users'}
          </div>
        </div>

        {/* Users Table */}
        <div className="card table-card" style={{ marginTop: '16px', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Loading users and access privileges...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No users found matching your search.
            </div>
          ) : (
            <table className="daybook-table">
              <thead>
                <tr>
                  <th style={{ width: '28%' }}>User</th>
                  <th style={{ width: '22%' }}>Employee Record</th>
                  <th style={{ width: '25%' }}>Work Email</th>
                  <th style={{ width: '15%' }}>Role</th>
                  <th style={{ width: '10%', textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const isSelected = selectedUser?.id === u.id && isPanelOpen;
                  const linkedEmp = employees.find(e => e.user_id === u.id || e.work_email === u.email);
                  const initials = u.name ? u.name.slice(0, 2).toUpperCase() : 'U';

                  return (
                    <tr 
                      key={u.id}
                      onClick={() => handleSelectRow(u)}
                      className={`cursor-pointer ${isSelected ? 'row-selected' : ''}`}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div 
                            className="avatar-circle-sm"
                            style={{ background: u.role === 'admin' ? 'var(--ink)' : 'var(--coral)' }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: '600', color: 'var(--ink)' }}>
                              {u.name}
                              {currentUser?.id === u.id && (
                                <span style={{ marginLeft: '6px', fontSize: '11px', color: 'var(--sky)', fontWeight: 'normal' }}>
                                  (You)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {linkedEmp ? (
                          <span style={{ color: 'var(--ink)', fontSize: '13px' }}>
                            {linkedEmp.name}
                            <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>
                              ({linkedEmp.job_position || 'Staff'})
                            </span>
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                            Unlinked
                          </span>
                        )}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '12.5px' }}>
                        {u.email}
                      </td>
                      <td>
                        <span className="role-pill">
                          {u.role ? u.role.replace('_', ' ').toUpperCase() : 'EMPLOYEE'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {u.status === 'archived' ? (
                          <span className="status-pill status-pill-warning" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
                            <span className="status-dot" style={{ background: '#f59e0b' }} />
                            Archived
                          </span>
                        ) : u.is_active && u.status !== 'inactive' ? (
                          <span className="status-pill status-pill-success">
                            <span className="status-dot" />
                            Active
                          </span>
                        ) : (
                          <span className="status-pill status-pill-neutral">
                            <span className="status-dot" />
                            Inactive
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </>
    )}
  </div>

      {/* Side Panel: Create / Edit User per 07-auth-admin.md */}
      {isPanelOpen && (
        <div className="drawer-overlay" onClick={handleClosePanel}>
          <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <h3 className="drawer-title font-display">
                  {formData.id ? 'Edit User Access' : 'Create New User'}
                </h3>
                <p className="drawer-subtitle">
                  {formData.id ? `Managing privileges for ${formData.name}` : 'Provision credentials and access scope'}
                </p>
              </div>
              <button 
                type="button" 
                className="btn-icon" 
                onClick={handleClosePanel}
                aria-label="Close panel"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="drawer-body">
              {/* Linked Employee */}
              <div className="form-group">
                <label className="form-label" htmlFor="employee_id">
                  Linked Employee <span style={{ color: 'var(--coral)' }}>*</span>
                </label>
                <select
                  id="employee_id"
                  className="form-control"
                  value={formData.employee_id}
                  onChange={handleEmployeeSelectChange}
                >
                  <option value="">-- Select or link employee record --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.work_email || emp.job_position || 'Employee'})
                    </option>
                  ))}
                </select>
                <span className="form-hint">Selecting an employee automatically pulls their name and work email.</span>
              </div>

              {/* Full Name */}
              <div className="form-group">
                <label className="form-label" htmlFor="name">
                  User Display Name <span style={{ color: 'var(--coral)' }}>*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  className="form-control"
                  placeholder="e.g. Sara Khan"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              {/* Work Email */}
              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  Work Email <span style={{ color: 'var(--coral)' }}>*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  className="form-control"
                  placeholder="name@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              {/* Password (only if creating new user) */}
              {!formData.id && (
                <div className="form-group">
                  <label className="form-label" htmlFor="password">
                    Temporary Password <span style={{ color: 'var(--coral)' }}>*</span>
                  </label>
                  <input
                    type="password"
                    id="password"
                    className="form-control"
                    placeholder="Min 8 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                  <span className="form-hint">Default is Password123!</span>
                </div>
              )}

              {/* Roles Section - Radio Buttons per 07-auth-admin.md */}
              <div className="form-group">
                <div className="form-label-row">
                  <label className="form-label">
                    Role & Permissions <span style={{ color: 'var(--coral)' }}>*</span>
                  </label>
                  {isEditingSelf && (
                    <span style={{ fontSize: '11px', color: 'var(--coral)', fontWeight: '500' }}>
                      Self-role modification locked
                    </span>
                  )}
                </div>

                {isEditingSelf && (
                  <p className="role-locked-note">
                    A user cannot modify their own administrative role. This prevents accidental lockout.
                  </p>
                )}

                <div className={`radio-group-container ${isEditingSelf ? 'is-disabled' : ''}`}>
                  {ROLE_OPTIONS.map((opt) => {
                    const isChecked = formData.role === opt.id;
                    return (
                      <label 
                        key={opt.id} 
                        className={`radio-row ${isChecked ? 'is-selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name="role"
                          value={opt.id}
                          checked={isChecked}
                          disabled={isEditingSelf}
                          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                          className="radio-input"
                        />
                        <div className="radio-text">
                          <span className={`radio-label ${isChecked ? 'font-bold text-ink' : 'text-secondary'}`}>
                            {opt.label}
                          </span>
                          <span className="radio-description">{opt.desc}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Account Status Selection: Active, Inactive, Archive */}
              <div className="form-group">
                <label className="form-label">Account Status</label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <button
                    type="button"
                    className={`btn ${formData.status === 'active' ? 'btn-success-soft' : 'btn-outline'}`}
                    onClick={() => setFormData({ ...formData, status: 'active', is_active: true })}
                  >
                    <Check size={14} style={{ marginRight: '6px' }} />
                    Active
                  </button>
                  <button
                    type="button"
                    className={`btn ${formData.status === 'inactive' ? 'btn-danger-soft' : 'btn-outline'}`}
                    onClick={() => setFormData({ ...formData, status: 'inactive', is_active: false })}
                    disabled={isEditingSelf}
                    title={isEditingSelf ? "You cannot deactivate your own account" : ""}
                  >
                    Inactive
                  </button>
                  <button
                    type="button"
                    className={`btn ${formData.status === 'archived' ? 'btn-warning-soft' : 'btn-outline'}`}
                    style={formData.status === 'archived' ? { background: '#fef3c7', color: '#92400e', borderColor: '#fde68a' } : {}}
                    onClick={() => setFormData({ ...formData, status: 'archived', is_active: false })}
                    disabled={isEditingSelf}
                    title={isEditingSelf ? "You cannot archive your own account" : ""}
                  >
                    Archive
                  </button>
                </div>
              </div>

              {/* Bottom Submit Action */}
              <div className="drawer-footer">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary w-full"
                >
                  {saving ? 'Saving...' : formData.id ? 'Save Access Privileges' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default UserManagement;
