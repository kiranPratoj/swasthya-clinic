import { getDb } from '@/lib/db';
import type { Appointment, Patient } from '@/lib/types';
import ConsultForm from './ConsultForm';

type Props = {
  params: Promise<{ slug: string; appointmentId: string }>;
};

export default async function ConsultPage({ params }: Props) {
  const { slug, appointmentId } = await params;
  const db = getDb();

  const { data: appt, error: apptError } = await db
    .from('appointments')
    .select('*')
    .eq('id', appointmentId)
    .single();

  if (apptError || !appt) {
    return (
      <main style={{ padding: '2rem 1rem' }}>
        <div
          className="max-w-xl"
          style={{
            background: 'white',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            Appointment not found
          </h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Could not load appointment {appointmentId}.
          </p>
        </div>
      </main>
    );
  }

  const { data: patient } = await db
    .from('patients')
    .select('*')
    .eq('id', appt.patient_id)
    .single();

  const { data: doctor } = await db
    .from('doctors')
    .select('*')
    .eq('id', appt.doctor_id)
    .single();

  const { data: clinic } = await db
    .from('clinics')
    .select('name')
    .eq('slug', slug)
    .single();

  const patientName = patient?.name ?? 'Unknown Patient';
  const doctorName = doctor?.name ?? 'Doctor';
  const clinicName = clinic?.name ?? 'Swasthya Clinic';

  return (
    <main style={{ padding: '2rem 1rem 6rem' }}>
      <div className="max-w-3xl">
        <header style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <a
              href={`/${slug}/queue`}
              style={{
                color: 'var(--color-text-muted)',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              ← Queue
            </a>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>
            Consultation — Token #{(appt as Appointment).token_number}
          </h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '0.35rem', fontSize: '1.05rem' }}>
            <strong>{patientName}</strong>
            {patient?.age != null && <span> · Age {patient.age}</span>}
          </p>
          {(appt as Appointment).complaint && (
            <p
              style={{
                marginTop: '0.5rem',
                background: 'var(--color-primary-soft)',
                border: '1px solid var(--color-primary-outline)',
                borderRadius: 'var(--radius-md)',
                padding: '0.6rem 1rem',
                color: 'var(--color-text)',
                fontStyle: 'italic',
              }}
            >
              Chief complaint: {(appt as Appointment).complaint}
            </p>
          )}
        </header>

        <ConsultForm
          appointmentId={appointmentId}
          patientName={patientName}
          doctorName={doctorName}
          clinicName={clinicName}
          slug={slug}
        />
      </div>
    </main>
  );
}
