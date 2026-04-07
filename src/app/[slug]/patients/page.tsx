import Link from 'next/link';
import { searchPatients } from '@/app/actions';

function formatDate(value: string | null): string {
  if (!value) return 'Never';
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default async function PatientsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { slug } = await params;
  const { q } = await searchParams;
  const query = q?.trim() ?? '';
  const results = query ? await searchPatients(query) : [];

  return (
    <div style={{ display: 'grid', gap: '1.5rem', paddingBottom: '4rem' }}>
      <header style={{ display: 'grid', gap: '0.4rem' }}>
        <h1 style={{ fontSize: '1.9rem', fontWeight: 800 }}>Patients</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Search by patient name or 10-digit phone number.
        </p>
      </header>

      <form method="GET" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search name or phone"
          style={{ flex: '1 1 20rem' }}
        />
        <button type="submit">Search</button>
      </form>

      {query && results.length === 0 && (
        <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '2rem' }}>
          No patients matched <strong>{query}</strong>.
        </div>
      )}

      {!query && (
        <div style={{ background: 'white', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '2rem' }}>
          Enter a search term to view patient records.
        </div>
      )}

      {results.length > 0 && (
        <div style={{ overflowX: 'auto', background: 'white', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '1rem' }}>Name</th>
                <th style={{ padding: '1rem' }}>Phone</th>
                <th style={{ padding: '1rem' }}>Total visits</th>
                <th style={{ padding: '1rem' }}>Last visit</th>
                <th style={{ padding: '1rem' }}>Profile</th>
              </tr>
            </thead>
            <tbody>
              {results.map((patient) => (
                <tr key={patient.id} style={{ borderBottom: '1px solid var(--color-bg)' }}>
                  <td style={{ padding: '1rem' }}>{patient.name}</td>
                  <td style={{ padding: '1rem' }}>{patient.phone}</td>
                  <td style={{ padding: '1rem' }}>{patient.visitCount}</td>
                  <td style={{ padding: '1rem' }}>{formatDate(patient.lastVisit)}</td>
                  <td style={{ padding: '1rem' }}>
                    <Link href={`/${slug}/patients/${patient.id}`}>View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
