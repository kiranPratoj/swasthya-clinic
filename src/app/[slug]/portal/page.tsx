import { headers } from 'next/headers';
import { requirePatientSession } from '@/lib/auth';
import { getPatientsByPhone, getPortalProfileData, getPortalReports } from '@/lib/patientPortal';
import type { Appointment } from '@/lib/types';
import PortalProfileChooser from './PortalProfileChooser';
import PortalShell from './[token]/PortalShell';

function UnauthorizedScreen() {
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
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Portal unavailable</h1>
        <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
          Log in again to continue.
        </p>
      </div>
    </main>
  );
}

export default async function PatientPortalHomePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ switch?: string }>;
}) {
  const { slug } = await params;
  const { switch: switchProfile } = await searchParams;
  const clinicId = (await headers()).get('x-clinic-id');

  if (!clinicId) {
    return <UnauthorizedScreen />;
  }

  const session = await requirePatientSession(slug);
  const profiles = await getPatientsByPhone(clinicId, session.phone);
  if (profiles.length === 0) {
    return <UnauthorizedScreen />;
  }

  const shouldChooseProfile = !session.selectedPatientId || switchProfile === '1';
  if (shouldChooseProfile) {
    return (
      <main className="mobile-content-shell" style={{ padding: '1rem 1rem 5.5rem' }}>
        <PortalProfileChooser slug={slug} profiles={profiles} />
      </main>
    );
  }

  const activeProfile = profiles.find((profile) => profile.id === session.selectedPatientId);
  if (!activeProfile) {
    return (
      <main className="mobile-content-shell" style={{ padding: '1rem 1rem 5.5rem' }}>
        <PortalProfileChooser slug={slug} profiles={profiles} />
      </main>
    );
  }

  const [profile, reports] = await Promise.all([
    getPortalProfileData(clinicId, activeProfile.id),
    getPortalReports(clinicId, activeProfile.id),
  ]);

  if (!profile) {
    return <UnauthorizedScreen />;
  }

  const upcomingAppointments = profile.appointments.filter((appointment: Appointment) =>
    !['completed', 'cancelled', 'no_show', 'rescheduled'].includes(appointment.status)
  );

  return (
    <PortalShell
      slug={slug}
      patient={profile.patient}
      upcomingAppointments={upcomingAppointments}
      visitHistory={profile.visitHistory}
      reports={reports}
      canSwitchProfiles={profiles.length > 1}
    />
  );
}
