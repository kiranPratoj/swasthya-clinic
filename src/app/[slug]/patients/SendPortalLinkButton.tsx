'use client';

import { useTransition } from 'react';
import { useState } from 'react';
import { createPatientPortalLink } from '@/app/actions';

type ResultState =
  | { kind: 'idle' }
  | { kind: 'sent'; url: string }
  | { kind: 'error'; message: string; url?: string };

export default function SendPortalLinkButton({ patientId }: { patientId: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ResultState>({ kind: 'idle' });

  return (
    <div style={{ display: 'grid', gap: '0.45rem' }}>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            try {
              const response = await createPatientPortalLink(patientId);
              if (!response.success) {
                setResult({
                  kind: 'error',
                  message: response.error ?? 'Could not send portal link.',
                  url: response.url,
                });
                return;
              }

              setResult({ kind: 'sent', url: response.url ?? '' });
            } catch (error: unknown) {
              setResult({
                kind: 'error',
                message:
                  error instanceof Error && error.message.trim()
                    ? error.message
                    : 'Could not send portal link.',
              });
            }
          })
        }
        style={{
          padding: '0.7rem 1rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          background: 'white',
          color: 'var(--color-primary)',
          fontWeight: 800,
          fontSize: '0.875rem',
          cursor: isPending ? 'default' : 'pointer',
        }}
      >
        {isPending ? 'Sending...' : 'Send portal link'}
      </button>

      {result.kind === 'sent' && (
        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-success)', fontWeight: 700 }}>
          Portal link sent via WhatsApp{' '}
          {result.url && (
            <a href={result.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>
              Preview ↗
            </a>
          )}
        </p>
      )}

      {result.kind === 'error' && (
        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-error)', fontWeight: 700 }}>
          {result.message}{' '}
          {result.url && (
            <a href={result.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>
              Preview ↗
            </a>
          )}
        </p>
      )}
    </div>
  );
}

