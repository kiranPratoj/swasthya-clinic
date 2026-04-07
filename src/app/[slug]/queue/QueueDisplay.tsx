'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { getClinicQueue, updateAppointmentStatus } from '@/app/actions';
import type { AppointmentStatus, QueueItem } from '@/lib/types';
import AppointmentActions from './AppointmentActions';
import AppointmentActionsMenu from './AppointmentActionsMenu';
import NewPatientToast from './NewPatientToast';
import QueueFilters from './QueueFilters';

type QueueDisplayProps = {
  initialQueue: QueueItem[];
  clinicId: string;
};

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatVisitType(value: QueueItem['visit_type']): string {
  return value
    .split('-')
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function isAppointmentStatus(value: unknown): value is AppointmentStatus {
  return value === 'booked' || value === 'confirmed' || value === 'in_progress' || value === 'completed' || value === 'cancelled' || value === 'no_show' || value === 'rescheduled';
}

function getTokenCircleColor(status: AppointmentStatus): string {
  if (status === 'in_progress') {
    return '#f59e0b';
  }

  if (status === 'completed') {
    return '#16a34a';
  }

  return '#0891b2';
}

function getActionConfig(status: AppointmentStatus): {
  label: string;
  nextStatus: AppointmentStatus | null;
  background: string;
  disabled: boolean;
} {
  if (status === 'in_progress') {
    return {
      label: 'Mark Done',
      nextStatus: 'completed',
      background: '#16a34a',
      disabled: false,
    };
  }

  if (status === 'completed') {
    return {
      label: 'Done ✓',
      nextStatus: null,
      background: '#94a3b8',
      disabled: true,
    };
  }

  if (status !== 'confirmed' && status !== 'booked') {
    return {
      label: 'Status Locked',
      nextStatus: null,
      background: '#94a3b8',
      disabled: true,
    };
  }

  return {
    label: 'Start Consulting',
    nextStatus: 'in_progress',
    background: '#0891b2',
    disabled: false,
  };
}

export default function QueueDisplay({
  initialQueue,
  clinicId,
}: QueueDisplayProps) {
  const [queue, setQueue] = useState(initialQueue);
  const [filteredQueue, setFilteredQueue] = useState(initialQueue);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toastQueue, setToastQueue] = useState<Array<{ id: string; token: number; name: string }>>([]);
  const queueRef = useRef(initialQueue);

  useEffect(() => {
    setQueue(initialQueue);
    setFilteredQueue(initialQueue);
  }, [initialQueue]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!clinicId || !url || !anonKey) {
      return;
    }

    const supabase = createClient(url, anonKey);

    async function refreshQueueFromServer() {
      const latestQueue = await getClinicQueue();
      const currentIds = new Set(queueRef.current.map((item) => item.id));
      const newItems = latestQueue
        .filter((item) => !currentIds.has(item.id))
        .map((item) => ({
          id: item.id,
          token: item.token_number,
          name: item.patient.name,
        }));

      setQueue(latestQueue);

      if (newItems.length > 0) {
        setToastQueue((current) => [...current, ...newItems]);
      }
    }

    const channel = supabase
      .channel(`clinic-queue-${clinicId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments',
          filter: `clinic_id=eq.${clinicId}`,
        },
        () => {
          void refreshQueueFromServer();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
          filter: `clinic_id=eq.${clinicId}`,
        },
        (payload) => {
          const nextRecord = payload.new;
          const nextId = typeof nextRecord.id === 'string' ? nextRecord.id : null;
          const nextStatus = isAppointmentStatus(nextRecord.status) ? nextRecord.status : null;

          if (!nextId || !nextStatus) {
            void refreshQueueFromServer();
            return;
          }

          setQueue((currentQueue) => {
            let matched = false;

            const nextQueue = currentQueue.map((item) => {
              if (item.id !== nextId) {
                return item;
              }

              matched = true;
              return {
                ...item,
                status: nextStatus,
              };
            });

            if (!matched) {
              void refreshQueueFromServer();
              return currentQueue;
            }

            return nextQueue;
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [clinicId]);

  async function handleStatusChange(item: QueueItem) {
    const action = getActionConfig(item.status);
    if (!action.nextStatus || action.disabled) {
      return;
    }

    const nextStatus = action.nextStatus;

    const previousQueue = queue;
    setActionError(null);
    setPendingId(item.id);
    setQueue((currentQueue) =>
      currentQueue.map((entry) =>
        entry.id === item.id
          ? {
              ...entry,
              status: nextStatus,
            }
          : entry
      )
    );

    try {
      await updateAppointmentStatus(item.id, nextStatus);
    } catch (error: unknown) {
      setQueue(previousQueue);
      setActionError(
        error instanceof Error && error.message.trim()
          ? error.message
          : 'Could not update the appointment status.'
      );
    } finally {
      setPendingId(null);
    }
  }

  const sortedQueue = [...filteredQueue].sort((left, right) => left.token_number - right.token_number);
  const todayLabel = formatDateLabel(new Date());

  return (
    <section style={{ display: 'grid', gap: '1.5rem' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'grid', gap: '0.35rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Today&apos;s Queue</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>{todayLabel}</p>
        </div>

        <div
          style={{
            alignSelf: 'flex-start',
            background: 'white',
            border: '1px solid var(--color-border)',
            borderRadius: '999px',
            padding: '0.65rem 1rem',
            fontWeight: 700,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {sortedQueue.length} patients
        </div>
      </header>

      <QueueFilters queue={queue} onFiltered={setFilteredQueue} />

      {actionError && (
        <div
          style={{
            background: 'var(--color-error-bg)',
            border: '1px solid #fca5a5',
            borderRadius: 'var(--radius-lg)',
            padding: '0.9rem 1rem',
            color: 'var(--color-error)',
            fontWeight: 600,
          }}
        >
          {actionError}
        </div>
      )}

      <NewPatientToast
        items={toastQueue}
        onDismiss={(id) => {
          setToastQueue((current) => current.filter((item) => item.id !== id));
        }}
      />

      {sortedQueue.length === 0 ? (
        <div
          style={{
            minHeight: '18rem',
            display: 'grid',
            placeItems: 'center',
            background: 'white',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-sm)',
            textAlign: 'center',
            padding: '2rem',
          }}
        >
          <div style={{ display: 'grid', gap: '0.45rem' }}>
            <p style={{ fontSize: '1.15rem', fontWeight: 800 }}>No patients in queue today</p>
            <p style={{ color: 'var(--color-text-muted)' }}>ಇಂದು ಯಾವ ರೋಗಿಗಳೂ ಇಲ್ಲ</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {sortedQueue.map((item) => {
            const action = getActionConfig(item.status);
            const isPending = pendingId === item.id;

            return (
              <article
                key={item.id}
                style={{
                  background: 'white',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-xl)',
                  boxShadow: 'var(--shadow-sm)',
                  padding: '1.25rem',
                  display: 'grid',
                  gap: '1rem',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr',
                    gap: '1rem',
                    alignItems: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '4.6rem',
                      height: '4.6rem',
                      borderRadius: '999px',
                      background: getTokenCircleColor(item.status),
                      color: 'white',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: '1.4rem',
                      fontWeight: 800,
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    {item.token_number}
                  </div>

                  <div style={{ display: 'grid', gap: '0.35rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                        {item.patient.name}
                      </h2>
                      {typeof item.patient.age === 'number' && (
                        <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>
                          Age {item.patient.age}
                        </span>
                      )}
                    </div>

                    <p style={{ color: 'var(--color-text-muted)' }}>{item.complaint}</p>

                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '0.35rem 0.65rem',
                          borderRadius: '999px',
                          background: 'var(--color-primary-soft)',
                          color: 'var(--color-primary)',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                        }}
                      >
                        {formatVisitType(item.visit_type)}
                      </span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '0.35rem 0.65rem',
                          borderRadius: '999px',
                          background:
                            item.status === 'in_progress'
                              ? '#fef3c7'
                              : item.status === 'completed'
                                ? '#dcfce7'
                                : '#e0f2fe',
                          color:
                            item.status === 'in_progress'
                              ? '#b45309'
                              : item.status === 'completed'
                                ? '#166534'
                                : '#0369a1',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          textTransform: 'capitalize',
                        }}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gap: '0.75rem',
                      justifyItems: 'end',
                    }}
                  >
                    <button
                      type="button"
                      disabled={action.disabled || isPending}
                      onClick={() => void handleStatusChange(item)}
                      style={{
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.9rem 1.15rem',
                        minWidth: '10.5rem',
                        background: action.background,
                        color: 'white',
                        fontWeight: 800,
                        opacity: action.disabled ? 0.8 : 1,
                        boxShadow: 'var(--shadow-sm)',
                      }}
                    >
                      {isPending ? 'Updating...' : action.label}
                    </button>

                    {item.status !== 'completed' && (
                      <AppointmentActionsMenu
                        appointmentId={item.id}
                        currentStatus={item.status}
                        patientName={item.patient.name}
                      />
                    )}

                    <AppointmentActions appointmentId={item.id} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
