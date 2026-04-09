import { getAdminStats, getRecentActivity } from '@/app/actions';
import DateNavigator from './DateNavigator';

function getRelativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const stats = await getAdminStats(date);
  const activity = await getRecentActivity(10);

  const selectedDate = date || new Date().toISOString().split('T')[0];
  const maxTrend = Math.max(...stats.trend.map(t => t.count), 1);

  return (
    <main style={{ padding: '2rem 1rem 5rem' }}>
      <div className="max-w-6xl" style={{ display: 'grid', gap: '2rem' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Clinic Analytics</h1>
            <p style={{ color: 'var(--color-text-muted)' }}>Real-time performance and queue health.</p>
          </div>
          <DateNavigator currentDate={selectedDate} />
        </header>

        {/* Top KPIs */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1rem' 
        }}>
          <div className="card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Patients Seen</p>
            <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.done}</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-success)' }}>{Math.round((stats.done / (stats.total || 1)) * 100)}% completion rate</p>
          </div>
          <div className="card" style={{ borderLeft: '4px solid var(--color-gold)' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Currently Waiting</p>
            <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.waiting}</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Avg wait: {stats.avgWaitMins} mins</p>
          </div>
          <div className="card" style={{ borderLeft: '4px solid #94a3b8' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>No-Shows</p>
            <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.noShows}</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-error)' }}>{Math.round((stats.noShows / (stats.total || 1)) * 100)}% rate</p>
          </div>
          <div className="card" style={{ borderLeft: '4px solid var(--color-accent)' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Utilization</p>
            <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.utilization}%</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Capacity filled</p>
          </div>
        </div>

        {/* Weekly Trend & Flagged Queue */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          <section className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.5rem' }}>Weekly Appointment Trend</h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: '150px', padding: '0 0.5rem' }}>
              {stats.trend.map((t) => (
                <div key={t.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ 
                    width: '100%', 
                    height: `${(t.count / maxTrend) * 100}%`, 
                    background: 'var(--color-primary)', 
                    borderRadius: '4px 4px 0 0',
                    minHeight: t.count > 0 ? '4px' : '0'
                  }} title={`${t.count} appointments`} />
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-text-muted)', transform: 'rotate(-45deg)', marginTop: '0.5rem' }}>
                    {new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {stats.flagged.length > 0 && (
            <section className="card" style={{ background: 'var(--color-error-bg)', border: '1px solid #fca5a5' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--color-error)' }}>⚠️ Flagged Queue</h3>
              <p style={{ fontSize: '0.85rem', color: '#991b1b', marginBottom: '1rem' }}>Patients waiting over 30 minutes:</p>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {stats.flagged.map((f, i) => (
                  <div key={i} style={{ background: 'white', padding: '0.75rem', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700 }}>{f.name}</span>
                    <span style={{ color: 'var(--color-error)', fontWeight: 800, fontSize: '0.9rem' }}>{f.waitTime}m wait</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Recent Activity */}
        <section className="card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.25rem' }}>Recent Activity Feed</h3>
          <div style={{ display: 'grid', gap: '0.1rem' }}>
            {activity.map((a) => (
              <div key={a.id} style={{ 
                padding: '0.8rem 0', 
                borderBottom: '1px solid var(--color-bg)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <div>
                  <strong style={{ fontSize: '0.95rem' }}>{a.patientName}</strong>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    Status flipped: <span style={{ textTransform: 'capitalize' }}>{a.oldStatus.replace('_', ' ')}</span> → <span style={{ color: 'var(--color-primary)', fontWeight: 700, textTransform: 'capitalize' }}>{a.newStatus.replace('_', ' ')}</span>
                  </p>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                  {getRelativeTime(a.timestamp)}
                </span>
              </div>
            ))}
            {activity.length === 0 && (
              <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>No recent activity.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
