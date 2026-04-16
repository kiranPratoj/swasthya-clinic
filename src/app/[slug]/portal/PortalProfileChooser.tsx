'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { PatientPortalProfile } from '@/lib/types';
import { getPatientPortalBasePath } from '@/lib/patientPortalPath';

type Props = {
  slug: string;
  profiles: PatientPortalProfile[];
};

function formatDate(value: string | null): string {
  if (!value) return 'No previous visits yet';
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function PortalProfileChooser({ slug, profiles }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const portalBasePath = getPatientPortalBasePath(pathname, slug);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function selectProfile(patientId: string) {
    setPendingId(patientId);
    setError(null);

    try {
      const response = await fetch('/api/patient-auth/select-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId }),
      });
      const payload = (await response.json()) as { error?: string; redirectTo?: string };
      if (!response.ok) {
        setError(payload.error ?? 'Could not open this profile.');
        return;
      }

      router.replace(portalBasePath);
      router.refresh();
    } catch {
      setError('Could not open this profile.');
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <section
        style={{
          background: 'white',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: '1.1rem 1rem',
          display: 'grid',
          gap: '0.35rem',
        }}
      >
        <p
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--color-primary)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            margin: 0,
          }}
        >
          Choose Patient
        </p>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>
          This mobile number has multiple patient profiles
        </h1>
        <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.92rem' }}>
          Pick the profile you want to open.
        </p>
      </section>

      {profiles.map((profile) => (
        <button
          key={profile.id}
          type="button"
          onClick={() => selectProfile(profile.id)}
          disabled={pendingId !== null}
          style={{
            textAlign: 'left',
            background: 'white',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: '1rem',
            display: 'grid',
            gap: '0.35rem',
            cursor: pendingId ? 'wait' : 'pointer',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text)' }}>
              {profile.name}
            </span>
            {profile.age !== null && (
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                Age {profile.age}
              </span>
            )}
          </div>
          {profile.phone && (
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>
              {profile.phone}
            </p>
          )}
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
            Last visit: {formatDate(profile.lastVisit)}
          </p>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-primary)' }}>
            {pendingId === profile.id ? 'Opening…' : 'Open profile →'}
          </span>
        </button>
      ))}

      {error && (
        <p style={{ margin: 0, color: 'var(--color-error)', fontWeight: 700, fontSize: '0.88rem' }}>
          {error}
        </p>
      )}
    </div>
  );
}
