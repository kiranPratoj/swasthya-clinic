'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';

type StaffMoreMenuProps = {
  items: Array<{ href: string; label: string }>;
};

const summaryStyle: CSSProperties = {
  listStyle: 'none',
  cursor: 'pointer',
  fontSize: '0.79rem',
  fontWeight: 700,
  color: 'var(--color-text-muted)',
  whiteSpace: 'nowrap',
};

const panelStyle: CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 0.55rem)',
  left: 0,
  minWidth: '11rem',
  background: 'white',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-md)',
  padding: '0.45rem',
  display: 'grid',
  gap: '0.2rem',
  zIndex: 10,
};

const linkStyle: CSSProperties = {
  fontSize: '0.82rem',
  fontWeight: 700,
  color: 'var(--color-text)',
  textDecoration: 'none',
  padding: '0.6rem 0.75rem',
  borderRadius: 'var(--radius-md)',
  whiteSpace: 'nowrap',
};

const signOutStyle: CSSProperties = {
  width: '100%',
  fontSize: '0.82rem',
  fontWeight: 700,
  color: 'var(--color-error)',
  background: 'rgba(237, 28, 36, 0.06)',
  border: '1px solid rgba(237, 28, 36, 0.16)',
  borderRadius: 'var(--radius-md)',
  padding: '0.6rem 0.75rem',
  cursor: 'pointer',
  textAlign: 'left',
};

export default function StaffMoreMenu({ items }: StaffMoreMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen((value) => !value)} style={summaryStyle}>
        More
      </button>
      {open && (
        <div style={panelStyle}>
          {items.map(({ href, label }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)} style={linkStyle}>
              {label}
            </Link>
          ))}
          <form action="/api/auth/logout" method="POST">
            <button type="submit" style={signOutStyle}>
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
