// Role-Based Access Control (RBAC) Constants & Helpers for PeoplePay360
// Aligned strictly with permission.txt specification

export const UserRole = {
  ADMIN: 'admin',
  HR_MANAGER: 'hr_manager',
  HR_PAYROLL_ADMIN: 'hr_payroll_admin',
  HR_PAYROLL_USER: 'hr_payroll_user',
  EMPLOYEE: 'employee',
};

// Check if user has any of the allowed roles
export const hasRole = (user, allowedRoles = []) => {
  if (!user || !user.role) return false;
  return allowedRoles.includes(user.role);
};

// Admin only
export const isAdmin = (user) => {
  return user?.role === UserRole.ADMIN;
};

// HR roles (anyone with administrative HR / Payroll / Admin privileges)
export const isHrOrAdmin = (user) => {
  return [
    UserRole.ADMIN,
    UserRole.HR_MANAGER,
    UserRole.HR_PAYROLL_ADMIN,
    UserRole.HR_PAYROLL_USER,
  ].includes(user?.role);
};

// Check if user is a standard regular employee
export const isRegularEmployee = (user) => {
  return user?.role === UserRole.EMPLOYEE;
};

// Can manage / CRUD Employees (HR Manager, HR Payroll User, HR Payroll Admin, Admin)
// Per permission.txt: Regular employee can only view own profile and limited edit of own.
export const canManageEmployees = (user) => {
  return isHrOrAdmin(user);
};

// Can manage / CRUD Contracts (HR Manager, HR Payroll User, HR Payroll Admin, Admin)
// Per permission.txt: Regular employee has NO access (403/hidden)
export const canManageContracts = (user) => {
  return isHrOrAdmin(user);
};

export const canEditContracts = (user) => {
  return isHrOrAdmin(user);
};

// Can manage Working Schedules (HR Manager, HR Payroll User, HR Payroll Admin, Admin)
// Per permission.txt: Regular employee has NO access
export const canManageSchedules = (user) => {
  return isHrOrAdmin(user);
};

// Can view Departments: All authenticated users (Employee and HR Payroll User have READ-ONLY access)
export const canViewDepartments = (user) => {
  return Boolean(user && user.role);
};

// Can manage / CRUD Departments (HR Manager, HR Payroll Admin, Admin only)
// Employee and HR Payroll User have READ-ONLY access.
export const canManageDepartments = (user) => {
  return [
    UserRole.ADMIN,
    UserRole.HR_MANAGER,
    UserRole.HR_PAYROLL_ADMIN,
  ].includes(user?.role);
};

// Can manage Attendance logs / manual entries
// Per permission.txt: Employee can view own and check-in/out. HR/Admin can view all and make manual corrections.
export const canManageAttendance = (user) => {
  return isHrOrAdmin(user);
};

// Can approve / refuse time off requests
// Per permission.txt: Employee creates own. HR/Admin approves/refuses.
export const canApproveTimeOff = (user) => {
  return isHrOrAdmin(user);
};

// Can manage Allocations & Leave Types
// Per permission.txt: Employee only views own balance. HR/Admin manages allocations and leave types.
export const canManageTimeOff = (user) => {
  return isHrOrAdmin(user);
};

// Payroll / Payruns access
// Per permission.txt:
// - Employee: NO access
// - HR Manager: NO access
// - HR Payroll User: Manage
// - HR Payroll Admin: Full CRUD
// - Admin: Full CRUD
export const canManagePayroll = (user) => {
  return [
    UserRole.ADMIN,
    UserRole.HR_PAYROLL_ADMIN,
    UserRole.HR_PAYROLL_USER,
  ].includes(user?.role);
};

export const canAccessPayroll = (user) => {
  return canManagePayroll(user);
};

// Salary Structures & Salary Rules
// Per permission.txt:
// - Employee: NO access
// - HR Manager: NO access
// - HR Payroll User: Read-only (can View)
// - HR Payroll Admin: Full CRUD
// - Admin: Full CRUD
export const canViewSalaryStructures = (user) => {
  return [
    UserRole.ADMIN,
    UserRole.HR_PAYROLL_ADMIN,
    UserRole.HR_PAYROLL_USER,
  ].includes(user?.role);
};

export const canEditSalaryStructures = (user) => {
  return [
    UserRole.ADMIN,
    UserRole.HR_PAYROLL_ADMIN,
  ].includes(user?.role);
};

// User Management (Admin only)
export const canManageUsers = (user) => {
  return isAdmin(user);
};

// Department color mapping per 01-employees.md §1
export const getDepartmentColor = (deptName) => {
  if (!deptName) return 'var(--ink)';
  const normalized = deptName.toLowerCase();
  if (normalized.includes('finance')) return 'var(--sky)';
  if (normalized.includes('hr') || normalized.includes('human')) return 'var(--coral)';
  if (normalized.includes('engineering') || normalized.includes('tech') || normalized.includes('dev')) return 'var(--ink)';
  if (normalized.includes('sales') || normalized.includes('market')) return 'var(--warning)';
  if (normalized.includes('support') || normalized.includes('customer')) return 'var(--success)';
  if (normalized.includes('operations')) return 'var(--ink-soft)';
  return 'var(--sky)';
};
