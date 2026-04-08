'use client';

import { useState } from 'react';
import Link from 'next/link';

type PatientRow = {
  id: string;
  name: string;
  phone: string;
  age: number | null;
  visitCount: number;
  lastVisit: string | null;
};

type PatientsClientProps = {
  patients: PatientRow[];
  slug: string;
};

function formatLastVisit(value: string | null): string {
  if (!value) return 'No visits';
  const date = new Date(value);
  const diffDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PatientsClient({ patients, slug }: PatientsClientProps) {
  const [search, setSearch] = useState('');

  const query = search.trim().toLowerCase();
  const filtered = query
    ? patients.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.phone.toLowerCase().includes(query)
      )
    : patients;

  return (
    <div style={{ display: 'grid', gap: '1.5rem', paddingBottom: '4rem' }}>
      <header style={{ display: 'grid', gap: '0.4rem' }}>
        <h1 style={{ fontSize: '1.9rem', fontWeight: 800 }}>Patients</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Filter by patient name or phone number.
        </p>
      </header>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search name or phone"
        style={{ maxWidth: '28rem' }}
      />

      {query && filtered.length === 0 && (
        <div
          style={{
            background: 'white',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--color-text-muted)',
          }}
        >
          No patients match your search.
        </div>
      )}

      {!query && patients.length === 0 && (
        <div
          style={{
            background: 'white',
            border: '1px dashed var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--color-text-muted)',
          }}
        >
          No patients registered yet.
        </div>
      )}

      {filtered.length > 0 && (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {filtered.map((patient) => (
            <Link
              key={patient.id}
              href={`/${slug}/patients/${patient.id}`}
              style={{
                display: 'block',
                background: 'white',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1rem 1.25rem',
                boxShadow: 'var(--shadow-sm)',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'grid', gap: '0.25rem' }}>
                  <span style={{ fontWeight: 800, fontSize: '1.05rem' }}>{patient.name}</span>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                    {patient.phone}
                    {patient.age !== null ? ` · Age ${patient.age}` : ''}
                  </span>
                </div>
                <div style={{ display: 'grid', gap: '0.15rem', textAlign: 'right' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    Last visit: {formatLastVisit(patient.lastVisit)}
                  </span>
                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: 'var(--color-primary)',
                      background: 'var(--color-primary-soft)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '999px',
                      alignSelf: 'flex-end',
                    }}
                  >
                    {patient.visitCount} {patient.visitCount === 1 ? 'visit' : 'visits'}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
