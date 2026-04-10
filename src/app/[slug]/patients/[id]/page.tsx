import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPatientProfile } from '@/app/actions';
import PatientEditForm from '../PatientEditForm';

const PAGE_SIZE = 20;

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatVisitType(value: string): string {
  return value
    .split('-')
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

export default async function PatientProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug, id } = await params;
  const { page } = await searchParams;
  const pageNumber = Math.max(1, Number.parseInt(page ?? '1', 10) || 1);
  const profile = await getPatientProfile(id);

  if (!profile) {
    notFound();
  }

  const totalVisits = profile.appointments.length;
  const totalPages = Math.max(1, Math.ceil(totalVisits / PAGE_SIZE));
  const currentPage = Math.min(pageNumber, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const appointments = profile.appointments.slice(start, start + PAGE_SIZE);

  return (
    <div style={{ display: 'grid', gap: '1.5rem', paddingBottom: '4rem' }}>
      <Link
        href={`/${slug}/patients`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.6rem 1rem',
          borderRadius: 'var(--radius-md)',
          background: 'white',
          border: '1px solid var(--color-border)',
          color: 'var(--color-primary)',
          fontWeight: 700,
          fontSize: '0.875rem',
          textDecoration: 'none',
          boxShadow: 'var(--shadow-sm)',
          width: 'fit-content',
          transition: 'all 0.2s ease',
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to Patients
      </Link>

      <section style={{ display: 'grid', gap: '1rem', background: 'white', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'grid', gap: '0.35rem' }}>
            <h1 style={{ fontSize: '1.9rem', fontWeight: 800 }}>{profile.patient.name}</h1>
            <p style={{ color: 'var(--color-text-muted)' }}>{profile.patient.phone ?? 'No phone number'}</p>
            <p style={{ color: 'var(--color-text-muted)' }}>
              {profile.patient.age ? `Age ${profile.patient.age}` : 'Age not recorded'} · {totalVisits} total visit{totalVisits === 1 ? '' : 's'}
            </p>
          </div>
          <PatientEditForm
            patientId={profile.patient.id}
            initialName={profile.patient.name}
            initialPhone={profile.patient.phone ?? ''}
          />
        </div>
      </section>

      <section style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Appointment History</h2>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '1rem' }}>Date</th>
                <th style={{ padding: '1rem' }}>Token</th>
                <th style={{ padding: '1rem' }}>Visit type</th>
                <th style={{ padding: '1rem' }}>Complaint</th>
                <th style={{ padding: '1rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appointment) => (
                <tr key={appointment.id} style={{ borderBottom: '1px solid var(--color-bg)' }}>
                  <td style={{ padding: '1rem' }}>{formatDate(appointment.booked_for)}</td>
                  <td style={{ padding: '1rem' }}>{appointment.token_number}</td>
                  <td style={{ padding: '1rem' }}>{formatVisitType(appointment.visit_type)}</td>
                  <td style={{ padding: '1rem' }}>{appointment.complaint}</td>
                  <td style={{ padding: '1rem', textTransform: 'capitalize' }}>{appointment.status.replace('_', ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>
              Page {currentPage} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {currentPage > 1 ? (
                <Link href={`/${slug}/patients/${id}?page=${currentPage - 1}`}>Previous</Link>
              ) : (
                <span style={{ color: 'var(--color-text-muted)' }}>Previous</span>
              )}
              {currentPage < totalPages ? (
                <Link href={`/${slug}/patients/${id}?page=${currentPage + 1}`}>Next</Link>
              ) : (
                <span style={{ color: 'var(--color-text-muted)' }}>Next</span>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
