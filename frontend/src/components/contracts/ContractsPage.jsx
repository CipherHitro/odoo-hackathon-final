import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  X, 
  CheckCircle2, 
  AlertCircle,
  ShieldAlert,
  FileText
} from 'lucide-react';
import AppLayout from '../AppLayout';
import ContractList from './ContractList';
import ContractDetail from './ContractDetail';
import { getContracts, getContractById, getSalaryStructures } from '../../api/contracts';
import { getEmployees, getDepartments, getWorkingSchedules } from '../../api/employees';
import { getCurrentUser } from '../../api/auth';
import { canManageContracts, canEditContracts } from '../../utils/rbac';

const ContractsPage = () => {
  const [contracts, setContracts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [structures, setStructures] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // When selectedContract is non-null, display ContractDetail
  // When selectedContract === 'new', open in Create mode
  const [selectedContract, setSelectedContract] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [user, empData, deptData, schData, structData] = await Promise.all([
        getCurrentUser().catch(() => null),
        getEmployees().catch(() => []),
        getDepartments().catch(() => []),
        getWorkingSchedules().catch(() => []),
        getSalaryStructures().catch(() => []),
      ]);

      setCurrentUser(user);
      setEmployees(empData || []);
      setDepartments(deptData || []);
      setSchedules(schData || []);
      setStructures(structData || []);

      // If user has permission, fetch contracts
      if (canManageContracts(user)) {
        const contractRes = await getContracts({ limit: 100 });
        setContracts(contractRes.items || []);
      }
    } catch (err) {
      console.error('Error loading contracts data', err);
      setError(err.message || 'Failed to load contract records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectContract = (contract) => {
    if (contract === 'new') {
      setSearchParams({ action: 'new' });
    } else {
      setSearchParams({ id: String(contract.id) });
    }
  };

  const handleBackToContracts = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      setSearchParams({});
    }
  };

  useEffect(() => {
    const contractId = searchParams.get('id');
    const action = searchParams.get('action');

    if (action === 'new') {
      setSelectedContract('new');
    } else if (contractId) {
      const found = contracts.find(c => String(c.id) === String(contractId));
      if (found) {
        setSelectedContract(found);
      } else {
        getContractById(contractId)
          .then(c => setSelectedContract(c))
          .catch(() => setSelectedContract(null));
      }
    } else {
      setSelectedContract(null);
    }
  }, [searchParams, contracts]);

  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleContractSaved = async (saved) => {
    await loadData();
    showToast(`Contract ${saved.reference || ''} saved successfully.`);
    handleBackToContracts();
  };

  const handleContractDeleted = async (deletedId) => {
    setContracts(prev => prev.filter(c => c.id !== deletedId));
    showToast('Contract deleted successfully.');
    handleBackToContracts();
  };

  const isAuthorized = canManageContracts(currentUser);
  const canCreate = canEditContracts(currentUser);

  // Filter contracts
  const filteredContracts = contracts.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      !q || 
      (c.reference && c.reference.toLowerCase().includes(q)) ||
      (c.employee_name && c.employee_name.toLowerCase().includes(q)) ||
      (c.department_name && c.department_name.toLowerCase().includes(q)) ||
      (c.job_position && c.job_position.toLowerCase().includes(q));

    const matchesStatus = 
      statusFilter === 'ALL' || 
      (c.status && c.status.toUpperCase() === statusFilter);

    return matchesSearch && matchesStatus;
  });

  return (
    <AppLayout activeModule="contracts">
      <div className="page-container">
        {/* Toast Alerts */}
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

        {/* Unauthorized State Guard per RBAC specifications */}
        {!loading && !isAuthorized ? (
          <div className="restricted-access-card">
            <ShieldAlert size={48} style={{ color: 'var(--coral)', margin: '0 auto 1rem auto' }} />
            <h2 className="font-display" style={{ fontSize: '1.25rem', color: 'var(--ink)', marginBottom: '0.5rem' }}>
              Access Restricted
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Employment contract terms, compensation figures, and salary structure configurations are confidential and restricted to HR Managers and Payroll Administrators.
            </p>
            <div style={{ display: 'inline-flex', padding: '0.35rem 0.85rem', background: 'var(--muted)', borderRadius: 'var(--r-pill)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Logged in as: {currentUser?.role ? currentUser.role.toUpperCase() : 'EMPLOYEE'}
            </div>
          </div>
        ) : selectedContract !== null ? (
          /* Contract Detail / Form Screen */
          <ContractDetail
            contract={selectedContract === 'new' ? null : selectedContract}
            employees={employees}
            departments={departments}
            schedules={schedules}
            structures={structures}
            currentUser={currentUser}
            onBack={handleBackToContracts}
            onSaved={handleContractSaved}
            onDeleted={handleContractDeleted}
          />
        ) : (
          /* Contracts List Screen per 02-contracts.md §Screen: Contracts — List */
          <>
            <div className="page-header-row">
              <div className="page-header-left">
                <h1 className="page-title font-display">Contracts</h1>
                <p className="page-subtitle">
                  Employee agreements, wage schedules, and active terms recognized by the payroll calculation engine.
                </p>
              </div>

              {canCreate && (
                <div className="page-header-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleSelectContract('new')}
                    id="btn-new-contract"
                  >
                    <Plus size={15} style={{ marginRight: '6px' }} />
                    New Contract
                  </button>
                </div>
              )}
            </div>

            {/* Toolbar: Search pill & status filter */}
            <div className="toolbar-cluster">
              <div className="navbar-search-pill" style={{ width: '280px', background: 'var(--card)' }}>
                <Search size={14} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search contract ref, employee..."
                  className="search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  id="search-contracts-input"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

            {/* Status Filter Selector */}
              <div className="role-filter-group">
                <Filter size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <select
                  className="filter-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="RUNNING">Running (Active)</option>
                  <option value="DRAFT">Draft</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div style={{ marginLeft: 'auto', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Showing <strong>{filteredContracts.length}</strong> {filteredContracts.length === 1 ? 'contract' : 'contracts'}
              </div>
            </div>

            {/* Contracts Table */}
            {loading ? (
              <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Loading verified contracts...
              </div>
            ) : filteredContracts.length === 0 ? (
              <div className="card" style={{ padding: '48px', textAlign: 'center', marginTop: '16px' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  No contracts found matching your filters.
                </p>
                {canCreate && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleSelectContract('new')}
                  >
                    <Plus size={14} style={{ marginRight: '6px' }} />
                    Draft First Contract
                  </button>
                )}
              </div>
            ) : (
              <div style={{ marginTop: '16px' }}>
                <ContractList
                  contracts={filteredContracts}
                  onSelectContract={(contract) => handleSelectContract(contract)}
                />
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default ContractsPage;
