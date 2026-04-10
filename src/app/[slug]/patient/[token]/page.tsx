import { headers } from 'next/headers';
import Link from 'next/link';
import { 
  getAppointmentByToken, 
  getPatientAppointments, 
  getPatientVisitHistory 
} from '@/app/actions';
import PatientBottomNav from '@/components/PatientBottomNav';
import HistoryCard from './HistoryCard';
import RaiseForm from './RaiseForm';
import type { VisitHistory, Appointment } from '@/lib/types';

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function statusColor(status: string): { bg: string; fg: string } {
  switch (status) {
    case 'confirmed':
    case 'booked':
      return { bg: 'var(--color-primary-soft)', fg: 'var(--color-primary)' };
    case 'in_progress':
      return { bg: 'var(--color-warning-bg)', fg: 'var(--color-warning)' };
    case 'completed':
      return { bg: 'var(--color-success-bg)', fg: 'var(--color-success)' };
    case 'cancelled':
      return { bg: 'var(--color-error-bg)', fg: 'var(--color-error)' };
    default:
      return { bg: 'var(--color-bg-soft)', fg: 'var(--color-text-muted)' };
  }
}

function StatusPill({ status }: { status: string }) {
  const { bg, fg } = statusColor(status);
  return (
    <span style={{
      display: 'inline-block',
      padding: '0.2rem 0.625rem',
      borderRadius: 999,
      fontSize: '0.75rem',
      fontWeight: 700,
      background: bg,
      color: fg,
      textTransform: 'capitalize',
    }}>
      {status.replace('_', ' ')}
    </span>
  );
}

export default async function PatientPortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const h = await headers();
  const clinicId = h.get('x-clinic-id');

  const { slug, token } = await params;
  const sp = await searchParams;
  const tab = (sp.tab as string) || 'appointments';

  const basePath = `/${slug}/patient/${token}`;
  const tokenNumber = Number.parseInt(token, 10);

  if (!clinicId || !Number.isFinite(tokenNumber)) {
    return (
      <main className="mobile-content-shell" style={{ padding: '3rem 1rem 5rem' }}>
        <div style={{
          background: 'white',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-sm)',
          padding: '2rem',
          textAlign: 'center',
        }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>Token not found</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>The requested token number is not valid.</p>
        </div>
      </main>
    );
  }

  // Resolve today's appointment
  const todayAppointment = await getAppointmentByToken(tokenNumber);

  if (!todayAppointment) {
    return (
      <main className="mobile-content-shell" style={{ padding: '3rem 1rem 5rem' }}>
        <div style={{
          background: 'white',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-sm)',
          padding: '2rem',
          textAlign: 'center',
        }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>Token not found</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            We couldn&apos;t find that token in today&apos;s appointment list.
          </p>
        </div>
      </main>
    );
  }

  const patient = todayAppointment.patient;
  const today = new Date().toISOString().split('T')[0];

  // ── Tab: appointments ─────────────────────────────────────────────────────
  let upcomingAppointment: Appointment | null = null;
  let queuePosition: number | null = null;

  if (tab === 'appointments') {
    const appts = await getPatientAppointments(patient.id);
    // Find first non-finalized appointment today or in future
    upcomingAppointment = appts.find(a => !['completed', 'cancelled', 'no_show', 'rescheduled'].includes(a.status)) || null;

    if (upcomingAppointment && upcomingAppointment.booked_for === today) {
      // Re-fetch queue to find position (or could use an action)
      // For now, simpler to stick with todayAppointment if it matches
      if (todayAppointment.id === upcomingAppointment.id) {
        // We could calculate position here if we had the full queue, 
        // but let's assume getClinicQueue is available
        const { getClinicQueue } = await import('@/app/actions');
        const queue = await getClinicQueue(today);
        const pos = queue.findIndex(q => q.id === todayAppointment.id);
        if (pos !== -1) queuePosition = pos + 1;
      }
    }
  }

  // ── Tab: history ──────────────────────────────────────────────────────────
  let visitHistory: VisitHistory[] = [];
  if (tab === 'history') {
    visitHistory = await getPatientVisitHistory(patient.id);
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <main className="mobile-content-shell" style={{ padding: '1rem 1rem 5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>
          Patient Portal
        </p>
        <h1 style={{ fontSize: '1.375rem', fontWeight: 800, margin: 0 }}>{patient.name}</h1>
        {patient.phone && (
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>{patient.phone}</p>
        )}
      </div>

      {/* ── Appointments tab ─────────────────────────────────────────────── */}
      {tab === 'appointments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {upcomingAppointment ? (
            <>
              {queuePosition !== null && (
                <div style={{
                  background: 'var(--color-primary)',
                  color: '#fff',
                  borderRadius: 'var(--radius-lg)',
                  padding: '0.875rem 1rem',
                  fontWeight: 800,
                  fontSize: '1rem',
                  textAlign: 'center',
                }}>
                  You are #{queuePosition} in line
                </div>
              )}
              <div style={{
                background: 'white',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-xl)',
                padding: '1.25rem',
                boxShadow: 'var(--shadow-sm)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <p style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.2rem' }}>
                      {formatDate(upcomingAppointment.booked_for)}
                    </p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                      Token #{upcomingAppointment.token_number}
                    </p>
                  </div>
                  <StatusPill status={upcomingAppointment.status} />
                </div>
                {upcomingAppointment.complaint && (
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                    {upcomingAppointment.complaint}
                  </p>
                )}
              </div>
            </>
          ) : (
            <div style={{
              background: 'white',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              padding: '2rem',
              textAlign: 'center',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <p style={{ fontWeight: 700, marginBottom: '0.5rem' }}>No upcoming appointments</p>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                Book a new appointment below.
              </p>
              <Link
                href={`/${slug}/book`}
                style={{
                  display: 'inline-block',
                  padding: '0.625rem 1.25rem',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  textDecoration: 'none',
                }}
              >
                Book appointment
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── History tab ───────────────────────────────────────────────────── */}
      {tab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {visitHistory.length === 0 ? (
            <div style={{
              background: 'white',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              padding: '2rem',
              textAlign: 'center',
            }}>
              <p style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>No visit history yet.</p>
            </div>
          ) : (
            visitHistory.map(visit => (
              <HistoryCard
                key={visit.id}
                date={formatDate(visit.created_at)}
                summary={visit.summary}
              />
            ))
          )}
        </div>
      )}

      {/* ── Raise tab ─────────────────────────────────────────────────────── */}
      {tab === 'raise' && (
        <div>
          <div style={{
            background: 'white',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.25rem',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem' }}>
              Raise a concern
            </h2>
            <RaiseForm patientId={patient.id} clinicId={clinicId!} />
          </div>
        </div>
      )}

      <PatientBottomNav basePath={basePath} activeTab={tab as 'appointments' | 'history' | 'raise'} />
    </main>
  );
}
