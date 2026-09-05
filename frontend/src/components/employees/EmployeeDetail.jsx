import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Edit3, 
  Calendar, 
  FileText, 
  Clock, 
  Mail, 
  Phone, 
  Building2, 
  MapPin, 
  User, 
  Briefcase,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { getDepartmentColor, canManageEmployees } from '../../utils/rbac';
import { updateEmployee, createEmployee, getEmployeeContracts } from '../../api/employees';

const EmployeeDetail = ({ 
  employee, 
  departments = [], 
  schedules = [], 
  currentUser,
  onBack, 
  onSaved 
}) => {
  const isNew = !employee?.id;
  const [isEditing, setIsEditing] = useState(isNew);
  const [activeTab, setActiveTab] = useState('work'); // 'work' | 'private'
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Related stats for smart buttons
  const [contractCount, setContractCount] = useState(0);
  const [timeOffCount, setTimeOffCount] = useState(3);
  const [attendanceCount, setAttendanceCount] = useState(14);

  const [formData, setFormData] = useState({
    name: employee?.name || '',
    work_email: employee?.work_email || '',
    job_position: employee?.job_position || '',
    department_id: employee?.department_id || (departments[0]?.id || ''),
    working_schedule_id: employee?.working_schedule_id || (schedules[0]?.id || ''),
    manager_id: employee?.manager_id || '',
    status: employee?.status || 'active',
    phone: employee?.phone || '',
    work_location: employee?.work_location || '',
    company: employee?.company || 'My Company',
    // Private Information
    personal_email: employee?.personal_email || '',
    identification_id: employee?.identification_id || '',
    gender: employee?.gender || 'not_specified',
    birthday: employee?.birthday || '',
    address: employee?.address || '',
  });

  useEffect(() => {
    if (employee?.id) {
      getEmployeeContracts(employee.id)
        .then(contracts => {
          if (Array.isArray(contracts)) {
            setContractCount(contracts.length);
          }
        })
        .catch(() => {});
    }
  }, [employee?.id]);

  const canEdit = canManageEmployees(currentUser);

  const getInitials = (name) => {
    if (!name) return 'EM';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const selectedDept = departments.find(d => String(d.id) === String(formData.department_id)) || {};
  const deptColor = getDepartmentColor(selectedDept.name || employee?.department_name);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        name: formData.name.trim(),
        work_email: formData.work_email.trim() || null,
        job_position: formData.job_position.trim() || null,
        department_id: formData.department_id ? parseInt(formData.department_id, 10) : null,
        working_schedule_id: formData.working_schedule_id ? parseInt(formData.working_schedule_id, 10) : null,
        status: formData.status,
        phone: formData.phone.trim() || null,
        work_location: formData.work_location.trim() || null,
        company: formData.company.trim() || 'My Company',
      };

      let result;
      if (employee?.id) {
        result = await updateEmployee(employee.id, payload);
        setSuccess('Employee record updated successfully.');
        setIsEditing(false);
      } else {
        result = await createEmployee(payload);
        setSuccess('New employee profile created successfully.');
        setIsEditing(false);
      }

      if (onSaved) {
        onSaved(result);
      }
    } catch (err) {
      setError(err.message || 'Failed to save employee profile');
    } finally {
      setSubmitting(false);
    }
  };

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

        {!isEditing && canEdit && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setIsEditing(true)}
          >
            <Edit3 size={14} style={{ marginRight: '6px' }} />
            Edit Profile
          </button>
        )}
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

      {/* Main Profile Card Surface */}
      <div className="card employee-detail-card">
        {/* Profile Header Block */}
        <div className="employee-detail-header">
          <div className="employee-profile-identity">
            {/* 56px initials chip on department color per 01-employees.md §3 */}
            <div 
              className="dept-initials-chip-lg" 
              style={{ backgroundColor: deptColor }}
            >
              {getInitials(formData.name || 'New Employee')}
            </div>

            <div className="employee-profile-meta">
              <h1 className="employee-detail-name font-display">
                {formData.name || (isNew ? 'New Employee Record' : 'Unnamed Employee')}
              </h1>
              <div className="employee-detail-subtitle">
                <span>{formData.job_position || 'Position Unassigned'}</span>
                <span className="dot-separator">•</span>
                <span style={{ color: deptColor, fontWeight: '500' }}>
                  {selectedDept.name || employee?.department_name || 'General'}
                </span>
              </div>
              <div className="employee-detail-contacts">
                {formData.work_email && (
                  <span className="contact-item">
                    <Mail size={13} />
                    {formData.work_email}
                  </span>
                )}
                {formData.phone && (
                  <span className="contact-item">
                    <Phone size={13} />
                    {formData.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Smart Buttons Row per Foundations §5 & 01-employees.md §3 */}
          {!isNew && (
            <div className="smart-buttons-row">
              <button 
                type="button" 
                className="smart-button"
                title="View allocated time off requests"
                onClick={() => {}}
              >
                <Calendar size={14} className="smart-btn-icon" />
                <span className="smart-btn-label">Time Off</span>
                <span className="smart-btn-badge">{timeOffCount}</span>
              </button>

              <button 
                type="button" 
                className="smart-button"
                title="View active employment contracts"
                onClick={() => {}}
              >
                <FileText size={14} className="smart-btn-icon" />
                <span className="smart-btn-label">Contracts</span>
                <span className="smart-btn-badge">{contractCount}</span>
              </button>

              <button 
                type="button" 
                className="smart-button"
                title="View verified attendance logs"
                onClick={() => {}}
              >
                <Clock size={14} className="smart-btn-icon" />
                <span className="smart-btn-label">Attendance</span>
                <span className="smart-btn-badge">{attendanceCount}</span>
              </button>
            </div>
          )}
        </div>

        {/* Form Tabs: Work Information vs Private Information */}
        <div className="detail-tabs-bar">
          <button
            type="button"
            className={`detail-tab-item ${activeTab === 'work' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('work')}
          >
            Work Information
          </button>
          <button
            type="button"
            className={`detail-tab-item ${activeTab === 'private' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('private')}
          >
            Private Information
          </button>
        </div>

        {/* Tab Content & Form */}
        <form onSubmit={handleSubmit} className="employee-detail-body">
          {activeTab === 'work' && (
            <div className="form-grid-2col">
              {/* Left Column */}
              <div className="form-column">
                <div className="form-group">
                  <label className="form-label" htmlFor="name">
                    Full Legal Name <span style={{ color: 'var(--coral)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    disabled={!isEditing}
                    className="form-control"
                    placeholder="e.g. Aarav Mehta"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

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
                    <option value="">Standard 40 Hours/Week</option>
                    {schedules.map((sch) => (
                      <option key={sch.id} value={sch.id}>
                        {sch.name} ({sch.hours_per_week || 40} hrs/week)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="company">
                    Company
                  </label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    disabled={!isEditing}
                    className="form-control"
                    placeholder="My Company (San Francisco)"
                    value={formData.company}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="form-column">
                <div className="form-group">
                  <label className="form-label" htmlFor="job_position">
                    Job Position
                  </label>
                  <input
                    type="text"
                    id="job_position"
                    name="job_position"
                    disabled={!isEditing}
                    className="form-control"
                    placeholder="e.g. Senior Software Engineer"
                    value={formData.job_position}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="work_email">
                    Work Email
                  </label>
                  <input
                    type="email"
                    id="work_email"
                    name="work_email"
                    disabled={!isEditing}
                    className="form-control"
                    placeholder="name@company.com"
                    value={formData.work_email}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="work_location">
                    Work Location
                  </label>
                  <input
                    type="text"
                    id="work_location"
                    name="work_location"
                    disabled={!isEditing}
                    className="form-control"
                    placeholder="e.g. Headquarters / Remote"
                    value={formData.work_location}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="status">
                    Employment Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    disabled={!isEditing}
                    className="form-control"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'private' && (
            <div className="form-grid-2col">
              <div className="form-column">
                <div className="form-group">
                  <label className="form-label" htmlFor="phone">
                    Personal Phone
                  </label>
                  <input
                    type="text"
                    id="phone"
                    name="phone"
                    disabled={!isEditing}
                    className="form-control"
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="personal_email">
                    Personal Email
                  </label>
                  <input
                    type="email"
                    id="personal_email"
                    name="personal_email"
                    disabled={!isEditing}
                    className="form-control"
                    placeholder="personal@gmail.com"
                    value={formData.personal_email}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-column">
                <div className="form-group">
                  <label className="form-label" htmlFor="address">
                    Residential Address
                  </label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    disabled={!isEditing}
                    className="form-control"
                    placeholder="123 Market St, Suite 400"
                    value={formData.address}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="gender">
                    Gender
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    disabled={!isEditing}
                    className="form-control"
                    value={formData.gender}
                    onChange={handleChange}
                  >
                    <option value="not_specified">Not Specified</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Action buttons when editing */}
          {isEditing && (
            <div className="detail-form-actions">
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary"
              >
                {submitting ? 'Saving...' : isNew ? 'Create Employee Profile' : 'Save Changes'}
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

export default EmployeeDetail;
