import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  DollarSign, 
  Calendar, 
  Building2,
  Briefcase,
  Clock,
  Trash2
} from 'lucide-react';
import { canEditContracts } from '../../utils/rbac';
import { createContract, updateContract, deleteContract } from '../../api/contracts';

const CONTRACT_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'running', label: 'Running' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
];

const ContractDetail = ({ 
  contract, 
  employees = [], 
  departments = [], 
  schedules = [], 
  structures = [], 
  currentUser, 
  onBack, 
  onSaved,
  onDeleted 
}) => {
  const isNew = !contract?.id;
  const [isEditing, setIsEditing] = useState(isNew);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [formData, setFormData] = useState({
    employee_id: contract?.employee_id ? String(contract.employee_id) : (employees[0]?.id ? String(employees[0].id) : ''),
    department_id: contract?.department_id ? String(contract.department_id) : '',
    job_position: contract?.job_position || '',
    start_date: contract?.start_date || new Date().toISOString().split('T')[0],
    end_date: contract?.end_date || '',
    wage_monthly: contract?.wage_monthly !== undefined ? String(contract.wage_monthly) : '50000',
    working_schedule_id: contract?.working_schedule_id ? String(contract.working_schedule_id) : (schedules[0]?.id ? String(schedules[0].id) : ''),
    salary_structure_id: contract?.salary_structure_id ? String(contract.salary_structure_id) : (structures[0]?.id ? String(structures[0].id) : ''),
    status: contract?.status ? contract.status.toLowerCase() : 'draft',
    notes: contract?.notes || '',
  });

  const canEdit = canEditContracts(currentUser);

  // Auto-fill Department and Job Position when employee is changed
  const handleEmployeeChange = (e) => {
    const empId = e.target.value;
    const selectedEmp = employees.find(emp => String(emp.id) === empId);
    if (selectedEmp) {
      setFormData(prev => ({
        ...prev,
        employee_id: empId,
        department_id: selectedEmp.department_id ? String(selectedEmp.department_id) : prev.department_id,
        job_position: selectedEmp.job_position || prev.job_position,
      }));
    } else {
      setFormData(prev => ({ ...prev, employee_id: empId }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.employee_id) {
      setError('Please select an employee.');
      return;
    }
    if (!formData.start_date) {
      setError('Please specify a start date.');
      return;
    }
    if (formData.end_date && formData.end_date < formData.start_date) {
      setError('End date cannot be earlier than start date.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        employee_id: parseInt(formData.employee_id, 10),
        start_date: formData.start_date,
        end_date: formData.end_date ? formData.end_date : null,
        wage_monthly: parseFloat(formData.wage_monthly) || 0,
        department_id: formData.department_id ? parseInt(formData.department_id, 10) : null,
        job_position: formData.job_position ? formData.job_position.trim() : null,
        working_schedule_id: formData.working_schedule_id ? parseInt(formData.working_schedule_id, 10) : null,
        salary_structure_id: formData.salary_structure_id ? parseInt(formData.salary_structure_id, 10) : null,
        status: formData.status ? formData.status.toLowerCase() : 'draft',
        notes: formData.notes.trim() || null,
      };

      let result;
      if (contract?.id) {
        result = await updateContract(contract.id, payload);
        setSuccess('Contract updated successfully.');
        setIsEditing(false);
      } else {
        result = await createContract(payload);
        setSuccess(`Contract created with reference ${result.reference}`);
        setIsEditing(false);
      }

      if (onSaved) {
        onSaved(result);
      }
    } catch (err) {
      setError(err.message || 'Failed to save contract');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!contract?.id) return;
    if (!window.confirm(`Are you sure you want to delete contract "${contract.reference}"?`)) return;

    setSubmitting(true);
    try {
      await deleteContract(contract.id);
      if (onDeleted) {
        onDeleted(contract.id);
      }
    } catch (err) {
      setError(err.message || 'Failed to delete contract');
      setSubmitting(false);
    }
  };

  // Lookups for display
  const currentStructure = structures.find(s => String(s.id) === String(formData.salary_structure_id));
  const currentEmployee = employees.find(e => String(e.id) === String(formData.employee_id));
  const currentDept = departments.find(d => String(d.id) === String(formData.department_id));

  return (
    <div className="employee-detail-wrapper">
      {/* Top Header Actions */}
      <div className="detail-top-nav">
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={onBack}
        >
          <ArrowLeft size={14} style={{ marginRight: '6px' }} />
          Back to list
        </button>

        <div style={{ display: 'flex', gap: '8px' }}>
          {!isEditing && canEdit && (
            <>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit3 size={14} style={{ marginRight: '6px' }} />
                Edit Contract
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm text-danger"
                onClick={handleDelete}
                disabled={submitting}
                title="Delete Contract"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="alert-box alert-box-danger" style={{ marginBottom: '16px' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert-box alert-box-success" style={{ marginBottom: '16px' }}>
          <CheckCircle2 size={16} />
          <span>{success}</span>
        </div>
      )}

      {/* Main Form Surface */}
      <div className="card employee-detail-card" style={{ padding: '24px' }}>
        {/* Header: Contract / {reference} in Clash Display 600 per 02-contracts.md */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', fontWeight: '600' }}>
              EMPLOYMENT CONTRACT
            </span>
            <h1 className="font-display" style={{ fontSize: '22px', fontWeight: '600', color: 'var(--ink)', margin: '2px 0 0 0' }}>
              {contract?.reference ? `Contract / ${contract.reference}` : 'New Contract'}
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className={`status-pill ${formData.status === 'running' ? 'status-pill-success' : formData.status === 'expired' ? 'status-pill-danger' : 'status-pill-neutral'}`}>
              <span className="status-dot" />
              {formData.status.toUpperCase()}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Two-Column Field Grid per 02-contracts.md §Screen: Contract — Form */}
          <div className="form-grid-2col">
            {/* Left Column: Employee, Start Date, End Date, Status */}
            <div className="form-column">
              <div className="form-group">
                <label className="form-label" htmlFor="employee_id">
                  Employee <span style={{ color: 'var(--coral)' }}>*</span>
                </label>
                <select
                  id="employee_id"
                  name="employee_id"
                  disabled={!isEditing}
                  className="form-control"
                  value={formData.employee_id}
                  onChange={handleEmployeeChange}
                  required
                >
                  <option value="">-- Select Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.job_position || 'Staff Member'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="start_date">
                  Contract Start Date <span style={{ color: 'var(--coral)' }}>*</span>
                </label>
                <input
                  type="date"
                  id="start_date"
                  name="start_date"
                  disabled={!isEditing}
                  className="form-control"
                  value={formData.start_date}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="end_date">
                  Contract End Date (Optional)
                </label>
                <input
                  type="date"
                  id="end_date"
                  name="end_date"
                  disabled={!isEditing}
                  className="form-control"
                  value={formData.end_date}
                  onChange={handleChange}
                  placeholder="Ongoing if empty"
                />
                <span className="form-hint">Leave empty for open-ended / ongoing employment.</span>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="status">
                  Contract Status <span style={{ color: 'var(--coral)' }}>*</span>
                </label>
                <select
                  id="status"
                  name="status"
                  disabled={!isEditing}
                  className="form-control"
                  value={formData.status}
                  onChange={handleChange}
                  required
                >
                  {CONTRACT_STATUSES.map(st => (
                    <option key={st.value} value={st.value}>
                      {st.label}
                    </option>
                  ))}
                </select>
                <span className="form-hint">Only "Running" contracts are processed by the payroll engine.</span>
              </div>
            </div>

            {/* Right Column: Department, Job Position, Wage/Month, Working Schedule */}
            <div className="form-column">
              <div className="form-group">
                <label className="form-label" htmlFor="department_id">
                  Department
                </label>
                <select
                  id="department_id"
                  name="department_id"
                  disabled={!isEditing}
                  className="form-control"
                  value={formData.department_id}
                  onChange={handleChange}
                >
                  <option value="">-- Select Department --</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="job_position">
                  Job Position / Designation
                </label>
                <input
                  type="text"
                  id="job_position"
                  name="job_position"
                  disabled={!isEditing}
                  className="form-control"
                  placeholder="e.g. Lead Developer"
                  value={formData.job_position}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="wage_monthly">
                  Wage / Month (INR) <span style={{ color: 'var(--coral)' }}>*</span>
                </label>
                <input
                  type="number"
                  step="500"
                  id="wage_monthly"
                  name="wage_monthly"
                  disabled={!isEditing}
                  className="form-control wage-mono"
                  style={{ textAlign: 'left', fontWeight: '600' }}
                  placeholder="e.g. 85000"
                  value={formData.wage_monthly}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="working_schedule_id">
                  Working Schedule
                </label>
                <select
                  id="working_schedule_id"
                  name="working_schedule_id"
                  disabled={!isEditing}
                  className="form-control"
                  value={formData.working_schedule_id}
                  onChange={handleChange}
                >
                  <option value="">-- Standard Schedule --</option>
                  {schedules.map((sch) => (
                    <option key={sch.id} value={sch.id}>
                      {sch.name} ({sch.hours_per_week || 40}h/wk)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Salary Structure / Notes Panel below the grid per 02-contracts.md */}
          <div style={{ marginTop: '24px' }}>
            <div className="salary-structure-box">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="salary-structure-title">
                  Structure Type: {currentStructure?.name || contract?.salary_structure_name || 'Standard Full-Time Employee Structure'}
                </span>
                {isEditing && (
                  <select
                    name="salary_structure_id"
                    value={formData.salary_structure_id}
                    onChange={handleChange}
                    className="form-control"
                    style={{ width: 'auto', background: 'var(--card)', padding: '0.4rem 0.75rem', fontSize: '0.8125rem' }}
                  >
                    {structures.map(st => (
                      <option key={st.id} value={st.id}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <p className="salary-structure-note">
                Applies standard automated salary rule computations: Basic 50%, HRA 20%, Standard Allowance, PF Deductions (12%), and Professional Tax. Rule formulation is managed in Payroll → Salary Structures.
              </p>
            </div>

            {/* Notes / Terms Field */}
            <div className="form-group" style={{ marginTop: '16px' }}>
              <label className="form-label" htmlFor="notes">
                Contract Terms & Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                disabled={!isEditing}
                className="form-control"
                placeholder="Additional employment terms, probation clauses, or equipment stipulations..."
                value={formData.notes}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Form Actions */}
          {isEditing && (
            <div className="detail-form-actions">
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary"
              >
                {submitting ? 'Saving...' : isNew ? 'Create Contract' : 'Save Changes'}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  if (isNew) {
                    onBack();
                  } else {
                    setIsEditing(false);
                  }
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default ContractDetail;
