'use client';
import Link from 'next/link';

interface Props {
  basePath: string;
  activeTab: 'appointments' | 'history' | 'raise';
}

const CalendarIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const ClockIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const PlusCircleIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

const TABS = [
  { id: 'appointments' as const, label: 'Appointments', Icon: CalendarIcon },
  { id: 'history' as const, label: 'History', Icon: ClockIcon },
  { id: 'raise' as const, label: 'Raise Issue', Icon: PlusCircleIcon },
];

export default function PatientBottomNav({ basePath, activeTab }: Props) {
  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 'calc(64px + env(safe-area-inset-bottom))',
      paddingBottom: 'env(safe-area-inset-bottom)',
      background: '#ffffff',
      borderTop: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'stretch',
      zIndex: 80,
    }}>
      {TABS.map(({ id, label, Icon }) => {
        const isActive = activeTab === id;
        return (
          <Link
            key={id}
            href={`${basePath}?tab=${id}`}
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
            <Icon />
            <span style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
