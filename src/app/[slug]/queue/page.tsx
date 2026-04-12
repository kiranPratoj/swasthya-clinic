import { headers } from 'next/headers';
import { getClinicQueue, callNextPatient } from '@/app/actions';
import QueueDisplay from './QueueDisplay';
import QueueAutoRefresh from './QueueAutoRefresh';
import { verifyRole } from '@/lib/auth';

function getTodayIsoDate(): string {
  const now = new Date();
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localTime.toISOString().split('T')[0];
}

export default async function QueuePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await verifyRole(['admin', 'doctor', 'receptionist'], slug);
  const clinicId = (await headers()).get('x-clinic-id');
  const userRole = ((await headers()).get('x-user-role') ?? 'receptionist') as 'admin' | 'doctor' | 'receptionist';

  if (!clinicId) {
    return (
      <main style={{ padding: '2rem 1rem 4rem' }}>
        <div
          className="max-w-xl"
          style={{
            background: 'white',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-sm)',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            Clinic not found
          </h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            The queue view needs a resolved clinic context before it can load today&apos;s appointments.
          </p>
        </div>
      </main>
    );
  }

  const queue = await getClinicQueue(getTodayIsoDate());

  const waitingCount = queue.filter(
    (item) => item.status === 'confirmed' || item.status === 'booked'
  ).length;

  return (
    <main style={{ padding: '2rem 1rem 4rem' }} className="mobile-content-shell">
      <QueueAutoRefresh />
      <div className="max-w-5xl">
        {/* Call Next button */}
        {waitingCount > 0 && (
          <form action={callNextPatient} style={{ marginBottom: '1.5rem' }}>
            <button
              type="submit"
              style={{
                border: 'none',
                borderRadius: 'var(--radius-md)',
                padding: '0.9rem 1.5rem',
                background: 'var(--color-accent)',
                color: 'white',
                fontWeight: 800,
                fontSize: '1rem',
                boxShadow: 'var(--shadow-sm)',
                cursor: 'pointer',
              }}
            >
              Call Next Patient ({waitingCount} waiting)
            </button>
          </form>
        )}

        <QueueDisplay initialQueue={queue} clinicId={clinicId} slug={slug} role={userRole} />
      </div>
    </main>
  );
}
