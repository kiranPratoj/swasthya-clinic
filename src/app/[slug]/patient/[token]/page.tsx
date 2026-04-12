import { headers } from 'next/headers';
import { 
  getAppointmentByToken, 
  getPatientVisitHistory 
} from '@/app/actions';
import PatientBottomNav from '@/components/PatientBottomNav';
import HistoryCard from './HistoryCard';
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
  const rawTab = (sp.tab as string) || 'appointments';
  const tab = rawTab === 'history' ? 'history' : 'appointments';

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
  const requestedAppointment: Appointment = todayAppointment;
  let queuePosition: number | null = null;

  if (tab === 'appointments') {
    const isActiveQueueStatus = !['completed', 'cancelled', 'no_show', 'rescheduled'].includes(
      requestedAppointment.status
    );

    if (isActiveQueueStatus && requestedAppointment.booked_for === today) {
      const { getClinicQueue } = await import('@/app/actions');
      const queue = await getClinicQueue(today);
      const pos = queue.findIndex((q) => q.id === requestedAppointment.id);
      if (pos !== -1) queuePosition = pos + 1;
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
                  {formatDate(requestedAppointment.booked_for)}
                </p>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                  Token #{requestedAppointment.token_number}
                </p>
              </div>
              <StatusPill status={requestedAppointment.status} />
            </div>
            {requestedAppointment.complaint && (
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                {requestedAppointment.complaint}
              </p>
            )}
          </div>
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

      <PatientBottomNav basePath={basePath} activeTab={tab as 'appointments' | 'history'} />
    </main>
  );
}
