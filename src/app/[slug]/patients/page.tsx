import { getAllPatients } from '@/app/actions';
import PatientsClient from './PatientsClient';

export default async function PatientsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const patients = await getAllPatients();

  return (
    <main style={{ padding: '1.5rem 1rem' }}>
      <div className="max-w-5xl">
        <PatientsClient patients={patients} slug={slug} />
      </div>
    </main>
  );
}
