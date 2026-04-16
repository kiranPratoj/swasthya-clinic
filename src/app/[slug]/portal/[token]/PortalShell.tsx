'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import ReportCard from '@/components/reports/ReportCard';
import type { Appointment, Patient, PatientReport, VisitHistory } from '@/lib/types';
import { getPatientPortalBasePath } from '@/lib/patientPortalPath';
import PortalHistoryCard from './PortalHistoryCard';

type TabId = 'appointments' | 'history' | 'reports';

type Props = {
  slug: string;
  patient: Patient;
  upcomingAppointments: Appointment[];
  visitHistory: VisitHistory[];
  reports: PatientReport[];
  canSwitchProfiles?: boolean;
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function statusColor(status: string): { bg: string; fg: string } {
  switch (status) {
    case 'confirmed':
    case 'booked':
      return { bg: 'var(--color-primary-soft)', fg: 'var(--color-primary)' };
    case 'in_progress':
      return { bg: 'var(--color-warning-bg)', fg: 'var(--color-warning)' };
    case 'completed':
      return { bg: 'var(--color-success-bg)', fg: 'var(--color-success)' };
    case 'cancelled':
      return { bg: 'var(--color-error-bg)', fg: 'var(--color-error)' };
    default:
      return { bg: 'var(--color-bg-soft)', fg: 'var(--color-text-muted)' };
  }
}

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'appointments', label: 'Appointments' },
  { id: 'history', label: 'History' },
  { id: 'reports', label: 'Reports' },
];

export default function PortalShell({
  slug,
  patient,
  upcomingAppointments,
  visitHistory,
  reports,
  canSwitchProfiles = false,
}: Props) {
  const pathname = usePathname();
  const portalBasePath = getPatientPortalBasePath(pathname, slug);
  const [activeTab, setActiveTab] = useState<TabId>('appointments');

  return (
    <main className="mobile-content-shell" style={{ padding: '1rem 1rem 5.5rem' }}>
      <div style={{ display: 'grid', gap: '1rem' }}>
        <section
          style={{
            background: 'white',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.1rem 1rem',
            display: 'grid',
            gap: '0.35rem',
          }}
        >
          <p
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--color-primary)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              margin: 0,
            }}
          >
            Patient Portal
          </p>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>{patient.name}</h1>
          {patient.phone && (
            <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', margin: 0 }}>{patient.phone}</p>
          )}
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
            {canSwitchProfiles && (
              <a
                href={`${portalBasePath}?switch=1`}
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  color: 'var(--color-primary)',
                  textDecoration: 'none',
                }}
              >
                Switch profile
              </a>
            )}
            <form
              action={`/api/patient-auth/logout?next=${encodeURIComponent(`${portalBasePath}/login`)}`}
              method="POST"
            >
              <button
                type="submit"
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: 0,
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                }}
              >
                Log out
              </button>
            </form>
          </div>
        </section>

        {activeTab === 'appointments' && (
          <section style={{ display: 'grid', gap: '0.75rem' }}>
            {upcomingAppointments.length === 0 ? (
              <div
                style={{
                  background: 'white',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '1.5rem',
                  textAlign: 'center',
                  color: 'var(--color-text-muted)',
                  fontWeight: 600,
                }}
              >
                No active appointments right now.
              </div>
            ) : (
              upcomingAppointments.map((appointment) => {
                const status = statusColor(appointment.status);
                return (
                  <article
                    key={appointment.id}
                    style={{
                      background: 'white',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-xl)',
                      padding: '1rem',
                      display: 'grid',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <div style={{ display: 'grid', gap: '0.15rem' }}>
                        <h2 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>
                          {formatDate(appointment.booked_for)}
                        </h2>
                        <p style={{ fontSize: '0.86rem', color: 'var(--color-text-muted)', margin: 0 }}>
                          Token #{appointment.token_number}
                        </p>
                      </div>
                      <span
                        style={{
                          padding: '0.28rem 0.65rem',
                          borderRadius: '999px',
                          background: status.bg,
                          color: status.fg,
                          fontWeight: 800,
                          fontSize: '0.74rem',
                          textTransform: 'capitalize',
                        }}
                      >
                        {appointment.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text)' }}>
                      {appointment.complaint}
                    </p>
                  </article>
                );
              })
            )}
          </section>
        )}

        {activeTab === 'history' && (
          <section style={{ display: 'grid', gap: '0.75rem' }}>
            {visitHistory.length === 0 ? (
              <div
                style={{
                  background: 'white',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '1.5rem',
                  textAlign: 'center',
                  color: 'var(--color-text-muted)',
                  fontWeight: 600,
                }}
              >
                No completed visit history yet.
              </div>
            ) : (
              visitHistory.map((visit) => (
                <PortalHistoryCard
                  key={visit.id}
                  date={formatDate(visit.created_at)}
                  summary={visit.summary}
                />
              ))
            )}
          </section>
        )}

        {activeTab === 'reports' && (
          <section style={{ display: 'grid', gap: '0.75rem' }}>
            {reports.length === 0 ? (
              <div
                style={{
                  background: 'white',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '1.5rem',
                  textAlign: 'center',
                  color: 'var(--color-text-muted)',
                  fontWeight: 600,
                }}
              >
                No reports uploaded yet.
              </div>
            ) : (
              reports.map((report) => <ReportCard key={report.id} report={report} />)
            )}
          </section>
        )}
      </div>

      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 'calc(64px + env(safe-area-inset-bottom))',
          paddingBottom: 'env(safe-area-inset-bottom)',
          background: '#ffffff',
          borderTop: '1px solid rgba(3, 78, 162, 0.12)',
          boxShadow: '0 -10px 24px rgba(3, 78, 162, 0.08)',
          display: 'flex',
          alignItems: 'stretch',
          zIndex: 80,
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                fontWeight: 800,
                fontSize: '0.72rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </main>
  );
}
