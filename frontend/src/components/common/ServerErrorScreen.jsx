import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, ServerOff } from 'lucide-react';

export default function ServerErrorScreen({ message, onRetry }) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      if (onRetry) await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8fafc',
      padding: '1.5rem',
      fontFamily: 'var(--font-ui, -apple-system, BlinkMacSystemFont, sans-serif)',
    }}>
      <div style={{
        maxWidth: '460px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '2.5rem 2rem',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
        border: '1px solid #e2e8f0',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '14px',
          backgroundColor: '#fef2f2',
          color: '#dc2626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.25rem',
          border: '1px solid #fee2e2',
        }}>
          <ServerOff size={28} />
        </div>

        <h2 style={{
          margin: '0 0 0.5rem',
          fontSize: '1.375rem',
          fontWeight: 700,
          color: '#0f172a',
          letterSpacing: '-0.02em',
        }}>
          Backend Server Not Running
        </h2>

        <p style={{
          margin: '0 0 1.5rem',
          fontSize: '0.875rem',
          lineHeight: '1.5',
          color: '#64748b',
        }}>
          Unable to establish a connection to the backend API server.
          Please ensure your FastAPI backend is running (<code style={{
            background: '#f1f5f9',
            padding: '2px 6px',
            borderRadius: '4px',
            color: '#334155',
            fontSize: '0.8125rem'
          }}>uv run fastapi dev</code> or <code style={{
            background: '#f1f5f9',
            padding: '2px 6px',
            borderRadius: '4px',
            color: '#334155',
            fontSize: '0.8125rem'
          }}>uvicorn</code>).
        </p>

        {message && (
          <div style={{
            width: '100%',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            backgroundColor: '#fff1f2',
            border: '1px solid #ffe4e6',
            color: '#be123c',
            fontSize: '0.8125rem',
            textAlign: 'left',
            marginBottom: '1.5rem',
            wordBreak: 'break-word',
          }}>
            <strong>Error details:</strong> {message}
          </div>
        )}

        <button
          type="button"
          onClick={handleRetry}
          disabled={retrying}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            padding: '10px 18px',
            borderRadius: '8px',
            backgroundColor: '#4f46e5',
            color: '#ffffff',
            border: 'none',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: retrying ? 'not-allowed' : 'pointer',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            transition: 'background-color 0.15s ease',
          }}
        >
          <RefreshCw size={16} className={retrying ? 'spin' : ''} />
          <span>{retrying ? 'Checking connection…' : 'Retry Connection'}</span>
        </button>
      </div>
    </div>
  );
}
