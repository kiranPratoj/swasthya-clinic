import { getAllPatients } from '@/app/actions';
import PatientsClient from './PatientsClient';
import { verifyRole } from '@/lib/auth';

export default async function PatientsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await verifyRole(['admin', 'doctor', 'receptionist'], slug);
  const patients = await getAllPatients();

  return (
    <main style={{ padding: '1.5rem 1rem' }} className="mobile-content-shell">
      <div className="max-w-5xl">
        <PatientsClient patients={patients} slug={slug} />
      </div>
    </main>
  );
}
