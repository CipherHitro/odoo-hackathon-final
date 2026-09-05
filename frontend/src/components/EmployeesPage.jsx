import React, { useState, useEffect } from 'react';
import { 
  Search, 
  LayoutGrid, 
  List as ListIcon, 
  Plus, 
  X, 
  Mail, 
  Phone, 
  Briefcase, 
  Building, 
  MapPin, 
  FileText, 
  Clock, 
  Calendar,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import Navbar from './Navbar';
import { 
  getEmployees, 
  getDepartments, 
  createEmployee, 
  updateEmployee 
} from '../api/employees';

const EmployeesPage = () => {
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'list'
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  // Modal State for New / Edit Employee
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    work_email: '',
    job_position: '',
    department_id: '',
    status: 'active',
    phone: '',
    work_location: '',
    company: 'My Company'
  });

  // Load employees and departments from database
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [empData, deptData] = await Promise.all([
        getEmployees(),
        getDepartments()
      ]);
      setEmployees(empData || []);
      setDepartments(deptData || []);
    } catch (err) {
      console.error('Failed to load employee data:', err);
      setError(err.message || 'Error fetching employees from database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter employees based on search query
  const filteredEmployees = employees.filter((emp) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (emp.name && emp.name.toLowerCase().includes(term)) ||
      (emp.work_email && emp.work_email.toLowerCase().includes(term)) ||
      (emp.job_position && emp.job_position.toLowerCase().includes(term)) ||
      (emp.department_name && emp.department_name.toLowerCase().includes(term))
    );
  });

  // Helper to generate 2-letter initials
  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Open modal in CREATE mode
  const handleOpenCreateModal = () => {
    setSelectedEmployee(null);
    setFormData({
      name: '',
      work_email: '',
      job_position: '',
      department_id: departments.length > 0 ? departments[0].id : '',
      status: 'active',
      phone: '',
      work_location: '',
      company: 'My Company'
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open modal in EDIT / VIEW mode
  const handleOpenEditModal = (emp) => {
    setSelectedEmployee(emp);
    setFormData({
      name: emp.name || '',
      work_email: emp.work_email || '',
      job_position: emp.job_position || '',
      department_id: emp.department_id || (departments.length > 0 ? departments[0].id : ''),
      status: emp.status || 'active',
      phone: emp.phone || '',
      work_location: emp.work_location || '',
      company: emp.company || 'My Company'
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEmployee(null);
    setFormError(null);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        name: formData.name.trim(),
        work_email: formData.work_email.trim() || null,
        job_position: formData.job_position.trim() || null,
        department_id: formData.department_id ? parseInt(formData.department_id, 10) : null,
        status: formData.status,
        phone: formData.phone.trim() || null,
        work_location: formData.work_location.trim() || null,
        company: formData.company.trim() || 'My Company'
      };

      if (selectedEmployee) {
        // Update existing employee
        await updateEmployee(selectedEmployee.id, payload);
        showToast('Employee updated successfully!');
      } else {
        // Create new employee
        await createEmployee(payload);
        showToast('New employee created successfully!');
      }

      await loadData();
      handleCloseModal();
    } catch (err) {
      console.error('Error saving employee:', err);
      setFormError(err.message || 'Failed to save employee to database');
    } finally {
      setSubmitting(false);
    }
  };

  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  return (
    <div className="app-layout-shell">
      {/* Top Navbar matching wireframe with active module 'employees' */}
      <Navbar activeModule="employees" />

      <main className="app-layout-main">
        <div className="employees-page">
          {/* Header Section */}
          <div className="employees-header">
            <h1 className="employees-title">Employees</h1>
            <p className="employees-subtitle">
              {viewMode === 'kanban' 
                ? 'Default view: Kanban' 
                : 'List view for sort, filter and bulk scanning'}
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="employees-toolbar">
            <div className="employees-toolbar-left">
              {/* NEW Button */}
              <button 
                type="button" 
                className="btn-new-employee"
                onClick={handleOpenCreateModal}
                id="btn-new-employee"
              >
                NEW
              </button>

              {/* Search Bar */}
              <div className="employee-search-box">
                <Search size={16} className="employee-search-icon" />
                <input
                  type="text"
                  placeholder="Search employees.."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="employee-search-input"
                  id="search-employees-input"
                />
              </div>
            </div>

            {/* View Switcher Toggle: [Kanban] [List] */}
            <div className="view-switcher-group" role="group" aria-label="View Switcher">
              <button
                type="button"
                className={`btn-view-toggle ${viewMode === 'kanban' ? 'is-active' : ''}`}
                onClick={() => setViewMode('kanban')}
                id="view-toggle-kanban"
              >
                <LayoutGrid size={15} />
                <span>Kanban</span>
              </button>
              <button
                type="button"
                className={`btn-view-toggle ${viewMode === 'list' ? 'is-active' : ''}`}
                onClick={() => setViewMode('list')}
                id="view-toggle-list"
              >
                <ListIcon size={15} />
                <span>List</span>
              </button>
            </div>
          </div>

          {/* Toast / Error Alert */}
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

          {/* Content Views */}
          {loading ? (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '60px 0',
              color: 'var(--neutral-600)',
              fontSize: 'var(--text-base)'
            }}>
              Loading employees from database...
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '48px 24px',
              backgroundColor: 'var(--neutral-0)',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--neutral-300)',
              color: 'var(--neutral-600)'
            }}>
              <p style={{ margin: '0 0 8px 0', fontSize: 'var(--text-md)', fontWeight: 600 }}>
                No employees found
              </p>
              <p style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
                {searchTerm ? `No results matching "${searchTerm}"` : 'Get started by clicking the "NEW" button above to add an employee.'}
              </p>
            </div>
          ) : viewMode === 'kanban' ? (
            /* ==========================================================
               1. KANBAN VIEW (2-Column Grid matching Wireframe)
               ========================================================== */
            <div className="kanban-grid">
              {filteredEmployees.map((emp) => {
                const initials = getInitials(emp.name);
                const isActive = emp.status?.toLowerCase() === 'active';
                const isInactive = emp.status?.toLowerCase() === 'inactive';
                
                return (
                  <div 
                    key={emp.id} 
                    className="employee-card"
                    onClick={() => handleOpenEditModal(emp)}
                    title={`Click to open Employee Form for ${emp.name}`}
                  >
                    <div className="employee-card-top">
                      {/* Initials Avatar Box */}
                      <div className="employee-avatar-box">
                        {initials}
                      </div>
                      
                      {/* Name & Job Title */}
                      <div className="employee-card-info">
                        <h3 className="employee-card-name">{emp.name}</h3>
                        <p className="employee-card-position">
                          {emp.job_position || 'Staff Member'}
                        </p>
                      </div>
                    </div>

                    {/* Department & Status Bullet */}
                    <div className="employee-card-bottom">
                      <span className="employee-card-dept">
                        {emp.department_name || 'General'}
                      </span>
                      
                      <div className={`employee-status-indicator ${isActive ? 'is-active' : isInactive ? 'is-inactive' : 'is-archived'}`}>
                        <span className={`status-bullet ${isActive ? 'is-active' : isInactive ? 'is-inactive' : 'is-archived'}`}></span>
                        <span>{emp.status ? emp.status.charAt(0).toUpperCase() + emp.status.slice(1) : 'Active'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ==========================================================
               2. LIST VIEW (Table matching Wireframe)
               ========================================================== */
            <div className="employee-table-card">
              <table className="employee-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Work Email</th>
                    <th>Job Position</th>
                    <th>Department</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((emp) => {
                    const initials = getInitials(emp.name);
                    const isActive = emp.status?.toLowerCase() === 'active';
                    const isInactive = emp.status?.toLowerCase() === 'inactive';

                    return (
                      <tr 
                        key={emp.id} 
                        className="employee-table-row"
                        onClick={() => handleOpenEditModal(emp)}
                        title={`Click to open Employee Form for ${emp.name}`}
                      >
                        <td>
                          <div className="employee-cell-name">
                            <div className="employee-cell-avatar">
                              {initials}
                            </div>
                            <span>{emp.name}</span>
                          </div>
                        </td>
                        <td className="employee-cell-email">
                          {emp.work_email || '—'}
                        </td>
                        <td>
                          {emp.job_position || 'Staff Member'}
                        </td>
                        <td>
                          <span className="employee-cell-dept-badge">
                            {emp.department_name || 'General'}
                          </span>
                        </td>
                        <td>
                          <div className={`employee-status-indicator ${isActive ? 'is-active' : isInactive ? 'is-inactive' : 'is-archived'}`}>
                            <span className={`status-bullet ${isActive ? 'is-active' : isInactive ? 'is-inactive' : 'is-archived'}`}></span>
                            <span>{emp.status ? emp.status.charAt(0).toUpperCase() + emp.status.slice(1) : 'Active'}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Useful Note Footer (Exact match to wireframe text) */}
          <div className="useful-note-footer">
            {viewMode === 'kanban' ? (
              <span>
                <strong>Useful note:</strong> Kanban is good for browsing; clicking a card should open the same Employee Form used everywhere else.
              </span>
            ) : (
              <span>
                <strong>Useful note:</strong> The list view is the main entry point for opening a specific employee record quickly.
              </span>
            )}
          </div>
        </div>
      </main>

      {/* ==========================================================
          EMPLOYEE FORM MODAL / DRAWER
          ========================================================== */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div 
            className="modal-content-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="modal-header">
              <div className="modal-title-wrap">
                <div className="employee-avatar-box" style={{ width: '40px', height: '40px', fontSize: '14px' }}>
                  {formData.name ? getInitials(formData.name) : 'HR'}
                </div>
                <div>
                  <h2 className="modal-title">
                    {selectedEmployee ? selectedEmployee.name : 'New Employee'}
                  </h2>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--neutral-600)' }}>
                    {selectedEmployee ? 'Employee Record & Settings' : 'Create a new employee profile in database'}
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

            {/* Form */}
            <form onSubmit={handleFormSubmit}>
              <div className="modal-body">
                {/* Smart Buttons (if editing existing employee) */}
                {selectedEmployee && (
                  <div className="smart-buttons-row">
                    <div className="smart-button">
                      <FileText size={15} color="var(--color-primary)" />
                      <span>Contracts</span>
                      <span className="smart-button-count">
                        {selectedEmployee.contracts_count || 1}
                      </span>
                    </div>
                    <div className="smart-button">
                      <Clock size={15} color="var(--color-success)" />
                      <span>Attendance</span>
                      <span className="smart-button-count" style={{ backgroundColor: 'var(--color-success)' }}>
                        {selectedEmployee.attendance_count || 0}
                      </span>
                    </div>
                    <div className="smart-button">
                      <Calendar size={15} color="var(--color-warning)" />
                      <span>Time Off</span>
                      <span className="smart-button-count" style={{ backgroundColor: 'var(--color-warning)' }}>
                        {selectedEmployee.time_off_count || 0}
                      </span>
                    </div>
                  </div>
                )}

                {formError && (
                  <div style={{
                    padding: '10px 14px',
                    backgroundColor: 'var(--color-danger-bg)',
                    border: '1px solid var(--color-danger)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-danger)',
                    fontSize: 'var(--text-xs)'
                  }}>
                    {formError}
                  </div>
                )}

                {/* 2-Column Fields */}
                <div className="form-grid-2">
                  <div className="form-field-group">
                    <label className="form-label" htmlFor="emp-name">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="emp-name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleFormChange}
                      placeholder="e.g. Aarav Mehta"
                      className="form-input"
                    />
                  </div>

                  <div className="form-field-group">
                    <label className="form-label" htmlFor="emp-email">
                      Work Email *
                    </label>
                    <input
                      type="email"
                      id="emp-email"
                      name="work_email"
                      required
                      value={formData.work_email}
                      onChange={handleFormChange}
                      placeholder="e.g. aarav@exp.com"
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-field-group">
                    <label className="form-label" htmlFor="emp-position">
                      Job Position
                    </label>
                    <input
                      type="text"
                      id="emp-position"
                      name="job_position"
                      value={formData.job_position}
                      onChange={handleFormChange}
                      placeholder="e.g. Payroll Specialist"
                      className="form-input"
                    />
                  </div>

                  <div className="form-field-group">
                    <label className="form-label" htmlFor="emp-dept">
                      Department
                    </label>
                    <select
                      id="emp-dept"
                      name="department_id"
                      value={formData.department_id}
                      onChange={handleFormChange}
                      className="form-select"
                    >
                      <option value="">-- Select Department --</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-field-group">
                    <label className="form-label" htmlFor="emp-status">
                      Status
                    </label>
                    <select
                      id="emp-status"
                      name="status"
                      value={formData.status}
                      onChange={handleFormChange}
                      className="form-select"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>

                  <div className="form-field-group">
                    <label className="form-label" htmlFor="emp-phone">
                      Work Phone
                    </label>
                    <input
                      type="tel"
                      id="emp-phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleFormChange}
                      placeholder="+1 (555) 000-0000"
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-field-group">
                    <label className="form-label" htmlFor="emp-location">
                      Work Location
                    </label>
                    <input
                      type="text"
                      id="emp-location"
                      name="work_location"
                      value={formData.work_location}
                      onChange={handleFormChange}
                      placeholder="e.g. Headquarters - Floor 3"
                      className="form-input"
                    />
                  </div>

                  <div className="form-field-group">
                    <label className="form-label" htmlFor="emp-company">
                      Company
                    </label>
                    <input
                      type="text"
                      id="emp-company"
                      name="company"
                      value={formData.company}
                      onChange={handleFormChange}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
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
                  {submitting 
                    ? 'Saving to DB...' 
                    : selectedEmployee 
                      ? 'Update Employee' 
                      : 'Create Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeesPage;
