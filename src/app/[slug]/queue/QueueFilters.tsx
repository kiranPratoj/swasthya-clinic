'use client';

import { useEffect, useMemo, useState } from 'react';
import type { QueueItem } from '@/lib/types';

type QueueFiltersProps = {
  queue: QueueItem[];
  onFiltered: (filtered: QueueItem[]) => void;
};

type FilterKey = 'all' | 'waiting' | 'consulting' | 'done';

const FILTER_LABELS: Record<FilterKey, string> = {
  all: 'All',
  waiting: 'Waiting',
  consulting: 'Consulting',
  done: 'Done',
};

function matchesStatus(item: QueueItem, status: FilterKey): boolean {
  if (status === 'all') {
    return true;
  }

  return item.status === status;
}

function getCount(queue: QueueItem[], status: FilterKey): number {
  if (status === 'all') {
    return queue.length;
  }

  return queue.filter((item) => item.status === status).length;
}

export default function QueueFilters({ queue, onFiltered }: QueueFiltersProps) {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  const counts = useMemo(
    () => ({
      all: getCount(queue, 'all'),
      waiting: getCount(queue, 'waiting'),
      consulting: getCount(queue, 'consulting'),
      done: getCount(queue, 'done'),
    }),
    [queue]
  );

  useEffect(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = queue.filter((item) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        item.patient.name.toLowerCase().includes(normalizedQuery) ||
        String(item.token_number).includes(normalizedQuery);

      return matchesQuery && matchesStatus(item, activeFilter);
    });

    onFiltered(filtered);
  }, [activeFilter, onFiltered, query, queue]);

  return (
    <section
      style={{
        background: 'white',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--color-border)',
        padding: '1rem',
        boxShadow: 'var(--shadow-sm)',
        display: 'grid',
        gap: '0.9rem',
      }}
    >
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by patient name or token number"
        aria-label="Search queue"
      />

      <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
        {(['all', 'waiting', 'consulting', 'done'] as FilterKey[]).map((filterKey) => {
          const isActive = activeFilter === filterKey;
          return (
            <button
              key={filterKey}
              type="button"
              onClick={() => setActiveFilter(filterKey)}
              style={{
                border: isActive ? 'none' : '1px solid var(--color-border)',
                background: isActive ? 'var(--color-primary)' : 'white',
                color: isActive ? 'white' : 'var(--color-text)',
                borderRadius: '999px',
                padding: '0.65rem 0.95rem',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
              }}
            >
              <span>{FILTER_LABELS[filterKey]}</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '1.6rem',
                  height: '1.6rem',
                  borderRadius: '999px',
                  background: isActive ? 'rgba(255, 255, 255, 0.18)' : 'var(--color-bg)',
                  color: 'inherit',
                  fontSize: '0.8rem',
                }}
              >
                {counts[filterKey]}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
