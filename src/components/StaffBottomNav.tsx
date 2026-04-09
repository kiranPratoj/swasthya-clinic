'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface Props {
  slug: string;
  doctorName: string;
}

const NAV_ITEMS = [
  {
    id: 'queue',
    label: 'Queue',
    href: (slug: string) => `/${slug}/queue`,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <circle cx="3" cy="6" r="1" fill="currentColor" stroke="none" />
        <circle cx="3" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="3" cy="18" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    id: 'patients',
    label: 'Patients',
    href: (slug: string) => `/${slug}/patients`,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: 'intake',
    label: 'Intake',
    href: (slug: string) => `/${slug}/intake`,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12l7-7 7 7" />
      </svg>
    ),
    isFab: true,
  },
  {
    id: 'history',
    label: 'History',
    href: (slug: string) => `/${slug}/history`,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    id: 'more',
    label: 'More',
    href: null,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="5" r="1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

const MORE_ITEMS = [
  { id: 'admin', label: 'Dashboard', href: (slug: string) => `/${slug}/admin` },
  { id: 'settings', label: 'Settings', href: (slug: string) => `/${slug}/settings` },
];

export default function StaffBottomNav({ slug, doctorName }: Props) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const activeId = NAV_ITEMS.find(item => item.href && pathname.startsWith(item.href(slug)))?.id
    ?? (MORE_ITEMS.some(m => pathname.startsWith(m.href(slug))) ? 'more' : null);

  return (
    <>
      {/* More sheet backdrop */}
      {moreOpen && (
        <div
          onClick={() => setMoreOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            zIndex: 90,
          }}
        />
      )}

      {/* More bottom sheet */}
      {moreOpen && (
        <div style={{
          position: 'fixed',
          bottom: 'calc(64px + env(safe-area-inset-bottom))',
          left: 0,
          right: 0,
          background: '#ffffff',
          borderRadius: '16px 16px 0 0',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
          zIndex: 91,
          padding: '1rem',
        }}>
          <div style={{ width: 36, height: 4, background: '#e2e8f0', borderRadius: 2, margin: '0 auto 1rem' }} />
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem', paddingLeft: '0.25rem' }}>
            Dr. {doctorName}
          </div>
          {MORE_ITEMS.map(item => (
            <Link
              key={item.id}
              href={item.href(slug)}
              onClick={() => setMoreOpen(false)}
              style={{
                display: 'block',
                padding: '0.875rem 0.5rem',
                fontSize: '0.9375rem',
                fontWeight: 600,
                color: pathname.startsWith(item.href(slug)) ? 'var(--color-primary)' : 'var(--color-text)',
                borderBottom: '1px solid #f1f5f9',
                textDecoration: 'none',
              }}
            >
              {item.label}
            </Link>
          ))}
          <form action="/api/auth/logout" method="POST" style={{ marginTop: '0.5rem' }}>
            <button type="submit" style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#ef4444',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              cursor: 'pointer',
              marginTop: '0.25rem',
            }}>
              Sign out
            </button>
          </form>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'calc(64px + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: '#ffffff',
        borderTop: '1px solid #bae6fd',
        boxShadow: '0 -2px 12px rgba(8, 145, 178, 0.08)',
        display: 'flex',
        alignItems: 'stretch',
        zIndex: 80,
      }}>
        {NAV_ITEMS.map(item => {
          const isActive = item.id === activeId;
          const isMore = item.id === 'more';
          const isFab = item.isFab;

          if (isFab) {
            return (
              <div key={item.id} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <Link
                  href={item.href!(slug)}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: 'var(--color-primary)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 16px rgba(8, 145, 178, 0.35)',
                    marginBottom: 8,
                    textDecoration: 'none',
                  }}
                >
                  {item.icon}
                </Link>
              </div>
            );
          }

          if (isMore) {
            return (
              <button
                key={item.id}
                onClick={() => setMoreOpen(v => !v)}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                  background: 'none',
                  border: 'none',
                  color: isActive || moreOpen ? 'var(--color-primary)' : '#94a3b8',
                  cursor: 'pointer',
                  padding: '0 0.25rem',
                  paddingBottom: 0,
                }}
              >
                {item.icon}
                <span style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={item.id}
              href={item.href!(slug)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                color: isActive ? 'var(--color-primary)' : '#94a3b8',
                textDecoration: 'none',
                padding: '0 0.25rem',
                paddingBottom: 0,
              }}
            >
              {item.icon}
              <span style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
