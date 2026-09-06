import React, { useState } from 'react';
import { Mail, X, CheckCircle2, AlertCircle, RefreshCw, Send, ShieldCheck, Check } from 'lucide-react';
import { sendPayrunPayslips } from '../../api/payroll';

const DEFAULT_DEMO_EMAILS = [
  "rrohit2911@gmail.com",
  "rohitnirmacse@gmail.com",
  "chrishhemsworth065@gmail.com",
];

export default function SendPayslipsModal({ payrun, onClose, onSent }) {
  const [useDemoEmails, setUseDemoEmails] = useState(false);
  const [demoEmailsText, setDemoEmailsText] = useState(DEFAULT_DEMO_EMAILS.join(', '));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);

  const payslips = payrun?.payslips || [];

  const handleSend = async () => {
    setSending(true);
    setError(null);
    try {
      let customEmails = null;
      if (useDemoEmails) {
        customEmails = demoEmailsText
          .split(',')
          .map((e) => e.trim())
          .filter(Boolean);
      }

      const res = await sendPayrunPayslips(payrun.id, {
        useDemoEmails,
        customEmails,
      });

      setReport(res);
      if (onSent) onSent(res);
    } catch (err) {
      setError(err.message || 'Failed to dispatch payslip emails');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal-backdrop" style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem',
    }}>
      <div className="modal-content" style={{
        background: 'var(--card-bg, #ffffff)',
        color: 'var(--text-primary, #1e293b)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '640px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '1px solid var(--border-color, #e2e8f0)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-color, #e2e8f0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'rgba(99, 102, 241, 0.12)',
              color: '#6366f1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Mail size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>Send Payslip Emails</h3>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary, #64748b)' }}>
                Payrun: <strong>{payrun?.name}</strong> ({payslips.length} slips)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary, #64748b)',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && (
            <div className="alert-box alert-box-danger" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              fontSize: '0.875rem',
            }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {report ? (
            /* Results Summary */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{
                padding: '1rem',
                borderRadius: '10px',
                backgroundColor: report.failed === 0 ? '#f0fdf4' : '#fffbeb',
                border: `1px solid ${report.failed === 0 ? '#bbf7d0' : '#fef08a'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <CheckCircle2 size={20} color={report.failed === 0 ? '#16a34a' : '#d97706'} />
                  <strong style={{ fontSize: '1rem', color: report.failed === 0 ? '#166534' : '#92400e' }}>
                    Bulk Dispatch Completed
                  </strong>
                </div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '0.875rem' }}>
                  <span>Total: <strong>{report.total}</strong></span>
                  <span style={{ color: '#16a34a' }}>Sent: <strong>{report.sent}</strong></span>
                  {report.failed > 0 && <span style={{ color: '#dc2626' }}>Failed: <strong>{report.failed}</strong></span>}
                  {report.skipped > 0 && <span style={{ color: '#64748b' }}>Skipped: <strong>{report.skipped}</strong></span>}
                </div>
              </div>

              {/* Itemized status */}
              <div style={{
                maxHeight: '260px',
                overflowY: 'auto',
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: '8px',
              }}>
                <table style={{ width: '100%', fontSize: '0.8125rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-subtle, #f8fafc)', borderBottom: '1px solid var(--border-color, #e2e8f0)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px' }}>Employee</th>
                      <th style={{ padding: '8px 12px' }}>Recipient</th>
                      <th style={{ padding: '8px 12px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report.results || []).map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-color, #f1f5f9)' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 500 }}>{r.name}</td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-secondary, #64748b)' }}>{r.to || '—'}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: r.status === 'sent' ? '#dcfce7' : r.status === 'failed' ? '#fee2e2' : '#f1f5f9',
                            color: r.status === 'sent' ? '#15803d' : r.status === 'failed' ? '#b91c1c' : '#475569',
                          }}>
                            {r.status === 'sent' ? <Check size={12} /> : <AlertCircle size={12} />}
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Setup / Confirmation */
            <>
              <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: '1.5', color: 'var(--text-secondary, #475569)' }}>
                Each employee will receive an official notification email with their salary breakdown and an attached base64-encoded PDF payslip for the pay period.
              </p>

              {/* Demo Mode Toggle */}
              <div style={{
                padding: '1rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color, #e2e8f0)',
                backgroundColor: useDemoEmails ? 'rgba(99, 102, 241, 0.04)' : 'var(--bg-subtle, #f8fafc)',
              }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={useDemoEmails}
                    onChange={(e) => setUseDemoEmails(e.target.checked)}
                    style={{ marginTop: '3px', cursor: 'pointer', accentColor: '#6366f1' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>Use Demo / Test Inboxes</span>
                      <span style={{ fontSize: '0.75rem', backgroundColor: '#e0e7ff', color: '#4338ca', padding: '1px 6px', borderRadius: '4px' }}>
                        Verification Mode
                      </span>
                    </div>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary, #64748b)', display: 'block', marginTop: '2px' }}>
                      Redirect emails to test addresses so you can verify the PDF delivery in your personal inbox.
                    </span>
                  </div>
                </label>

                {useDemoEmails && (
                  <div style={{ marginTop: '12px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #64748b)', display: 'block', marginBottom: '4px' }}>
                      Target Inboxes (comma-separated):
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={demoEmailsText}
                      onChange={(e) => setDemoEmailsText(e.target.value)}
                      placeholder="email1@example.com, email2@example.com"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        fontSize: '0.8125rem',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color, #cbd5e1)',
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Recipient preview */}
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary, #64748b)', marginBottom: '8px' }}>
                  Recipient List ({payslips.length} employees):
                </div>
                <div style={{
                  maxHeight: '180px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: '8px',
                }}>
                  <table style={{ width: '100%', fontSize: '0.8125rem', borderCollapse: 'collapse' }}>
                    <tbody>
                      {payslips.map((p, idx) => {
                        const emp = p.employee;
                        const displayEmail = useDemoEmails
                          ? DEFAULT_DEMO_EMAILS[idx % DEFAULT_DEMO_EMAILS.length]
                          : (emp?.work_email || emp?.personal_email || 'No email registered');
                        return (
                          <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color, #f1f5f9)' }}>
                            <td style={{ padding: '6px 12px', fontWeight: 500 }}>{emp?.name || `Employee #${p.employee_id}`}</td>
                            <td style={{ padding: '6px 12px', color: 'var(--text-secondary, #64748b)' }}>{displayEmail}</td>
                            <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>
                              INR {Number(p.net_wage).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--border-color, #e2e8f0)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px',
        }}>
          {report ? (
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              style={{ padding: '8px 18px', borderRadius: '8px' }}
            >
              Done
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-outline"
                onClick={onClose}
                disabled={sending}
                style={{ padding: '8px 18px', borderRadius: '8px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-coral"
                onClick={handleSend}
                disabled={sending || payslips.length === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 20px',
                  borderRadius: '8px',
                  backgroundColor: '#6366f1',
                  color: '#ffffff',
                  border: 'none',
                  cursor: sending ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                }}
              >
                {sending ? (
                  <>
                    <RefreshCw size={15} className="spin" />
                    <span>Dispatching Emails & PDFs…</span>
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    <span>Send {payslips.length} Payslips</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
