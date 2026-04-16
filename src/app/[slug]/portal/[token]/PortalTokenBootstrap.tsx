'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getPatientPortalBasePath } from '@/lib/patientPortalPath';

type Props = {
  slug: string;
  token: string;
  patientName: string;
};

export default function PortalTokenBootstrap({ slug, token, patientName }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const portalBasePath = getPatientPortalBasePath(pathname, slug);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const response = await fetch('/api/patient-auth/bootstrap-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, token }),
        });
        const payload = (await response.json()) as { error?: string; redirectTo?: string };
        if (!response.ok) {
          if (!cancelled) {
            setError(payload.error ?? 'Could not open portal link.');
          }
          return;
        }

        router.replace(portalBasePath);
        router.refresh();
      } catch {
        if (!cancelled) {
          setError('Could not open portal link.');
        }
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [pathname, portalBasePath, router, slug, token]);

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--color-bg)',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          background: 'white',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: '2rem',
          textAlign: 'center',
          display: 'grid',
          gap: '0.85rem',
        }}
      >
        <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>Opening portal</h1>
        <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
          Signing in for {patientName}.
        </p>
        {error ? (
          <p style={{ color: 'var(--color-error)', margin: 0, fontWeight: 700 }}>{error}</p>
        ) : (
          <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>Please wait…</p>
        )}
      </div>
    </main>
  );
}
