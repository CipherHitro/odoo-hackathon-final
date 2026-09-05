import React from 'react';
import { getDepartmentColor } from '../../utils/rbac';

const ContractList = ({ contracts, onSelectContract }) => {
  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '—';
    const num = Number(amount);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const renderStatusPill = (status) => {
    const s = (status || 'draft').toLowerCase();
    if (s === 'running') {
      return (
        <span className="status-pill status-pill-success">
          <span className="status-dot" />
          Running
        </span>
      );
    }
    if (s === 'expired') {
      return (
        <span className="status-pill status-pill-danger">
          <span className="status-dot" />
          Expired
        </span>
      );
    }
    if (s === 'cancelled') {
      return (
        <span className="status-pill status-pill-neutral">
          <span className="status-dot" />
          Cancelled
        </span>
      );
    }
    return (
      <span className="status-pill status-pill-neutral" style={{ background: 'transparent', border: '1px solid var(--border)' }}>
        <span className="status-dot" />
        Draft
      </span>
    );
  };

  return (
    <div className="card table-card" style={{ overflow: 'hidden' }}>
      <table className="daybook-table">
        <thead>
          <tr>
            <th style={{ width: '18%' }}>Contract Ref</th>
            <th style={{ width: '28%' }}>Employee</th>
            <th style={{ width: '14%' }}>Start Date</th>
            <th style={{ width: '14%' }}>End Date</th>
            <th style={{ width: '14%', textAlign: 'right' }}>Wage / Month</th>
            <th style={{ width: '12%', textAlign: 'right' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {contracts.map((contract) => {
            const isRunning = (contract.status || '').toLowerCase() === 'running';
            const deptColor = getDepartmentColor(contract.department_name);

            return (
              <tr
                key={contract.id}
                onClick={() => onSelectContract(contract)}
                className={`cursor-pointer ${isRunning ? 'contract-running-row' : ''}`}
                title={isRunning ? "Active Running Contract (Used for Payroll Calculations)" : ""}
              >
                {/* Reference Code in JetBrains Mono per 02-contracts.md §Table columns */}
                <td>
                  <span className="ref-code-mono">
                    {contract.reference}
                  </span>
                </td>

                {/* Employee Name with Department Initials Chip */}
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      className="dept-initials-chip-sm"
                      style={{ backgroundColor: deptColor }}
                    >
                      {getInitials(contract.employee_name)}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', color: 'var(--ink)' }}>
                        {contract.employee_name || `Employee #${contract.employee_id}`}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {contract.job_position || contract.department_name || 'Staff Member'}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Start Date */}
                <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                  {formatDate(contract.start_date)}
                </td>

                {/* End Date (em-dash if ongoing) */}
                <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                  {contract.end_date ? formatDate(contract.end_date) : '—'}
                </td>

                {/* Wage per Month in JetBrains Mono, right-aligned per 02-contracts.md */}
                <td className="wage-mono">
                  {formatCurrency(contract.wage_monthly)}
                </td>

                {/* Status Pill */}
                <td style={{ textAlign: 'right' }}>
                  {renderStatusPill(contract.status)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ContractList;
