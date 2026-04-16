import { headers } from 'next/headers';
import { getClinicDb } from '@/lib/db';
import { validatePatientToken } from '@/lib/patientToken';
import PortalTokenBootstrap from './PortalTokenBootstrap';

function ExpiredScreen() {
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
          gap: '0.75rem',
        }}
      >
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Link expired or invalid</h1>
        <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
          Ask the clinic for a new portal link.
        </p>
      </div>
    </main>
  );
}

export default async function PatientPortalPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  const clinicId = (await headers()).get('x-clinic-id');
  const { slug, token } = await params;

  if (!clinicId) {
    return <ExpiredScreen />;
  }

  const access = await validatePatientToken(token, clinicId);
  if (!access) {
    return <ExpiredScreen />;
  }

  const { data: patient, error } = await getClinicDb(clinicId)
    .from('patients')
    .select('id, name')
    .eq('id', access.patientId)
    .maybeSingle();

  if (error || !patient) {
    return <ExpiredScreen />;
  }

  return (
    <PortalTokenBootstrap slug={slug} token={token} patientName={patient.name as string} />
  );
}
