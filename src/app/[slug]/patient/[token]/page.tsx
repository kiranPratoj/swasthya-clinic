import { headers } from 'next/headers';
import { getAppointmentByToken } from '@/app/actions';
import TokenCard from './TokenCard';

export default async function PatientTokenPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  const clinicId = (await headers()).get('x-clinic-id');
  const { token } = await params;
  const tokenNumber = Number.parseInt(token, 10);

  if (!clinicId || !Number.isFinite(tokenNumber)) {
    return (
      <main style={{ padding: '3rem 1rem 5rem' }}>
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
            Token not found
          </h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            The requested token number is not valid for today&apos;s clinic queue.
          </p>
        </div>
      </main>
    );
  }

  const appointment = await getAppointmentByToken(tokenNumber);

  if (!appointment) {
    return (
      <main style={{ padding: '3rem 1rem 5rem' }}>
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
            Token not found
          </h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            We couldn&apos;t find that token in today&apos;s appointment list.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', padding: '2rem 1rem' }}>
      <TokenCard appointment={appointment} />
    </main>
  );
}
