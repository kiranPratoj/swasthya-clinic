import { notFound } from 'next/navigation';
import { getAppointmentDetails, getClinicName } from '@/app/actions';
import ConsultForm from './ConsultForm';
import { verifyRole } from '@/lib/auth';

export default async function ConsultPage({
  params,
}: {
  params: Promise<{ slug: string; appointmentId: string }>;
}) {
  const { slug, appointmentId } = await params;
  await verifyRole(['admin', 'doctor'], slug);
  const [appointment, clinicName] = await Promise.all([
    getAppointmentDetails(appointmentId),
    getClinicName(slug),
  ]);

  if (!appointment) {
    notFound();
  }

  return (
    <main style={{ padding: '1.5rem 1rem 5rem' }} className="mobile-content-shell">
      <div className="max-w-4xl" style={{ margin: '0 auto' }}>
        <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Consultation</h1>
            <p style={{ color: 'var(--color-text-muted)' }}>
              Token #{appointment.token_number} · {appointment.patient.name}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ 
              display: 'inline-block', 
              padding: '0.3rem 0.7rem', 
              borderRadius: '999px', 
              background: 'var(--color-primary-soft)', 
              color: 'var(--color-primary)',
              fontSize: '0.85rem',
              fontWeight: 700
            }}>
              Today&apos;s Visit
            </span>
          </div>
        </header>

        <ConsultForm appointment={appointment} slug={slug} clinicName={clinicName} />
      </div>
    </main>
  );
}
