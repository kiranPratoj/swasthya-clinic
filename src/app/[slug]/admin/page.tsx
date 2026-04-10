import { headers } from 'next/headers';
import Link from 'next/link';
import { getDb } from '@/lib/db';

export default async function AdminDashboard({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const headerList = await headers();
  const clinicId = headerList.get('x-clinic-id');

  if (!clinicId) {
    return <div style={{ padding: '2rem' }}>Clinic ID missing</div>;
  }

  const db = getDb();
  
  // Use local ISO date format (YYYY-MM-DD) for today
  const today = new Date().toLocaleDateString('en-CA');

  // Fetch doctor name
  const { data: doctor } = await db
    .from('doctors')
    .select('name')
    .eq('clinic_id', clinicId)
    .single();

  const doctorName = doctor?.name || 'Doctor';

  // Fetch today's appointments
  const { data: todayApptsData } = await db
    .from('appointments')
    .select('*, patient:patients(name)')
    .eq('clinic_id', clinicId)
    .eq('booked_for', today);

  const todayAppts = todayApptsData || [];

  const totalPatients = todayAppts.length;
  // Status check based on database enum
  const waiting = todayAppts.filter(a => ['booked', 'confirmed'].includes(a.status)).length;
  const consulting = todayAppts.filter(a => a.status === 'in_progress').length;
  const doneToday = todayAppts.filter(a => a.status === 'completed').length;

  // Patients by hour (9am to 6pm in 1-hour buckets)
  // X axis: 9am to 6pm (10 buckets: 9, 10, 11, 12, 13, 14, 15, 16, 17, 18)
  const hourBuckets = new Array(10).fill(0);
  todayAppts.forEach(appt => {
    // using created_at to determine hour
    const dateObj = new Date(appt.created_at);
    const hour = dateObj.getHours(); // 0 to 23
    if (hour >= 9 && hour <= 18) {
      hourBuckets[hour - 9]++;
    }
  });

  const maxCount = Math.max(...hourBuckets, 1);

  // Recent 10 appointments
  const { data: recentApptsData } = await db
    .from('appointments')
    .select('*, patient:patients(name)')
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false })
    .limit(10);

  const recentAppts = recentApptsData || [];

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good morning' : 'Good afternoon';

  return (
    <main style={{ padding: '2rem 1rem', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '800', margin: 0, color: 'var(--color-text)' }}>
          {greeting}, Dr. {doctorName}
        </h1>
        
        {/* Quick Links */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link href={`/${slug}/intake`} style={{ padding: '0.5rem 1rem', background: 'var(--color-primary)', color: 'white', borderRadius: 'var(--radius-md)', textDecoration: 'none', fontWeight: '600', fontSize: '0.875rem' }}>
            Reception Intake
          </Link>
          <Link href={`/${slug}/queue`} style={{ padding: '0.5rem 1rem', background: 'var(--color-primary)', color: 'white', borderRadius: 'var(--radius-md)', textDecoration: 'none', fontWeight: '600', fontSize: '0.875rem' }}>
            Doctor Queue
          </Link>
          <Link href={`/${slug}/settings`} style={{ padding: '0.5rem 1rem', background: 'white', color: 'var(--color-primary)', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-md)', textDecoration: 'none', fontWeight: '600', fontSize: '0.875rem' }}>
            Settings
          </Link>
        </div>
      </header>

      {/* Today's stats row */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div style={{ padding: '1.5rem', background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: '800' }}>Total patients today</div>
          <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--color-primary)' }}>{totalPatients}</div>
        </div>
        <div style={{ padding: '1.5rem', background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: '800' }}>Currently waiting</div>
          <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--color-gold)' }}>{waiting}</div>
        </div>
        <div style={{ padding: '1.5rem', background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: '800' }}>Currently consulting</div>
          <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--color-accent)' }}>{consulting}</div>
        </div>
        <div style={{ padding: '1.5rem', background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: '800' }}>Done today</div>
          <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--color-success)' }}>{doneToday}</div>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        {/* Patients by hour bar chart */}
        <section style={{ padding: '1.5rem', background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '2rem', color: 'var(--color-text)' }}>Patients by Hour</h2>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: '100px', position: 'relative' }}>
            {hourBuckets.map((count, i) => {
              const height = (count / maxCount) * 80;
              const hour = i + 9;
              const hourLabel = hour > 12 ? `${hour - 12}pm` : (hour === 12 ? '12pm' : `${hour}am`);
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100px' }}>
                  <div style={{ 
                    width: '100%', 
                    height: `${height}px`, 
                    background: 'var(--color-primary)', 
                    borderRadius: '4px 4px 0 0', 
                    minHeight: count > 0 ? '4px' : '0' 
                  }} title={`${count} patients at ${hourLabel}`}></div>
                  <div style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                    {hourLabel}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Recent 10 appointments table */}
        <section style={{ padding: '1.5rem', background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem', color: 'var(--color-text)' }}>Recent 10 Appointments</h2>
          <div style={{ overflowX: 'auto', margin: '-1.5rem', padding: '1.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                  <th style={{ padding: '0.75rem', fontWeight: '700' }}>Token</th>
                  <th style={{ padding: '0.75rem', fontWeight: '700' }}>Patient</th>
                  <th style={{ padding: '0.75rem', fontWeight: '700' }}>Complaint</th>
                  <th style={{ padding: '0.75rem', fontWeight: '700' }}>Status</th>
                  <th style={{ padding: '0.75rem', fontWeight: '700' }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentAppts.map((appt) => {
                  let statusBg = 'var(--color-bg)';
                  let statusColor = 'var(--color-text)';
                  if (appt.status === 'completed') { statusBg = 'var(--color-success)'; statusColor = 'white'; }
                  if (['booked', 'confirmed'].includes(appt.status)) { statusBg = 'var(--color-gold-light)'; statusColor = 'var(--color-warning)'; }
                  if (appt.status === 'in_progress') { statusBg = 'var(--color-primary)'; statusColor = 'white'; }
                  if (['cancelled', 'no_show'].includes(appt.status)) { statusBg = 'var(--color-error-bg)'; statusColor = 'var(--color-error)'; }

                  return (
                    <tr key={appt.id} style={{ borderBottom: '1px solid var(--color-bg)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: '800', color: 'var(--color-text)' }}>#{appt.token_number}</td>
                      <td style={{ padding: '0.75rem', fontWeight: '500' }}>{appt.patient?.name || 'Unknown'}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--color-text-muted)' }}>{appt.complaint}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{ 
                          padding: '0.25rem 0.5rem', 
                          borderRadius: 'var(--radius-sm)', 
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          background: statusBg,
                          color: statusColor,
                          textTransform: 'capitalize',
                          whiteSpace: 'nowrap'
                        }}>
                          {appt.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(appt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  );
                })}
                {recentAppts.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontWeight: '500' }}>
                      No recent appointments found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
