// Role-Based Access Control (RBAC) Constants & Helpers for PeoplePay360

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

// Permission helpers
export const isAdmin = (user) => {
  return user?.role === UserRole.ADMIN;
};

export const canManageEmployees = (user) => {
  return [UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.HR_PAYROLL_ADMIN, UserRole.HR_PAYROLL_USER].includes(user?.role);
};

export const canManagePayroll = (user) => {
  return [UserRole.ADMIN, UserRole.HR_PAYROLL_ADMIN, UserRole.HR_PAYROLL_USER].includes(user?.role);
};

// Payroll Module Access per permission.txt:
// - Admin & HR Payroll Manager: Full CRUD on Payruns, Payslips, Structures, Rules
// - HR Payroll User: Manage Payruns (Create, Compute, Validate, Mark Paid, Edit; NO Delete), Manage Payslips, Read-only Structures & Rules
// - Employee: View own payslips only (no payruns, structures, rules)
// - HR Manager: NO access to Payroll
export const canAccessPayrollModule = (user) => {
  return [UserRole.ADMIN, UserRole.HR_PAYROLL_ADMIN, UserRole.HR_PAYROLL_USER, UserRole.EMPLOYEE].includes(user?.role);
};

export const canViewPayrollAdminTabs = (user) => {
  return [UserRole.ADMIN, UserRole.HR_PAYROLL_ADMIN, UserRole.HR_PAYROLL_USER].includes(user?.role);
};

export const canManagePayruns = (user) => {
  return [UserRole.ADMIN, UserRole.HR_PAYROLL_ADMIN, UserRole.HR_PAYROLL_USER].includes(user?.role);
};

export const canDeletePayrun = (user) => {
  return [UserRole.ADMIN, UserRole.HR_PAYROLL_ADMIN].includes(user?.role);
};

export const canManageStructures = (user) => {
  return [UserRole.ADMIN, UserRole.HR_PAYROLL_ADMIN].includes(user?.role);
};

export const canManageRules = (user) => {
  return [UserRole.ADMIN, UserRole.HR_PAYROLL_ADMIN].includes(user?.role);
};

export const canApproveTimeOff = (user) => {
  return [UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.HR_PAYROLL_ADMIN, UserRole.HR_PAYROLL_USER].includes(user?.role);
};

export const canManageAttendance = (user) => {
  return [UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.HR_PAYROLL_ADMIN, UserRole.HR_PAYROLL_USER].includes(user?.role);
};

export const canManageContracts = (user) => {
  return [UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.HR_PAYROLL_ADMIN, UserRole.HR_PAYROLL_USER].includes(user?.role);
};

export const canEditContracts = (user) => {
  return [UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.HR_PAYROLL_ADMIN, UserRole.HR_PAYROLL_USER].includes(user?.role);
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
