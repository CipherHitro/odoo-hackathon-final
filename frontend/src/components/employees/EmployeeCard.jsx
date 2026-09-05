import React from 'react';
import { getDepartmentColor } from '../../utils/rbac';

const EmployeeCard = ({ employee, departmentName, onClick }) => {
  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const deptColor = getDepartmentColor(departmentName || employee.department_name);
  const isActive = (employee.status || 'active').toLowerCase() === 'active';

  return (
    <div 
      className="card employee-kanban-card" 
      onClick={() => onClick(employee)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(employee)}
    >
      <div className="employee-card-top">
        {/* 40px initials chip on department color per 01-employees.md §1 */}
        <div 
          className="dept-initials-chip" 
          style={{ backgroundColor: deptColor }}
          title={`Department: ${departmentName || employee.department_name || 'General'}`}
        >
          {getInitials(employee.name)}
        </div>

        <div className="employee-card-info">
          <h3 className="employee-card-name font-display">{employee.name}</h3>
          <p className="employee-card-title">{employee.job_position || 'Staff Member'}</p>
        </div>
      </div>

      <div className="employee-card-bottom">
        <span className="employee-card-dept">{departmentName || employee.department_name || 'General Department'}</span>
        
        {/* Soft status pill with 6px solid dot per foundations §6B */}
        <div className={`status-pill ${isActive ? 'status-pill-success' : 'status-pill-neutral'}`}>
          <span className="status-dot" />
          <span>{isActive ? 'Active' : 'Inactive'}</span>
        </div>
      </div>
    </div>
  );
};

export default EmployeeCard;
