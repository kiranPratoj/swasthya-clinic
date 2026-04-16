import { getPatientSessionOrNull } from '@/lib/auth';
import { getClinicBySlug } from '@/lib/patientPortal';
import { redirect } from 'next/navigation';
import PatientPortalLogin from './PatientPortalLogin';

export default async function PatientPortalLoginPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getPatientSessionOrNull();
  if (session?.slug === slug) {
    redirect(`/${slug}/portal`);
  }
  const clinic = await getClinicBySlug(slug);

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg)',
        padding: '1.5rem 1rem 3rem',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <PatientPortalLogin slug={slug} clinicName={clinic?.name ?? 'your clinic'} />
    </main>
  );
}
