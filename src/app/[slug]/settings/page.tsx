import { getDoctorForClinic } from '@/app/actions';
import SettingsForm from './SettingsForm';
import Link from 'next/link';
import { verifyRole } from '@/lib/auth';

export default async function SettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await verifyRole(['admin', 'doctor'], slug);
  const doctor = await getDoctorForClinic();

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--color-text)' }}>Clinic Settings</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Manage your profile, working hours and appointment slots.</p>
        </div>
        <Link
          href={`/${slug}/admin`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'white',
            border: '1px solid var(--color-border)',
            color: 'var(--color-primary)',
            fontWeight: 700,
            fontSize: '0.875rem',
            textDecoration: 'none',
            boxShadow: 'var(--shadow-sm)',
            transition: 'all 0.2s ease',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>
      </header>

      <SettingsForm doctor={doctor} />
    </div>
  );
}
