import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getPatientProfile } from '@/app/actions';
import type { Appointment, VisitHistory } from '@/lib/types';
import PatientEditForm from '../PatientEditForm';
import { verifyRole } from '@/lib/auth';

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

function extractDiagnosis(summary: string): string {
  const match = summary.match(/^Diagnosis:\s*(.+)/m);
  return match?.[1]?.trim() ?? '';
}

function extractPrescription(summary: string): string[] {
  const lines = summary.split('\n');
  const rxStart = lines.findIndex((l) => l.trim() === 'Prescription:');
  if (rxStart === -1) return [];
  const rxLines: string[] = [];
  for (let i = rxStart + 1; i < lines.length; i++) {
    const line = lines[i]?.trim() ?? '';
    if (!line || line.startsWith('Follow-up')) break;
    if (line.startsWith('-')) rxLines.push(line.slice(1).trim());
  }
  return rxLines;
}

function extractFollowUp(summary: string): string {
  const match = summary.match(/^Follow-up Date:\s*(.+)/m);
  return match?.[1]?.trim() ?? '';
}

function ClinicalCard({
  appointment,
  visitRecord,
}: {
  appointment: Appointment;
  visitRecord: VisitHistory | undefined;
}) {
  const diagnosis = visitRecord ? extractDiagnosis(visitRecord.summary) : '';
  const prescription = visitRecord ? extractPrescription(visitRecord.summary) : [];
  const followUp = visitRecord ? extractFollowUp(visitRecord.summary) : '';

  return (
    <article
      style={{
        background: 'white',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Visit header */}
      <div
        style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--color-bg)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 800 }}>{formatDate(appointment.booked_for)}</span>
          <span
            style={{
              fontSize: '0.75rem',
              padding: '0.2rem 0.6rem',
              borderRadius: '999px',
              background: 'var(--color-primary-soft)',
              color: 'var(--color-primary)',
              fontWeight: 700,
            }}
          >
            {formatVisitType(appointment.visit_type)}
          </span>
          <span
            style={{
              fontSize: '0.75rem',
              padding: '0.2rem 0.6rem',
              borderRadius: '999px',
              background:
                appointment.status === 'completed'
                  ? 'var(--color-success-bg)'
                  : appointment.status === 'in_progress'
                    ? 'var(--color-warning-bg)'
                    : 'var(--color-bg)',
              color:
                appointment.status === 'completed'
                  ? 'var(--color-success)'
                  : appointment.status === 'in_progress'
                    ? 'var(--color-warning)'
                    : 'var(--color-text-muted)',
              fontWeight: 700,
              textTransform: 'capitalize',
            }}
          >
            {appointment.status.replace('_', ' ')}
          </span>
        </div>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
          Token #{appointment.token_number}
        </span>
      </div>

      <div style={{ padding: '1.25rem', display: 'grid', gap: '1rem' }}>
        {/* Chief complaint — always shown */}
        <div>
          <p
            style={{
              fontSize: '0.7rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--color-text-muted)',
              marginBottom: '0.25rem',
            }}
          >
            Chief Complaint
          </p>
          <p style={{ color: 'var(--color-text)' }}>{appointment.complaint}</p>
        </div>

        {visitRecord ? (
          <>
            {diagnosis && (
              <div
                style={{
                  background: 'var(--color-primary-soft)',
                  border: '1px solid var(--color-primary-outline)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem 1rem',
                }}
              >
                <p
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--color-primary)',
                    marginBottom: '0.3rem',
                  }}
                >
                  Diagnosis
                </p>
                <p style={{ fontWeight: 700, color: 'var(--color-text)' }}>{diagnosis}</p>
              </div>
            )}

            {prescription.length > 0 && (
              <div>
                <p
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--color-text-muted)',
                    marginBottom: '0.5rem',
                  }}
                >
                  Prescription
                </p>
                <div style={{ display: 'grid', gap: '0.35rem' }}>
                  {prescription.map((rx, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        gap: '0.5rem',
                        alignItems: 'center',
                        fontSize: '0.9rem',
                      }}
                    >
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: 'var(--color-primary)',
                          flexShrink: 0,
                        }}
                      />
                      <span>{rx}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {followUp && (
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                <strong>Follow-up:</strong> {followUp}
              </p>
            )}
          </>
        ) : (
          appointment.status !== 'completed' && (
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              No clinical record — visit not completed.
            </p>
          )
        )}
      </div>
    </article>
  );
}

export default async function PatientProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug, id } = await params;
  await verifyRole(['admin', 'doctor', 'receptionist'], slug);

  const role = ((await headers()).get('x-user-role') ?? 'receptionist') as
    | 'admin'
    | 'doctor'
    | 'receptionist';

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

  // Map visit_history by appointment_id for O(1) lookup
  const historyByAppointment = new Map<string, VisitHistory>();
  for (const record of profile.visitHistory) {
    if (record.appointment_id && !historyByAppointment.has(record.appointment_id)) {
      historyByAppointment.set(record.appointment_id, record);
    }
  }

  const isDoctor = role === 'doctor' || role === 'admin';

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
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to Patients
      </Link>

      {/* Patient header */}
      <section
        style={{
          display: 'grid',
          gap: '1rem',
          background: 'white',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: '1.5rem',
        }}
      >
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

      {/* Doctor/admin: rich clinical cards */}
      {isDoctor ? (
        <section style={{ display: 'grid', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>Visit Records</h2>
          {appointments.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>No visits on record.</p>
          ) : (
            appointments.map((appointment) => (
              <ClinicalCard
                key={appointment.id}
                appointment={appointment}
                visitRecord={historyByAppointment.get(appointment.id)}
              />
            ))
          )}
        </section>
      ) : (
        /* Receptionist: simple table — dates, complaint, status only */
        <section
          style={{
            background: 'white',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Visit History</h2>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '1rem' }}>Date</th>
                  <th style={{ padding: '1rem' }}>Visit type</th>
                  <th style={{ padding: '1rem' }}>Complaint</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment) => (
                  <tr key={appointment.id} style={{ borderBottom: '1px solid var(--color-bg)' }}>
                    <td style={{ padding: '1rem' }}>{formatDate(appointment.booked_for)}</td>
                    <td style={{ padding: '1rem' }}>{formatVisitType(appointment.visit_type)}</td>
                    <td style={{ padding: '1rem' }}>{appointment.complaint}</td>
                    <td style={{ padding: '1rem', textTransform: 'capitalize' }}>
                      {appointment.status.replace('_', ' ')}
                    </td>
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
      )}
    </div>
  );
}
