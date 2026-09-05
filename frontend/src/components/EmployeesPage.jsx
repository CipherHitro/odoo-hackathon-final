import React, { useState, useEffect } from 'react';
import { 
  Search, 
  LayoutGrid, 
  List as ListIcon, 
  Plus, 
  X, 
  AlertCircle, 
  CheckCircle2 
} from 'lucide-react';
import AppLayout from './AppLayout';
import EmployeeCard from './employees/EmployeeCard';
import EmployeeList from './employees/EmployeeList';
import EmployeeDetail from './employees/EmployeeDetail';
import { getEmployees, getDepartments, getWorkingSchedules } from '../api/employees';
import { getCurrentUser } from '../api/auth';
import { canManageEmployees } from '../utils/rbac';

const EmployeesPage = () => {
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'list'
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  // When selectedEmployee is non-null, show the EmployeeDetail screen
  // If selectedEmployee === 'new', open in Create mode
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [empData, deptData, schData, me] = await Promise.all([
        getEmployees(),
        getDepartments(),
        getWorkingSchedules().catch(() => []),
        getCurrentUser().catch(() => null),
      ]);
      setEmployees(empData || []);
      setDepartments(deptData || []);
      setSchedules(schData || []);
      setCurrentUser(me);
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

  const deptMap = Object.fromEntries(departments.map(d => [d.id, d.name]));
  const getDeptName = (deptId, fallback) => deptMap[deptId] || fallback || 'General';

  const filteredEmployees = employees.filter((emp) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const deptName = getDeptName(emp.department_id, emp.department_name);
    return (
      (emp.name && emp.name.toLowerCase().includes(term)) ||
      (emp.work_email && emp.work_email.toLowerCase().includes(term)) ||
      (emp.job_position && emp.job_position.toLowerCase().includes(term)) ||
      (deptName && deptName.toLowerCase().includes(term))
    );
  });

  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleSavedEmployee = async () => {
    await loadData();
    showToast('Employee profile synchronized successfully.');
  };

  const canCreate = canManageEmployees(currentUser);

  return (
    <AppLayout activeModule="employees">
      <div className="page-container">
        {/* Toast alerts */}
        {successToast && (
          <div className="alert-box alert-box-success" style={{ marginBottom: '16px' }}>
            <CheckCircle2 size={16} />
            <span>{successToast}</span>
          </div>
        )}

        {error && (
          <div className="alert-box alert-box-danger" style={{ marginBottom: '16px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* If an employee is selected, render the dedicated Daybook Employee Form screen */}
        {selectedEmployee !== null ? (
          <EmployeeDetail
            employee={selectedEmployee === 'new' ? null : selectedEmployee}
            departments={departments}
            schedules={schedules}
            currentUser={currentUser}
            onBack={() => setSelectedEmployee(null)}
            onSaved={handleSavedEmployee}
          />
        ) : (
          <>
            {/* Header Section per 01-employees.md §2 */}
            <div className="page-header-row">
              <div className="page-header-left">
                <h1 className="page-title font-display">Employees</h1>
                <p className="page-subtitle">
                  {viewMode === 'kanban' 
                    ? 'Default view: Kanban directory' 
                    : 'List view for sorting, filtering, and bulk scanning'}
                </p>
              </div>

              {/* RBAC Guarded '+ New Employee' button */}
              {canCreate && (
                <div className="page-header-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setSelectedEmployee('new')}
                    id="btn-new-employee"
                  >
                    <Plus size={15} style={{ marginRight: '6px' }} />
                    + New Employee
                  </button>
                </div>
              )}
            </div>

            {/* Action Toolbar per Foundations §5 */}
            <div className="toolbar-cluster">
              {/* Search Pill */}
              <div className="navbar-search-pill" style={{ width: '280px', background: 'var(--card)' }}>
                <Search size={14} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search employees by name, title, department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                  id="search-employees-input"
                />
                {searchTerm && (
                  <button 
                    type="button" 
                    onClick={() => setSearchTerm('')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Kanban / List Switcher Pill per 01-employees.md §2 */}
              <div className="view-toggle-pill" role="group" aria-label="View Switcher">
                <button
                  type="button"
                  className={`view-toggle-option ${viewMode === 'kanban' ? 'is-active' : ''}`}
                  onClick={() => setViewMode('kanban')}
                  id="view-toggle-kanban"
                >
                  <LayoutGrid size={14} style={{ marginRight: '4px' }} />
                  <span>Kanban</span>
                </button>
                <button
                  type="button"
                  className={`view-toggle-option ${viewMode === 'list' ? 'is-active' : ''}`}
                  onClick={() => setViewMode('list')}
                  id="view-toggle-list"
                >
                  <ListIcon size={14} style={{ marginRight: '4px' }} />
                  <span>List</span>
                </button>
              </div>

              <div style={{ marginLeft: 'auto', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Showing <strong>{filteredEmployees.length}</strong> active profiles
              </div>
            </div>

            {/* Main Content Area */}
            {loading ? (
              <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Loading verified employee records...
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="card" style={{ padding: '48px', textAlign: 'center', marginTop: '16px' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  No employees found matching "{searchTerm}".
                </p>
                {canCreate && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setSelectedEmployee('new')}
                  >
                    <Plus size={14} style={{ marginRight: '6px' }} />
                    Add First Employee
                  </button>
                )}
              </div>
            ) : viewMode === 'kanban' ? (
              /* 2-Column Responsive Card Grid on desktop per 01-employees.md §2 */
              <div className="employee-kanban-grid" style={{ marginTop: '16px' }}>
                {filteredEmployees.map((emp) => (
                  <EmployeeCard
                    key={emp.id}
                    employee={emp}
                    departmentName={getDeptName(emp.department_id, emp.department_name)}
                    onClick={(emp) => setSelectedEmployee(emp)}
                  />
                ))}
              </div>
            ) : (
              /* Dense Table View per 01-employees.md §2 */
              <div style={{ marginTop: '16px' }}>
                <EmployeeList
                  employees={filteredEmployees}
                  departments={departments}
                  onSelectEmployee={(emp) => setSelectedEmployee(emp)}
                />
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default EmployeesPage;
