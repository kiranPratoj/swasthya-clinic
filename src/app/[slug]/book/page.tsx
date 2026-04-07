import { headers } from 'next/headers';
import { getDb } from '@/lib/db';
import BookingForm from './BookingForm';

export default async function PatientBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const clinicId = (await headers()).get('x-clinic-id');

  if (!clinicId) {
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--color-bg)', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏥</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Clinic not found</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>This booking link is not valid. Please contact the clinic directly.</p>
        </div>
      </main>
    );
  }

  const [{ data: clinic }, { data: doctor }] = await Promise.all([
    getDb().from('clinics').select('name, phone, speciality').eq('id', clinicId).single(),
    getDb().from('doctors').select('id, name, speciality').eq('clinic_id', clinicId).limit(1).single(),
  ]);

  if (!doctor) {
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--color-bg)', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Bookings unavailable</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>The clinic is not accepting online bookings at this time.</p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '2rem 1rem 4rem' }}>
      <div style={{ maxWidth: '520px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Clinic header */}
        <div style={{
          background: 'var(--color-primary)',
          borderRadius: 'var(--radius-xl)',
          padding: '1.5rem',
          color: 'white',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.8, marginBottom: '0.4rem' }}>
            Book an Appointment
          </p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>
            {clinic?.name ?? 'Clinic'}
          </h1>
          <p style={{ opacity: 0.85, fontSize: '0.9rem' }}>
            Dr. {doctor.name} · {clinic?.speciality ?? doctor.speciality}
          </p>
          {clinic?.phone && (
            <p style={{ opacity: 0.7, fontSize: '0.82rem', marginTop: '0.35rem' }}>📞 {clinic.phone}</p>
          )}
        </div>

        <BookingForm doctorId={doctor.id} slug={slug} clinicName={clinic?.name ?? 'Clinic'} />
      </div>
    </main>
  );
}
