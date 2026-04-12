import { headers } from 'next/headers';
import { getClinicDb } from '@/lib/db';
import PatientIntakeForm from './PatientIntakeForm';
import { verifyRole } from '@/lib/auth';

export default async function IntakePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await verifyRole(['admin', 'doctor', 'receptionist'], slug);
  const clinicId = (await headers()).get('x-clinic-id');

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
            This clinic context could not be resolved for the intake form.
          </p>
        </div>
      </main>
    );
  }

  const { data: doctor, error } = await getClinicDb(clinicId)
    .from('doctors')
    .select('*')
    .eq('clinic_id', clinicId)
    .single();

  if (error || !doctor) {
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
            Doctor unavailable
          </h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            A doctor record is required before patients can be added to the queue.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: '2rem 1rem 4rem' }} className="mobile-content-shell">
      <div className="max-w-3xl intake-page-shell" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="intake-page-intro" style={{ display: 'grid', gap: '0.5rem' }}>
          <p
            style={{
              margin: 0,
              fontSize: '0.8rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--color-accent)',
            }}
          >
            Reception Intake
          </p>
          <h1 style={{ margin: 0, fontSize: 'clamp(2rem, 4vw, 3rem)', lineHeight: 1.02, fontWeight: 800 }}>
            Add the next patient quickly.
          </h1>
        </div>
        <PatientIntakeForm
          doctorId={doctor.id}
          mockMode={!process.env.SARVAM_API_KEY}
        />
      </div>
    </main>
  );
}
