import Link from 'next/link';

function StethoscopeIcon() {
  return (
    <svg width="60" height="60" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="20" fill="#0891b2"/>
      <path d="M13 12c0-1.1.9-2 2-2h2c1.1 0 2 .9 2 2v6c0 3.3-2.7 6-6 6v2c0 2.2 1.8 4 4 4s4-1.8 4-4v-1.1c1.7-.4 3-2 3-3.9V14" 
            stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="27" cy="13" r="2" stroke="white" strokeWidth="1.8"/>
    </svg>
  );
}

export default function HomePage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem', paddingBottom: '4rem' }}>
      {/* Hero Section */}
      <section style={{ textAlign: 'center', padding: '4rem 1rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
        <StethoscopeIcon />
        <h1 style={{ fontSize: 'clamp(2.5rem, 8vw, 4rem)', fontWeight: 850, color: 'var(--color-text)', lineHeight: 1.1, maxWidth: '900px', letterSpacing: '-0.02em' }}>
          Run your clinic. <span style={{ color: 'var(--color-primary)' }}>Not your paperwork.</span>
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.25rem', maxWidth: '640px', lineHeight: 1.6 }}>
          Voice-first patient intake in Kannada & English. Live queue management. Token cards. Built for Indian tier-1 and tier-2 clinics.
        </p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '1rem' }}>
          <Link href="/onboard" style={{
            padding: '1rem 2rem', background: 'var(--color-primary)', color: 'white',
            borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '1.125rem', textDecoration: 'none',
            boxShadow: 'var(--shadow-md)'
          }}>
            Register Your Clinic →
          </Link>
          <Link href="/drpriya/admin" style={{
            padding: '1rem 2rem', background: 'white', color: 'var(--color-primary)',
            borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '1.125rem', textDecoration: 'none',
            border: '2px solid var(--color-primary-outline)'
          }}>
            View Live Demo →
          </Link>
        </div>
      </section>

      {/* How it works strip */}
      <section style={{ background: 'white', borderY: '1px solid var(--color-border)', padding: '3rem 1rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
          {[
            { step: '1', title: 'Speak', desc: 'Receptionist speaks — patient registered in seconds' },
            { step: '2', title: 'Triage', desc: 'Doctor sees live queue — marks tokens done in one tap' },
            { step: '3', title: 'Printed', desc: 'Patient gets printed token — knows exactly where they stand' },
          ].map((item) => (
            <div key={item.step} style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
              <div style={{ 
                width: '3rem', height: '3rem', borderRadius: '50%', background: 'var(--color-primary-soft)', 
                color: 'var(--color-primary)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: '1.25rem', flexShrink: 0
              }}>{item.step}</div>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.25rem' }}>{item.title}</h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9375rem', lineHeight: 1.5 }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Grid */}
      <section style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 800, marginBottom: '3rem' }}>Everything your clinic needs</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {[
            { icon: '🎙️', title: 'Voice intake', desc: 'Speak naturally in Kannada or English to register patients.' },
            { icon: '⚡', title: 'Live queue', desc: 'Realtime updates for doctor and receptionist consoles.' },
            { icon: '🎫', title: 'Printable tokens', desc: 'Generate physical tokens for easy patient tracking.' },
            { icon: '🏢', title: 'Multi-clinic', desc: 'One platform for multiple locations and doctor profiles.' },
            { icon: '📱', title: 'Works on any device', desc: 'Optimized for tablets, mobiles, and desktop browsers.' },
            { icon: '☁️', title: 'No app download', desc: 'Web-based access for immediate deployment.' },
          ].map((feature) => (
            <div key={feature.title} style={{ padding: '2rem', background: 'white', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', transition: 'transform 0.2s' }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>{feature.icon}</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>{feature.title}</h3>
              <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.6 }}>{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--color-border)', paddingTop: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <p style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>
          Built with <span style={{ color: 'var(--color-text)' }}>Sarvam AI · Supabase · Next.js</span>
        </p>
        <a href="https://github.com/kiranPratoj/swasthya-clinic" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
          View on GitHub →
        </a>
      </footer>
    </div>
  );
}
