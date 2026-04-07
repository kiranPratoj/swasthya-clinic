'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{
        maxWidth: '480px', width: '100%', background: 'var(--color-error-bg)', border: '2px solid var(--color-error)',
        borderRadius: 'var(--radius-lg)', padding: '2.5rem', textAlign: 'center', boxShadow: 'var(--shadow-lg)'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-error)', marginBottom: '0.75rem' }}>Something went wrong</h2>
        <p style={{ color: '#7f1d1d', marginBottom: '2rem', fontSize: '0.9375rem', lineHeight: 1.5, wordBreak: 'break-word' }}>
          {error.message || "An unexpected error occurred while processing your request."}
        </p>
        <button
          onClick={() => reset()}
          style={{
            padding: '0.875rem 2rem', background: 'var(--color-error)', color: 'white',
            border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '1rem', cursor: 'pointer'
          }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
