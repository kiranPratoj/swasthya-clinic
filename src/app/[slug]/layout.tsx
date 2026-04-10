import { headers } from 'next/headers';
import { getClinicDb } from '@/lib/db';
import Link from 'next/link';
import type { Clinic, Doctor } from '@/lib/types';
import StaffBottomNav from '@/components/StaffBottomNav';

async function getClinicContext(): Promise<{ clinic: Clinic; doctor: Doctor | null } | null> {
  const h = await headers();
  const clinicId = h.get('x-clinic-id');
  if (!clinicId) return null;

  const db = getClinicDb(clinicId);
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
      <div className="staff-sub-nav-desktop" style={{
        background: 'linear-gradient(180deg, var(--color-bg) 0%, white 100%)',
        borderBottom: '1px solid rgba(3, 78, 162, 0.12)',
        padding: '0.9rem 0 1rem',
        fontSize: '0.84rem',
      }}>
        <div className="max-w-7xl px-4" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
              Clinic Console
            </div>
            <span style={{ fontWeight: 800, color: 'var(--color-text)', fontSize: '1.05rem' }}>
              {clinicName}
            </span>
            {ctx?.clinic.speciality && (
              <span style={{ fontWeight: 600, color: 'var(--color-text-muted)', marginLeft: '0.65rem' }}>· {ctx.clinic.speciality}</span>
            )}
          </div>

          <nav className="slug-sub-nav" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { href: `/${slug}/intake`, label: 'Intake' },
              { href: `/${slug}/queue`, label: 'Queue' },
              { href: `/${slug}/patients`, label: 'Patients' },
              { href: `/${slug}/history`, label: 'History' },
              { href: `/${slug}/admin`, label: 'Dashboard' },
              { href: `/${slug}/settings`, label: 'Settings' },
            ].map(({ href, label }) => (
              <Link key={href} href={href} style={{
                padding: '0.55rem 0.8rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'var(--color-primary)',
                borderRadius: '999px',
                border: '1px solid var(--color-primary-outline)',
                background: 'white',
                boxShadow: 'var(--shadow-sm)',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}>
                {label}
              </Link>
            ))}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--color-primary)', fontSize: '0.8rem', fontWeight: 700, padding: '0.45rem 0.7rem', background: 'var(--color-primary-soft)', borderRadius: '999px', whiteSpace: 'nowrap' }}>
              Dr. {doctorName}
            </span>
            <form action="/api/auth/logout" method="POST">
              <button type="submit" style={{
                fontSize: '0.76rem',
                fontWeight: 700,
                color: 'var(--color-error)',
                background: 'rgba(237, 28, 36, 0.06)',
                border: '1px solid rgba(237, 28, 36, 0.16)',
                borderRadius: '999px',
                padding: '0.45rem 0.8rem',
                cursor: 'pointer',
              }}>
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Content area — mobile-content-shell adds bottom padding for the fixed nav */}
      <div className="max-w-7xl px-4 py-8 mobile-content-shell">
        {children}
      </div>

      {/* Mobile bottom nav — hidden on desktop via .staff-bottom-nav-mobile */}
      <div className="staff-bottom-nav-mobile">
        <StaffBottomNav slug={slug} doctorName={doctorName} />
      </div>
    </div>
  );
}
