'use client';

import { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type DateNavigatorProps = {
  currentDate: string;
  onDateChange?: (isoDate: string) => void;
};

function getTodayIsoDate(): string {
  const now = new Date();
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localTime.toISOString().split('T')[0];
}

function shiftIsoDate(isoDate: string, dayDelta: number): string {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + dayDelta);
  return date.toISOString().split('T')[0];
}

function formatDateLabel(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function DateNavigator({
  currentDate,
  onDateChange,
}: DateNavigatorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const todayIso = useMemo(() => getTodayIsoDate(), []);
  const isToday = currentDate === todayIso;

  function pushDate(nextDate: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (nextDate === todayIso) {
      params.delete('date');
    } else {
      params.set('date', nextDate);
    }

    onDateChange?.(nextDate);

    const nextQuery = params.toString();
    router.push(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  }

  return (
    <section
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        flexWrap: 'wrap',
        background: 'white',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-sm)',
        padding: '1rem 1.15rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => pushDate(shiftIsoDate(currentDate, -1))}
          style={{
            border: '1px solid var(--color-border)',
            background: 'white',
            borderRadius: '999px',
            padding: '0.65rem 0.95rem',
            fontWeight: 800,
          }}
        >
          ← Prev Day
        </button>

        <div
          style={{
            padding: '0.65rem 1rem',
            borderRadius: '999px',
            background: 'var(--color-bg)',
            fontWeight: 800,
            color: 'var(--color-text)',
          }}
        >
          {formatDateLabel(currentDate)}
        </div>

        <button
          type="button"
          onClick={() => pushDate(shiftIsoDate(currentDate, 1))}
          disabled={isToday}
          style={{
            border: '1px solid var(--color-border)',
            background: isToday ? 'var(--color-bg)' : 'white',
            color: isToday ? 'var(--color-text-muted)' : 'var(--color-text)',
            borderRadius: '999px',
            padding: '0.65rem 0.95rem',
            fontWeight: 800,
            opacity: isToday ? 0.7 : 1,
          }}
        >
          Next Day →
        </button>
      </div>

      {!isToday && (
        <button
          type="button"
          onClick={() => pushDate(todayIso)}
          style={{
            border: 'none',
            background: 'var(--color-primary)',
            color: 'white',
            borderRadius: '999px',
            padding: '0.7rem 1rem',
            fontWeight: 800,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          Today
        </button>
      )}
    </section>
  );
}
