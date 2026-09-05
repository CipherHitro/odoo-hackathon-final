import React from 'react';
import { Navigate } from 'react-router-dom';
import { hasRole } from '../../utils/rbac';

/**
 * RoleGuard for conditional element rendering:
 * <RoleGuard user={user} allowedRoles={['admin', 'hr_manager']} fallback={null}>
 *   <button>+ New Employee</button>
 * </RoleGuard>
 */
export const RoleGuard = ({ user, allowedRoles, children, fallback = null }) => {
  if (!hasRole(user, allowedRoles)) {
    return fallback;
  }
  return <>{children}</>;
};

/**
 * ProtectedRoute for route-level access control:
 * <ProtectedRoute user={user} allowedRoles={['admin']}>
 *   <UserManagement />
 * </ProtectedRoute>
 */
export const ProtectedRoute = ({ user, allowedRoles, children, redirectTo = '/app/employees' }) => {
  if (!user) return null;
  if (!hasRole(user, allowedRoles)) {
    return <Navigate to={redirectTo} replace />;
  }
  return <>{children}</>;
};

export default RoleGuard;
