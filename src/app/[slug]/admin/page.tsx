import { headers } from 'next/headers';
import Link from 'next/link';
import { getDb } from '@/lib/db';
import { getDoctorForClinic } from '@/app/actions';
import DateNavigator from './DateNavigator';
import type { Patient } from '@/lib/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(isoString: string): string {
  const mins = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  return `${mins} min ago`;
}

function getDayLabel(dateStr: string): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const d = new Date(dateStr + 'T12:00:00'); // noon to avoid TZ drift
  return days[d.getDay()];
}

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

function normalizeDateParam(value: string | string[] | undefined): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date().toISOString().split('T')[0];
  }
  return value;
}

function getPatientName(patient: unknown): string {
  if (Array.isArray(patient)) {
    const first = patient[0];
    if (first && typeof first === 'object' && 'name' in first && typeof (first as Patient).name === 'string') {
      return (first as Patient).name;
    }
  }
  if (patient && typeof patient === 'object' && 'name' in patient && typeof (patient as Patient).name === 'string') {
    return (patient as Patient).name;
  }
  return 'Patient';
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    booked: 'waiting',
    confirmed: 'waiting',
    in_progress: 'consulting',
    completed: 'done',
    cancelled: 'cancelled',
    no_show: 'no-show',
    rescheduled: 'rescheduled',
  };
  return map[status] ?? status;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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

  const clinicId = (await headers()).get('x-clinic-id');
  if (!clinicId) {
    return <div style={{ padding: '2rem', color: 'var(--color-error)' }}>Clinic not found.</div>;
  }

  const db = getDb();
  const today = new Date().toISOString().split('T')[0];
  const last7Days = getLast7Days();
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  // ── Parallel DB queries ───────────────────────────────────────────────────
  const [
    todayApptsResult,
    weeklyResult,
    flaggedResult,
    activityResult,
    doctor,
  ] = await Promise.all([
    // 1. Today's appointments for stat cards
    db
      .from('appointments')
      .select('status')
      .eq('clinic_id', clinicId)
      .eq('booked_for', date),

    // 2. Weekly counts — last 7 days
    db
      .from('appointments')
      .select('booked_for')
      .eq('clinic_id', clinicId)
      .in('booked_for', last7Days),

    // 3. Flagged queue: waiting > 30 min (only meaningful when viewing today)
    db
      .from('appointments')
      .select('id, created_at, patient:patients(name)')
      .eq('clinic_id', clinicId)
      .eq('booked_for', today)
      .in('status', ['booked', 'confirmed'])
      .lt('created_at', thirtyMinAgo),

    // 4. Recent activity feed — last 10 by created_at desc
    db
      .from('appointments')
      .select('id, status, created_at, patient:patients(name)')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false })
      .limit(10),

    // 5. Doctor name for greeting
    getDoctorForClinic(),
  ]);

  // ── Stat card counts ──────────────────────────────────────────────────────
  const todayAppts = todayApptsResult.data ?? [];
  const patientsSeen = todayAppts.filter((a) => a.status === 'completed').length;
  const waiting = todayAppts.filter((a) => a.status === 'booked' || a.status === 'confirmed').length;
  const consulting = todayAppts.filter((a) => a.status === 'in_progress').length;
  const noShows = todayAppts.filter((a) => a.status === 'no_show').length;

  // ── Weekly bar chart data ─────────────────────────────────────────────────
  const weeklyAppts = weeklyResult.data ?? [];
  const countByDay: Record<string, number> = {};
  for (const day of last7Days) countByDay[day] = 0;
  for (const a of weeklyAppts) {
    if (a.booked_for in countByDay) countByDay[a.booked_for]++;
  }
  const maxCount = Math.max(...Object.values(countByDay), 1);

  // ── Flagged queue ─────────────────────────────────────────────────────────
  const flaggedAppts = flaggedResult.data ?? [];

  // ── Activity feed ─────────────────────────────────────────────────────────
  const activityItems = activityResult.data ?? [];

  // ── Greeting ──────────────────────────────────────────────────────────────
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--color-text)' }}>
            Good {greeting}, Dr. {doctor?.name || 'Doctor'}
          </h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Here is what&apos;s happening in your clinic today.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href={`/${slug}/intake`} className="bda-nav-link" style={{ background: 'white' }}>Reception Intake</Link>
          <Link href={`/${slug}/queue`} className="bda-nav-link" style={{ background: 'var(--color-primary)', color: 'white' }}>Doctor Queue</Link>
          <Link href={`/${slug}/settings`} className="bda-nav-link" style={{ background: 'white' }}>Settings</Link>
        </div>
      </header>

      <DateNavigator currentDate={date} />

      {/* 1. Stat Cards — 2×2 on mobile, 4×1 on desktop */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '1.25rem',
      }}>
        <style>{`
          @media (min-width: 640px) {
            .admin-stat-grid { grid-template-columns: repeat(4, 1fr) !important; }
          }
        `}</style>
        {[
          { label: 'Patients Seen', value: patientsSeen, color: 'var(--color-accent)' },
          { label: 'Waiting', value: waiting, color: 'var(--color-gold)' },
          { label: 'In Consultation', value: consulting, color: 'var(--color-primary)' },
          { label: 'No-shows', value: noShows, color: 'var(--color-error)' },
        ].map((s, i) => (
          <div key={i} style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            borderLeft: `4px solid ${s.color}`,
            boxShadow: 'var(--shadow-sm)',
          }}>
            <p style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.04em' }}>{s.label}</p>
            <p style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--color-text)' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* 2. Weekly bar chart */}
      <div style={{
        background: 'white',
        padding: '1.5rem',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '1.5rem', color: 'var(--color-text)' }}>This Week</h2>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: '100px' }}>
          {last7Days.map((day) => {
            const count = countByDay[day] ?? 0;
            const barHeight = Math.max(4, (count / maxCount) * 80);
            const isToday = day === today;
            return (
              <div key={day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem', flex: 1 }}>
                {count > 0 && (
                  <span style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--color-primary)' }}>{count}</span>
                )}
                <div style={{
                  height: `${barHeight}px`,
                  width: '28px',
                  background: isToday ? 'var(--color-primary-hover)' : 'var(--color-primary)',
                  borderRadius: '4px 4px 0 0',
                  opacity: count === 0 ? 0.3 : 1,
                }} title={`${getDayLabel(day)} — ${count} appointment${count !== 1 ? 's' : ''}`} />
                <span style={{ fontSize: '0.7rem', fontWeight: '600', color: isToday ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                  {getDayLabel(day)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Flagged queue — only if there are flagged patients, and only for today */}
      {flaggedAppts.length > 0 && (
        <div style={{
          background: 'white',
          borderRadius: 'var(--radius-lg)',
          border: '2px solid var(--color-error)',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #fca5a5', background: '#fef2f2' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--color-error)' }}>
              Flagged — Waiting Over 30 Minutes
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {flaggedAppts.map((appt, i) => {
              const name = getPatientName(appt.patient);
              const waitMins = Math.floor((Date.now() - new Date(appt.created_at).getTime()) / 60000);
              return (
                <div key={appt.id} style={{
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: i < flaggedAppts.length - 1 ? '1px solid #fca5a5' : 'none',
                  background: 'white',
                }}>
                  <span style={{ fontWeight: '700', color: 'var(--color-text)' }}>{name}</span>
                  <span style={{ fontWeight: '700', color: 'var(--color-error)', fontSize: '0.875rem' }}>
                    Waiting {waitMins}m
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Recent activity feed */}
      <div style={{
        background: 'white',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: 'var(--color-text)' }}>Recent Activity</h2>
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {activityItems.length === 0 && (
            <li style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              No activity yet today.
            </li>
          )}
          {activityItems.map((item, i) => {
            const name = getPatientName(item.patient);
            const label = statusLabel(item.status);
            const timeAgo = relativeTime(item.created_at);
            return (
              <li key={item.id} style={{
                padding: '0.875rem 1.25rem',
                borderBottom: i < activityItems.length - 1 ? '1px solid var(--color-border)' : 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap',
              }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--color-text)' }}>
                  <strong>{name}</strong>
                  <span style={{ color: 'var(--color-text-muted)' }}> · {label}</span>
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                  {timeAgo}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
