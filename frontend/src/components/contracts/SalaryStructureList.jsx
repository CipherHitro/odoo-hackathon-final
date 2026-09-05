import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  ArrowLeft, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  FileCode,
  Check,
  ShieldAlert
} from 'lucide-react';
import AppLayout from '../AppLayout';
import { getSalaryStructures, getSalaryStructureById } from '../../api/contracts';
import { getCurrentUser } from '../../api/auth';
import { canViewSalaryStructures, canEditSalaryStructures } from '../../utils/rbac';

const SalaryStructureList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [structures, setStructures] = useState([]);
  const [selectedStructure, setSelectedStructure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [data, me] = await Promise.all([
        getSalaryStructures(),
        getCurrentUser().catch(() => null),
      ]);
      setStructures(data || []);
      setCurrentUser(me);
    } catch (err) {
      console.error('Error fetching salary structures', err);
      setError(err.message || 'Failed to load salary structures');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectStructure = (structure) => {
    setSearchParams({ id: String(structure.id) });
  };

  const handleBackToList = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      setSearchParams({});
    }
  };

  useEffect(() => {
    const structId = searchParams.get('id');
    if (structId) {
      getSalaryStructureById(structId)
        .then((detailed) => setSelectedStructure(detailed))
        .catch(() => {
          const found = structures.find(s => String(s.id) === String(structId));
          setSelectedStructure(found || null);
        });
    } else {
      setSelectedStructure(null);
    }
  }, [searchParams, structures]);

  const filteredStructures = structures.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isAuthorized = canViewSalaryStructures(currentUser);
  const canEdit = canEditSalaryStructures(currentUser);

  return (
    <AppLayout activeModule="contracts">
      <div className="page-container">
        {error && (
          <div className="alert-box alert-box-danger" style={{ marginBottom: '16px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {!loading && !isAuthorized ? (
          <div className="restricted-access-card">
            <ShieldAlert size={48} style={{ color: 'var(--coral)', margin: '0 auto 1rem auto' }} />
            <h2 className="font-display" style={{ fontSize: '1.25rem', color: 'var(--ink)', marginBottom: '0.5rem' }}>
              Access Restricted
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Salary structures, compensation calculation rules, and payroll configurations are confidential and restricted to Payroll Users and Administrators.
            </p>
            <div style={{ display: 'inline-flex', padding: '0.35rem 0.85rem', background: 'var(--muted)', borderRadius: 'var(--r-pill)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Logged in as: {currentUser?.role ? currentUser.role.toUpperCase() : 'EMPLOYEE'}
            </div>
          </div>
        ) : selectedStructure ? (
          /* Salary Structure Form Screen per 05-payroll.md §Screen: Salary Structure — Form */
          <div className="structure-detail-view">
            <div className="detail-top-nav" style={{ marginBottom: '16px' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={handleBackToList}
              >
                <ArrowLeft size={14} style={{ marginRight: '6px' }} />
                Back to structures
              </button>
              <h2 className="font-display" style={{ fontSize: '18px', margin: 0 }}>
                Salary Structure / {selectedStructure.name}
              </h2>
            </div>

            <div className="card" style={{ padding: '24px' }}>
              <div className="form-grid-2col" style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <label className="form-label">Structure Name</label>
                  <div style={{ fontSize: '1.125rem', fontWeight: '700', color: 'var(--ink)' }}>
                    {selectedStructure.name}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <label className="form-label">Status</label>
                  <span className="status-pill status-pill-success">
                    <span className="status-dot" />
                    Active
                  </span>
                </div>
              </div>

              {/* Nested Salary Rules Table in sequence order per 05-payroll.md */}
              <div>
                <h3 className="font-display" style={{ fontSize: '16px', marginBottom: '12px', color: 'var(--ink)' }}>
                  Salary Calculation Rules
                </h3>
                <div className="card table-card" style={{ border: '1px solid var(--border)' }}>
                  <table className="daybook-table">
                    <thead>
                      <tr>
                        <th style={{ width: '10%' }}>Seq</th>
                        <th style={{ width: '35%' }}>Rule Name</th>
                        <th style={{ width: '20%' }}>Code</th>
                        <th style={{ width: '20%' }}>Category</th>
                        <th style={{ width: '15%', textAlign: 'right' }}>Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedStructure.rules && selectedStructure.rules.length > 0 ? (
                        selectedStructure.rules
                          .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
                          .map((rule) => {
                            const isDeduction = (rule.category || '').toLowerCase().includes('deduction');
                            return (
                              <tr key={rule.id}>
                                <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '12px' }}>
                                  {rule.sequence || '—'}
                                </td>
                                <td style={{ fontWeight: '600', color: 'var(--ink)' }}>
                                  {rule.name}
                                </td>
                                <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
                                  {rule.code}
                                </td>
                                <td>
                                  <span className={`status-pill ${isDeduction ? 'status-pill-danger' : 'status-pill-neutral'}`}>
                                    {rule.category || 'Basic'}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'right', color: 'var(--text-secondary)', fontSize: '12px' }}>
                                  {rule.condition_type || 'Percentage'}
                                </td>
                              </tr>
                            );
                          })
                      ) : (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                            Standard automated calculation rules applied from payroll engine.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Salary Structures List Screen per 05-payroll.md §Screen: Salary Structures — List */
          <>
            <div className="page-header-row">
              <div className="page-header-left">
                <h1 className="page-title font-display">Salary Structures</h1>
                <p className="page-subtitle">Salary computation frameworks, allowance rules, and statutory deduction schemas.</p>
              </div>
            </div>

            {/* Toolbar */}
            <div className="toolbar-cluster">
              <div className="navbar-search-pill" style={{ width: '280px', background: 'var(--card)' }}>
                <Search size={14} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search salary structures..."
                  className="search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div style={{ marginLeft: 'auto', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Showing <strong>{filteredStructures.length}</strong> structures
              </div>
            </div>

            {/* Structures Table */}
            <div className="card table-card" style={{ marginTop: '16px', overflow: 'hidden' }}>
              {loading ? (
                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Loading salary structures...
                </div>
              ) : filteredStructures.length === 0 ? (
                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No salary structures found.
                </div>
              ) : (
                <table className="daybook-table">
                  <thead>
                    <tr>
                      <th style={{ width: '45%' }}>Structure Name</th>
                      <th style={{ width: '25%' }}>Rules Defined</th>
                      <th style={{ width: '15%', textAlign: 'right' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStructures.map((struct) => {
                      const rulesCount = struct.rules ? struct.rules.length : 'Standard';
                      return (
                        <tr
                          key={struct.id}
                          onClick={() => handleSelectStructure(struct)}
                          className="cursor-pointer"
                        >
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Layers size={15} style={{ color: 'var(--sky)' }} />
                              <span style={{ fontWeight: '600', color: 'var(--ink)' }}>
                                {struct.name}
                              </span>
                            </div>
                          </td>
                          <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                            {typeof rulesCount === 'number' ? `${rulesCount} rules` : rulesCount}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <span className="status-pill status-pill-success">
                              <span className="status-dot" />
                              Active
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default SalaryStructureList;
