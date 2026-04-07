import { headers } from 'next/headers';
import { getDb } from '@/lib/db';
import Link from 'next/link';
import type { Clinic, Doctor } from '@/lib/types';

async function getClinicContext(): Promise<{ clinic: Clinic; doctor: Doctor | null } | null> {
  const h = await headers();
  const clinicId = h.get('x-clinic-id');
  if (!clinicId) return null;

  const db = getDb();
  const [{ data: clinic }, { data: doctor }] = await Promise.all([
    db.from('clinics').select('*').eq('id', clinicId).single(),
    db.from('doctors').select('*').eq('clinic_id', clinicId).single(),
  ]);

  if (!clinic) return null;
  return { clinic: clinic as Clinic, doctor: doctor as Doctor | null };
}

export default async function SlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await getClinicContext();

  const clinicName = ctx?.clinic.name ?? slug;
  const doctorName = ctx?.doctor?.name ?? 'Doctor';

  return (
    <div>
      {/* Clinic sub-header */}
      <div style={{
        background: '#f0f9ff',
        borderBottom: '1px solid #bae6fd',
        padding: '0.5rem 0',
        fontSize: '0.8rem',
      }}>
        <div className="max-w-7xl px-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, color: '#0369a1' }}>
            {clinicName}
            {ctx?.clinic.speciality && (
              <span style={{ fontWeight: 400, color: '#0891b2', marginLeft: '0.5rem' }}>· {ctx.clinic.speciality}</span>
            )}
          </span>
          <nav className="slug-sub-nav" style={{ display: 'flex', gap: '0.25rem' }}>
            {[
              { href: `/${slug}/intake`, label: 'Intake' },
              { href: `/${slug}/queue`, label: 'Queue' },
              { href: `/${slug}/patients`, label: 'Patients' },
              { href: `/${slug}/history`, label: 'History' },
              { href: `/${slug}/admin`, label: 'Dashboard' },
              { href: `/${slug}/settings`, label: 'Settings' },
            ].map(({ href, label }) => (
              <Link key={href} href={href} style={{
                padding: '0.25rem 0.625rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#0369a1',
                borderRadius: '4px',
                border: '1px solid transparent',
                textDecoration: 'none',
              }}>
                {label}
              </Link>
            ))}
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ color: '#0891b2', fontSize: '0.75rem' }}>Dr. {doctorName}</span>
            <form action="/api/auth/logout" method="POST">
              <button type="submit" style={{
                fontSize: '0.7rem', fontWeight: 600, color: '#64748b',
                background: 'none', border: '1px solid #cbd5e1',
                borderRadius: '4px', padding: '0.2rem 0.55rem', cursor: 'pointer',
              }}>
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}
