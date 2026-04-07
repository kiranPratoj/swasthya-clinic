import { getAdminStats, getClinicQueue, getDoctorForClinic } from '@/app/actions';
import Link from 'next/link';
import DateNavigator from './DateNavigator';

function getPatientDisplayName(patient: unknown): string {
  if (Array.isArray(patient)) {
    const firstPatient = patient[0];
    if (
      firstPatient &&
      typeof firstPatient === 'object' &&
      'name' in firstPatient &&
      typeof firstPatient.name === 'string'
    ) {
      return firstPatient.name;
    }
  }

  if (patient && typeof patient === 'object' && 'name' in patient && typeof patient.name === 'string') {
    return patient.name;
  }

  return 'Patient';
}

function getTodayIsoDate(): string {
  return new Date().toISOString().split('T')[0];
}

function normalizeDateParam(value: string | string[] | undefined): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return getTodayIsoDate();
  }

  return value;
}

export default async function AdminDashboard({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const date = normalizeDateParam(resolvedSearchParams.date);
  const [stats, activeQueue, doctor] = await Promise.all([
    getAdminStats(date),
    getClinicQueue(date),
    getDoctorForClinic(),
  ]);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  const maxCount = Math.max(...Object.values(stats.byHour), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--color-text)' }}>
            Good {greeting}, Dr. {doctor?.name || 'Doctor'}
          </h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Here is what&apos;s happening in your clinic today.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href={`/${slug}/intake`} className="bda-nav-link" style={{ background: 'white' }}>Reception Intake</Link>
          <Link href={`/${slug}/queue`} className="bda-nav-link" style={{ background: 'var(--color-primary)', color: 'white' }}>Doctor Queue</Link>
          <Link href={`/${slug}/settings`} className="bda-nav-link" style={{ background: 'white' }}>Settings</Link>
        </div>
      </header>

      <DateNavigator currentDate={date} />

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem' }}>
        {[
          { label: 'Total Today', value: stats.total, color: 'var(--color-primary)' },
          { label: 'Waiting', value: stats.waiting, color: 'var(--color-gold)' },
          { label: 'Consulting', value: stats.consulting, color: 'var(--color-accent)' },
          { label: 'Done', value: stats.done, color: 'var(--color-text-muted)' },
        ].map((s, i) => (
          <div key={i} style={{ 
            background: 'white', padding: '1.5rem', borderRadius: 'var(--radius-lg)', 
            border: '1px solid var(--color-border)', borderLeft: `4px solid ${s.color}`,
            boxShadow: 'var(--shadow-sm)' 
          }}>
            <p style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{s.label}</p>
            <p style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--color-text)' }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="resp-staff-review" style={{ gap: '2rem', alignItems: 'start' }}>
        {/* Recent Appointments */}
        <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '700' }}>Recent Appointments</h2>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', fontWeight: 700 }}>
                {activeQueue.length} active in queue
              </span>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '1rem' }}>Token</th>
                  <th style={{ padding: '1rem' }}>Patient</th>
                  <th style={{ padding: '1rem' }}>Complaint</th>
                  <th style={{ padding: '1rem' }}>Visit Type</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                  <th style={{ padding: '1rem' }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent.map((a, i) => (
                  <tr key={i} style={{ borderBottom: i === stats.recent.length - 1 ? 'none' : '1px solid var(--color-bg)' }}>
                    <td style={{ padding: '1rem', fontWeight: '700', color: 'var(--color-primary)' }}>#{a.token_number}</td>
                    <td style={{ padding: '1rem', fontWeight: '600' }}>{getPatientDisplayName(a.patient)}</td>
                    <td style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>{a.complaint}</td>
                    <td style={{ padding: '1rem', textTransform: 'capitalize' }}>{a.visit_type}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700',
                        background: (a.status === 'confirmed' || a.status === 'booked') ? 'var(--color-gold-light)' : a.status === 'in_progress' ? 'var(--color-accent-soft)' : a.status === 'completed' ? '#dcfce7' : 'var(--color-primary-soft)',
                        color: (a.status === 'confirmed' || a.status === 'booked') ? 'var(--color-gold)' : a.status === 'in_progress' ? 'var(--color-accent)' : a.status === 'completed' ? '#166534' : 'var(--color-text-muted)'
                      }}>
                        {({'booked': 'Booked', 'confirmed': 'Waiting', 'in_progress': 'Consulting', 'completed': 'Done', 'cancelled': 'Cancelled', 'no_show': 'No Show', 'rescheduled': 'Rescheduled'} as Record<string, string>)[a.status] ?? a.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>
                      {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
                {stats.recent.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                      No appointments yet today.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Chart */}
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '1.5rem' }}>Patients by Hour</h2>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.3rem', height: '120px', borderBottom: '1px solid var(--color-border)', paddingBottom: '0' }}>
            {[9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((h) => {
              const count = stats.byHour[h] || 0;
              const height = count > 0 ? Math.max(8, (count / maxCount) * 100) : 4;
              const label = h <= 12 ? `${h === 12 ? 12 : h}${h < 12 ? 'a' : 'p'}` : `${h - 12}p`;
              return (
                <div key={h} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '0.3rem', justifyContent: 'flex-end', height: '100%' }}>
                  {count > 0 && <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-primary)' }}>{count}</span>}
                  <div style={{
                    width: '100%',
                    background: count > 0 ? 'var(--color-primary)' : 'var(--color-border)',
                    height: `${height}px`,
                    borderRadius: '3px 3px 0 0',
                    opacity: count > 0 ? 1 : 0.4,
                  }} title={`${h}:00 — ${count} patient${count !== 1 ? 's' : ''}`} />
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.4rem' }}>
            {[9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((h) => {
              const label = h === 12 ? '12p' : h < 12 ? `${h}a` : `${h - 12}p`;
              return (
                <div key={h} style={{ flex: 1, textAlign: 'center', fontSize: '0.62rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                  {label}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
