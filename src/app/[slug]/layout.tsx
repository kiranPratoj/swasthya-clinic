import { headers } from 'next/headers';
import { getClinicDb } from '@/lib/db';
import Link from 'next/link';
import type { Clinic, Doctor } from '@/lib/types';
import StaffBottomNav from '@/components/StaffBottomNav';
import { getSessionOrNull } from '@/lib/auth';
import StaffMoreMenu from '@/components/StaffMoreMenu';

function normalizeDoctorName(name: string): string {
  return name.replace(/^dr\.?\s*/i, '').trim();
}

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

function isPatientFacingPath(pathname: string | null, slug: string): boolean {
  if (!pathname) return false;
  return pathname.startsWith(`/${slug}/portal`) || pathname.startsWith(`/${slug}/patient`);
}

export default async function SlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const requestHeaders = await headers();
  const pathname = requestHeaders.get('x-request-pathname');

  if (isPatientFacingPath(pathname, slug)) {
    return <>{children}</>;
  }

  const ctx = await getClinicContext();
  const session = await getSessionOrNull();

  const clinicName = ctx?.clinic.name ?? slug;
  const doctorName = normalizeDoctorName(ctx?.doctor?.name ?? 'Doctor');
  const primaryNavItems = [
    { href: `/${slug}/queue`, label: 'Queue' },
    { href: `/${slug}/intake`, label: 'Intake' },
    { href: `/${slug}/patients`, label: 'Patients' },
  ];
  const moreNavItems: Array<{ href: string; label: string }> = [];
  if (session?.role === 'admin' || session?.role === 'doctor') {
    moreNavItems.push({ href: `/${slug}/settings`, label: 'Settings' });
    moreNavItems.push({ href: `/${slug}/history`, label: 'History' });
  }
  if (session?.role === 'admin') {
    moreNavItems.push({ href: `/${slug}/admin`, label: 'Admin' });
  }

  return (
    <div>
      <div className="staff-sub-nav-desktop" style={{
        background: 'linear-gradient(180deg, var(--color-bg) 0%, white 100%)',
        borderBottom: '1px solid rgba(3, 78, 162, 0.12)',
        padding: '0.85rem 0 0.9rem',
        fontSize: '0.84rem',
      }}>
        <div className="max-w-7xl px-4" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: '1rem 1.5rem' }}>
          <div style={{ minWidth: 0, display: 'grid', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
              Clinic Console
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.55rem', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 800, color: 'var(--color-text)', fontSize: '1.05rem' }}>
                {clinicName}
              </span>
              {ctx?.clinic.speciality && (
                <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>· {ctx.clinic.speciality}</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
              <nav className="slug-sub-nav" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {primaryNavItems.map(({ href, label }) => (
                  <Link key={href} href={href} style={{
                    padding: '0.55rem 0.85rem',
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
              <StaffMoreMenu items={moreNavItems} />
            </div>
          </div>
        </div>
      </div>

      {/* Content area — mobile-content-shell adds bottom padding for the fixed nav */}
      <div className="max-w-7xl px-4 py-8 mobile-content-shell">
        {children}
      </div>

      {/* Mobile bottom nav — hidden on desktop via .staff-bottom-nav-mobile */}
      <div className="staff-bottom-nav-mobile">
        <StaffBottomNav slug={slug} doctorName={doctorName} role={session?.role ?? 'receptionist'} />
      </div>
    </div>
  );
}
