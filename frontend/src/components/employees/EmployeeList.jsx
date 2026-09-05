import React from 'react';
import { getDepartmentColor } from '../../utils/rbac';

const EmployeeList = ({ employees, departments = [], onSelectEmployee }) => {
  const deptMap = Object.fromEntries(departments.map(d => [d.id, d.name]));

  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="card table-card" style={{ overflow: 'hidden' }}>
      <table className="daybook-table">
        <thead>
          <tr>
            <th style={{ width: '30%' }}>Employee</th>
            <th style={{ width: '25%' }}>Work Email</th>
            <th style={{ width: '20%' }}>Job Position</th>
            <th style={{ width: '15%' }}>Department</th>
            <th style={{ width: '10%', textAlign: 'right' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp) => {
            const deptName = deptMap[emp.department_id] || emp.department_name || 'General';
            const deptColor = getDepartmentColor(deptName);
            const isActive = (emp.status || 'active').toLowerCase() === 'active';

            return (
              <tr 
                key={emp.id} 
                onClick={() => onSelectEmployee(emp)}
                className="cursor-pointer"
              >
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div 
                      className="dept-initials-chip-sm" 
                      style={{ backgroundColor: deptColor }}
                    >
                      {getInitials(emp.name)}
                    </div>
                    <span style={{ fontWeight: '600', color: 'var(--ink)' }}>
                      {emp.name}
                    </span>
                  </div>
                </td>
                <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '12.5px' }}>
                  {emp.work_email || '—'}
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>
                  {emp.job_position || 'Staff Member'}
                </td>
                <td>
                  <span style={{ color: deptColor, fontWeight: '500', fontSize: '13px' }}>
                    {deptName}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span className={`status-pill ${isActive ? 'status-pill-success' : 'status-pill-neutral'}`}>
                    <span className="status-dot" />
                    {isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default EmployeeList;
