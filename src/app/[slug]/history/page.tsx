import { getPatientHistory } from '@/app/actions';
import type { Appointment } from '@/lib/types';

export default async function HistoryPage({
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ phone?: string }>;
}) {
  const { phone } = await searchParams;
  let appointments: Appointment[] = [];
  
  if (phone) {
    appointments = await getPatientHistory(phone);
  }

  const patient = appointments.length > 0 ? appointments[0].patient : null;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '4rem' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '0.5rem' }}>Patient History</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1rem' }}>Look up any patient&apos;s visit record</p>
      </header>

      <form method="GET" style={{ display: 'flex', gap: '0.75rem', marginBottom: '3rem', background: 'white', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ flex: 1 }}>
          <label htmlFor="phone" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Search by Phone Number</label>
          <input 
            type="tel" 
            id="phone" 
            name="phone" 
            placeholder="e.g. 9876543210" 
            defaultValue={phone}
            required 
            pattern="[0-9]{10}"
            style={{ width: '100%', padding: '0.75rem 1rem', fontSize: '1rem' }}
          />
        </div>
        <button 
          type="submit" 
          style={{ alignSelf: 'flex-end', padding: '0.75rem 2rem', height: '46px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 700, cursor: 'pointer' }}
        >
          Search
        </button>
      </form>

      {!phone && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'white', borderRadius: 'var(--radius-xl)', border: '1px dashed var(--color-border)' }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-outline)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1.5rem' }}>
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            <path d="M9 14h6" />
            <path d="M9 18h6" />
            <path d="M9 10h6" />
          </svg>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.5rem' }}>Start your search</h3>
          <p style={{ color: 'var(--color-text-muted)' }}>Enter a 10-digit mobile number above to view visit history.</p>
        </div>
      )}

      {phone && appointments.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--color-bg)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.5rem' }}>No records found</h3>
          <p style={{ color: 'var(--color-text-muted)' }}>No visit history matches the number <strong>{phone}</strong>.</p>
        </div>
      )}

      {phone && appointments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ background: 'var(--color-primary-soft)', padding: '1.5rem 2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-primary-outline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>{patient?.name || 'Unknown Patient'}</h2>
              <p style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>{patient?.age ? `${patient.age} years` : 'Age not recorded'} · {phone}</p>
            </div>
            <div style={{ background: 'white', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-primary-outline)', fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              {appointments.length} visit{appointments.length !== 1 ? 's' : ''}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative' }}>
            {/* Timeline Line */}
            <div style={{ position: 'absolute', left: '20px', top: '0', bottom: '0', width: '2px', background: 'var(--color-border)', zIndex: 0 }}></div>
            
            {appointments.map((appt) => (
              <div key={appt.id} style={{ display: 'flex', gap: '1.5rem', position: 'relative', zIndex: 1 }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'white', border: '2px solid var(--color-primary)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-primary)' }}></div>
                </div>
                
                <div style={{ flex: 1, background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--color-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                        {new Date(appt.booked_for).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, color: 'var(--color-text)' }}>Token #{appt.token_number}</span>
                        <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'var(--color-primary-soft)', color: 'var(--color-primary)', fontWeight: 700, textTransform: 'uppercase' }}>
                          {appt.visit_type}
                        </span>
                      </div>
                    </div>
                    <span style={{ 
                      padding: '0.3rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase',
                      background: appt.status === 'completed' ? 'var(--color-success-bg)' : appt.status === 'confirmed' ? 'var(--color-warning-bg)' : 'var(--color-bg)',
                      color: appt.status === 'completed' ? 'var(--color-success)' : appt.status === 'confirmed' ? 'var(--color-warning)' : 'var(--color-text-muted)'
                    }}>
                      {appt.status}
                    </span>
                  </div>
                  
                  <div style={{ padding: '1.25rem' }}>
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Chief Complaint</div>
                      <p style={{ color: 'var(--color-text)', lineHeight: 1.5 }}>{appt.complaint}</p>
                    </div>
                    
                    {appt.notes && (
                      <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: 'var(--radius-md)', borderLeft: '4px solid #cbd5e1' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Clinical Notes</div>
                        <p style={{ color: '#334155', fontSize: '0.9375rem', fontStyle: 'italic', lineHeight: 1.6 }}>&quot;{appt.notes}&quot;</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
