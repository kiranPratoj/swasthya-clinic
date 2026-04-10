import Link from 'next/link';
import BrandMark from '@/components/BrandMark';

export default function HomePage() {
  const workstreams = [
    'Voice intake for the front desk',
    'Realtime queue for the doctor',
    'Patient tokens and mobile follow-up',
  ];

  const sections = [
    {
      title: 'Reception',
      body: 'Register patients in Kannada, Hindi, or English and move them into the queue without typing every field.',
    },
    {
      title: 'Doctor Console',
      body: 'Track today’s queue, consult patients in sequence, and keep the waiting room informed in real time.',
    },
    {
      title: 'Patient View',
      body: 'Share token status, booking links, and issue-raising flows from the same clinic system.',
    },
  ];

  return (
    <div style={{ paddingBottom: '4.5rem' }}>
      <section
        style={{
          position: 'relative',
          overflow: 'hidden',
          marginLeft: 'calc(50% - 50vw)',
          marginRight: 'calc(50% - 50vw)',
          background: 'linear-gradient(90deg, #ffffff 0%, #f8fbff 42%, #eef5ff 100%)',
          borderBottom: '1px solid rgba(3, 78, 162, 0.08)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-5rem',
            right: '-7rem',
            width: '24rem',
            height: '24rem',
            borderRadius: '999px',
            background: 'radial-gradient(circle, rgba(227, 6, 19, 0.2) 0%, rgba(227, 6, 19, 0) 72%)',
          }}
        />
        <div className="max-w-7xl px-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '2rem', alignItems: 'stretch', paddingTop: '4.5rem', paddingBottom: '3.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem', justifyContent: 'center', minWidth: 0 }}>
            <div className="nh-eyebrow">Clinic operations platform</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <BrandMark size={70} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <span style={{ color: 'var(--color-error)', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.78rem' }}>
                  Voice-first OPD
                </span>
                <span style={{ color: 'var(--color-primary)', fontWeight: 800, fontSize: '1.05rem' }}>
                  Swasthya Clinic
                </span>
              </div>
            </div>
            <h1 style={{ fontSize: 'clamp(2.75rem, 7vw, 4.9rem)', fontWeight: 800, color: 'var(--color-primary)', lineHeight: 1.03, letterSpacing: '-0.04em', maxWidth: '10ch' }}>
              Faster intake. Clearer queues. Better clinic flow.
            </h1>
            <p style={{ color: 'var(--color-text)', fontSize: '1.2rem', maxWidth: '40rem', lineHeight: 1.65 }}>
              A hospital-blue shell for your clinic app: strong hierarchy, disciplined surfaces, and patient-facing flows built for reception, doctors, and waiting rooms.
            </p>
            <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
              <Link href="/onboard" className="nh-btn nh-btn-primary">
                Register Clinic
              </Link>
              <Link href="/login" className="nh-btn nh-btn-secondary">
                Staff Login
              </Link>
            </div>
          </div>

          <aside
            style={{
              background: 'var(--color-primary)',
              color: '#fff',
              borderRadius: '20px',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-md)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '100%',
              gap: '1.5rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.82, marginBottom: '0.8rem' }}>
                One system, three workstreams
              </div>
              <div style={{ display: 'grid', gap: '1rem' }}>
                {workstreams.map((item) => (
                  <div key={item} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.16)' }}>
                    <p style={{ fontSize: '1.05rem', fontWeight: 700, lineHeight: 1.45 }}>{item}</p>
                    <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>→</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.78rem', opacity: 0.8 }}>Default launch path</span>
              <strong style={{ fontSize: '1.1rem' }}>Onboard clinic → Login → Intake → Queue</strong>
            </div>
          </aside>
        </div>
      </section>

      <section className="max-w-7xl px-4" style={{ marginTop: '-1.5rem', position: 'relative', zIndex: 2 }}>
        <div
          style={{
            background: 'var(--color-primary)',
            color: '#fff',
            borderRadius: '18px',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-md)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          }}
        >
          <div style={{ padding: '1.75rem 1.6rem', borderRight: '1px solid rgba(255,255,255,0.12)' }}>
            <div style={{ fontSize: '0.95rem', opacity: 0.82, marginBottom: '0.35rem' }}>I’m working in</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800 }}>Reception / Doctor / Patient</div>
          </div>
          <div style={{ padding: '1.75rem 1.6rem', borderRight: '1px solid rgba(255,255,255,0.12)' }}>
            <div style={{ fontSize: '0.95rem', opacity: 0.82, marginBottom: '0.35rem' }}>Start with</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>Onboarding or staff sign-in</div>
          </div>
          <div style={{ padding: '1.2rem', background: 'rgba(255,255,255,0.18)', display: 'grid', placeItems: 'center' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
              <Link href="/onboard" className="nh-btn nh-btn-secondary" style={{ background: '#fff' }}>
                Register Clinic
              </Link>
              <Link href="/login" className="nh-btn nh-btn-secondary" style={{ background: 'transparent', borderColor: 'rgba(255,255,255,0.26)', color: '#fff' }}>
                Open Console
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl px-4" style={{ paddingTop: '4.5rem', display: 'grid', gap: '3rem' }}>
        <div style={{ display: 'grid', gap: '0.75rem', maxWidth: '46rem' }}>
          <div className="nh-eyebrow">Designed for real clinic work</div>
          <h2 style={{ fontSize: '2.35rem', fontWeight: 800, lineHeight: 1.08, letterSpacing: '-0.03em' }}>
            Built around the front desk, the doctor, and the patient handoff.
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '1.02rem', lineHeight: 1.7 }}>
            The UI keeps the same palette and contrast logic throughout the app: blue for action and orientation, white for working surfaces, grey for clinical readability, and red only where urgency matters.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
          {sections.map((section) => (
            <div key={section.title} style={{ paddingBottom: '1.2rem', borderBottom: '1px solid var(--color-divider)' }}>
              <div className="nh-eyebrow" style={{ marginBottom: '0.6rem' }}>{section.title}</div>
              <p style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.55rem' }}>{section.title}</p>
              <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.7 }}>{section.body}</p>
            </div>
          ))}
        </div>

        <div className="nh-panel" style={{ padding: '1.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ display: 'grid', gap: '0.55rem' }}>
            <div className="nh-eyebrow">Deployment posture</div>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 800, lineHeight: 1.15 }}>Start with one clinic. Expand to multiple locations from the same product shell.</h3>
            <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
              Keep the operations consistent across clinics while preserving each clinic slug, doctor roster, queue, settings, and patient-facing links.
            </p>
          </div>
          <div style={{ display: 'grid', gap: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.8rem', borderBottom: '1px solid var(--color-primary-outline)' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Stack</span>
              <strong>Sarvam AI · Supabase · Next.js</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.8rem', borderBottom: '1px solid var(--color-primary-outline)' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Default launch order</span>
              <strong>Intake → Queue → Consult</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Primary audience</span>
              <strong>Indian outpatient clinics</strong>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
