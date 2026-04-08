'use client';
import { useState } from 'react';
import { raisePatientIssue } from '@/app/actions';

interface Props {
  patientId: string;
  clinicId: string;
}

export default function RaiseForm({ patientId, clinicId }: Props) {
  const [complaint, setComplaint] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [tokenNumber, setTokenNumber] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (complaint.trim().length < 5) return;
    setStatus('loading');
    setErrorMsg('');
    try {
      const result = await raisePatientIssue(patientId, clinicId, complaint.trim());
      setTokenNumber(result.tokenNumber ?? null);
      setStatus('done');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.');
      setStatus('error');
    }
  }

  if (status === 'done') {
    return (
      <div style={{
        background: 'white',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        padding: '2rem',
        textAlign: 'center',
      }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--color-primary-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1rem',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Concern Raised
        </h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
          Your concern has been raised successfully.
        </p>
        {tokenNumber !== null && (
          <div style={{
            display: 'inline-block',
            background: 'var(--color-primary)',
            color: '#fff',
            borderRadius: 'var(--radius-lg)',
            padding: '0.5rem 1.25rem',
            fontWeight: 800,
            fontSize: '1rem',
          }}>
            Token #{tokenNumber}
          </div>
        )}
        <div style={{ marginTop: '1.5rem' }}>
          <button
            type="button"
            onClick={() => { setStatus('idle'); setComplaint(''); setTokenNumber(null); }}
            style={{
              background: 'none',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '0.625rem 1.25rem',
              fontWeight: 600,
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
            }}
          >
            Raise another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.875rem' }}>
          Describe your concern
        </label>
        <textarea
          value={complaint}
          onChange={e => setComplaint(e.target.value)}
          required
          minLength={5}
          rows={4}
          placeholder="E.g. I have had a fever for 3 days…"
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.9375rem',
            resize: 'vertical',
            boxSizing: 'border-box',
            fontFamily: 'inherit',
          }}
        />
      </div>

      {status === 'error' && (
        <p style={{ color: '#ef4444', fontSize: '0.875rem', fontWeight: 600 }}>{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === 'loading' || complaint.trim().length < 5}
        style={{
          padding: '0.875rem',
          background: 'var(--color-primary)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          fontWeight: 800,
          fontSize: '1rem',
          cursor: status === 'loading' || complaint.trim().length < 5 ? 'not-allowed' : 'pointer',
          opacity: status === 'loading' || complaint.trim().length < 5 ? 0.6 : 1,
        }}
      >
        {status === 'loading' ? 'Submitting…' : 'Submit Concern'}
      </button>
    </form>
  );
}
