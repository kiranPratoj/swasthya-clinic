'use client';

import { useEffect, useRef, useState } from 'react';

type ToastItem = {
  id: string;
  token: number;
  name: string;
};

type NewPatientToastProps = {
  items: ToastItem[];
  onDismiss: (id: string) => void;
};

export default function NewPatientToast({
  items,
  onDismiss,
}: NewPatientToastProps) {
  const startedIdsRef = useRef<Set<string>>(new Set());
  const [leavingIds, setLeavingIds] = useState<string[]>([]);

  useEffect(() => {
    const timers: number[] = [];

    items.forEach((item) => {
      if (startedIdsRef.current.has(item.id)) {
        return;
      }

      startedIdsRef.current.add(item.id);

      timers.push(
        window.setTimeout(() => {
          setLeavingIds((current) => (current.includes(item.id) ? current : [...current, item.id]));
        }, 3400)
      );

      timers.push(
        window.setTimeout(() => {
          startedIdsRef.current.delete(item.id);
          setLeavingIds((current) => current.filter((value) => value !== item.id));
          onDismiss(item.id);
        }, 4000)
      );
    });

    return () => {
      timers.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, [items, onDismiss]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        right: '1.25rem',
        bottom: '1.25rem',
        zIndex: 9999,
        display: 'grid',
        gap: '0.75rem',
        width: 'min(22rem, calc(100vw - 2rem))',
      }}
    >
      {items.map((item) => {
        const isLeaving = leavingIds.includes(item.id);

        return (
          <div
            key={item.id}
            style={{
              background: 'white',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
              borderLeft: '5px solid var(--color-accent)',
              boxShadow: 'var(--shadow-md)',
              padding: '0.95rem 1rem',
              display: 'grid',
              gap: '0.3rem',
              opacity: isLeaving ? 0 : 1,
              transform: isLeaving ? 'translateX(24px)' : 'translateX(0)',
              transition: 'opacity 220ms ease, transform 220ms ease',
            }}
          >
            <p style={{ fontWeight: 800, color: 'var(--color-text)' }}>
              New patient — Token #{item.token}
            </p>
            <p style={{ color: 'var(--color-text-muted)' }}>{item.name}</p>
          </div>
        );
      })}
    </div>
  );
}
