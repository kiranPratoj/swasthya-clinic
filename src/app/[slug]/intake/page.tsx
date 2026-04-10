import { headers } from 'next/headers';
import { getClinicDb } from '@/lib/db';
import PatientIntakeForm from './PatientIntakeForm';

export default async function IntakePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
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
      <div className="max-w-3xl" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <span
            style={{
              alignSelf: 'flex-start',
              padding: '0.35rem 0.7rem',
              borderRadius: '999px',
              background: 'var(--color-primary-soft)',
              color: 'var(--color-primary)',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Reception Intake
          </span>
          <h1 style={{ fontSize: '2rem', lineHeight: 1.15, fontWeight: 800 }}>
            Add the next patient quickly.
          </h1>
          <p style={{ color: 'var(--color-text-muted)', maxWidth: '42rem' }}>
            Use live voice capture for faster intake, then confirm the details before creating the appointment token.
          </p>
        </div>

        <PatientIntakeForm
          doctorId={doctor.id}
          slug={slug}
          mockMode={!process.env.SARVAM_API_KEY}
        />
      </div>
    </main>
  );
}
