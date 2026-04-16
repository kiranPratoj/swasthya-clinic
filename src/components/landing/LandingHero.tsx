import Link from 'next/link';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import ScrollReveal from './ScrollReveal';
import MockupInteractive from './MockupInteractive';
import WhatsAppSimulator from './WhatsAppSimulator';
import ScribeDemo from './ScribeDemo';
import BillingDemo from './BillingDemo';
import DemoTrigger from './DemoTrigger';

const CHAPTERS = [
  {
    id: 'wa-intake',
    num: '01',
    kicker: 'WhatsApp Intake',
    headline: 'Patients check in from their phone — before they even arrive.',
    body: 'A patient messages your clinic WhatsApp. Medilite AI looks them up instantly, assigns a token, and tells them the wait time. No receptionist call. No paper form. Continuity starts the moment they message.',
    badge: 'Zero friction for the patient',
  },
  {
    id: 'live-queue',
    num: '02',
    kicker: 'Live Queue',
    headline: 'Queue runs itself. Staff just watches.',
    body: 'Search a patient by phone, create their token in seconds, and the queue updates in real time. Multilingual display for staff who work in Kannada, Hindi, or English. No spreadsheets. No shouting.',
    badge: 'Works in Kannada · Hindi · English',
  },
  {
    id: 'ai-scribe',
    num: '03',
    kicker: 'AI Voice Scribe',
    headline: 'Doctor speaks. Medilite writes.',
    body: 'The doctor speaks naturally during the consultation. Sarvam AI structures it into Chief Complaint, Assessment, and Plan. The doctor reviews and edits — the AI never decides alone. Less typing. Better notes.',
    badge: 'Doctor always stays in control',
  },
  {
    id: 'discharge',
    num: '04',
    kicker: '1-Click Discharge',
    headline: 'Bill generated. Paid. WhatsApp sent. Done.',
    body: 'When the consultation is done, Medilite generates the bill in one tap. Patient pays via UPI and receives a WhatsApp receipt automatically. Discharge takes seconds, not minutes.',
    badge: 'UPI · Auto WhatsApp receipt',
  },
];

const MOCKUP_COMPONENTS = [
  <WhatsAppSimulator key="wa" />,
  <MockupInteractive key="queue" />,
  <ScribeDemo key="scribe" />,
  <BillingDemo key="billing" />,
];

const PROBLEMS = [
  'Patients repeating same story every visit',
  'Old prescriptions and reports lost',
  'Doctors buried in typing and paperwork',
  'Reception chaos, missed tokens, long waits',
];

export default function LandingHero() {
  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section
        style={{
          paddingTop: 'clamp(5rem, 12vw, 9rem)',
          paddingBottom: 'clamp(3rem, 6vw, 5rem)',
          paddingInline: '1.5rem',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '40%',
            left: '50%',
            width: 600,
            height: 600,
            background: '#eff6ff',
            borderRadius: '50%',
            filter: 'blur(120px)',
            opacity: 0.7,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ maxWidth: '56rem', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <ScrollReveal>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: '#eff6ff',
                color: '#1e40af',
                padding: '0.45rem 1.1rem',
                borderRadius: '999px',
                fontWeight: 700,
                fontSize: '0.82rem',
                marginBottom: '1.75rem',
                border: '1px solid #bfdbfe',
                letterSpacing: '0.01em',
              }}
            >
              <ShieldCheck size={15} style={{ color: '#2563EB' }} />
              Powered by Sarvam AI · Built for Indian Clinics
            </div>
          </ScrollReveal>

          <ScrollReveal delay={60}>
            <h1
              style={{
                fontSize: 'clamp(2.6rem, 7vw, 5rem)',
                fontWeight: 900,
                letterSpacing: '-0.04em',
                color: '#0F172A',
                lineHeight: 1.05,
                marginBottom: '1.25rem',
              }}
            >
              Your clinic&apos;s complete
              <br />
              <span style={{ color: '#2563EB' }}>digital backbone.</span>
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={130}>
            <p
              style={{
                fontSize: 'clamp(1rem, 2.5vw, 1.3rem)',
                color: '#64748B',
                fontWeight: 500,
                margin: '0 auto 2.5rem',
                maxWidth: '38rem',
                lineHeight: 1.6,
              }}
            >
              WhatsApp check-in. Live queue. AI voice notes. 1-click discharge.
              All in one system built for how Indian clinics actually work.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '1rem',
                marginBottom: '2rem',
              }}
            >
              <DemoTrigger>
                <button className="lp-btn lp-btn--primary">Book Demo</button>
              </DemoTrigger>
              <Link href="/onboard" className="lp-btn lp-btn--secondary">
                Start Free Trial
              </Link>
            </div>

            <p
              style={{
                fontSize: '0.72rem',
                color: '#94a3b8',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              No setup fee · Works in Hindi, Kannada, English · Cancel any time
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ── THE PROBLEM ──────────────────────────────────────── */}
      <section style={{ padding: '2rem 1.5rem 4rem' }}>
        <ScrollReveal
          style={{
            maxWidth: '60rem',
            margin: '0 auto',
            borderRadius: '2.5rem',
            padding: 'clamp(2.5rem, 5vw, 4rem) clamp(1.5rem, 5vw, 3.5rem)',
            textAlign: 'center',
            background: '#0F172A',
            boxShadow: '0 32px 80px rgba(0,0,0,0.22)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 360,
              height: 360,
              background: 'rgba(37,99,235,0.15)',
              borderRadius: '50%',
              filter: 'blur(80px)',
              transform: 'translate(30%, -40%)',
              pointerEvents: 'none',
            }}
          />

          <h2
            style={{
              fontSize: 'clamp(1.6rem, 4vw, 2.75rem)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: '#f8fafc',
              marginBottom: '2.5rem',
              position: 'relative',
              zIndex: 1,
            }}
          >
            This is how most clinics still run
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              maxWidth: '44rem',
              margin: '0 auto 3rem',
              textAlign: 'left',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {PROBLEMS.map((text, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.85rem',
                  padding: '1.1rem 1.25rem',
                  borderRadius: '1.25rem',
                  background: 'rgba(30,41,59,0.7)',
                  border: '1px solid rgba(71,85,105,0.45)',
                }}
              >
                <ShieldAlert
                  size={20}
                  strokeWidth={1.5}
                  style={{ color: '#f87171', flexShrink: 0, marginTop: 2 }}
                />
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#e2e8f0', lineHeight: 1.45 }}>
                  {text}
                </span>
              </div>
            ))}
          </div>

          <p
            style={{
              fontSize: 'clamp(1rem, 2.5vw, 1.4rem)',
              fontWeight: 700,
              color: '#fff',
              lineHeight: 1.5,
              maxWidth: '38rem',
              margin: '0 auto',
              letterSpacing: '-0.02em',
              position: 'relative',
              zIndex: 1,
            }}
          >
            Good care is lost not because doctors don&apos;t care —{' '}
            <span style={{ color: '#60a5fa' }}>
              but because systems don&apos;t remember.
            </span>
          </p>
        </ScrollReveal>
      </section>

      {/* ── 4 INTERACTIVE CHAPTERS ───────────────────────────── */}
      {CHAPTERS.map((ch, i) => (
        <section
          key={ch.id}
          id={ch.id}
          style={{
            padding: 'clamp(4rem, 8vw, 7rem) clamp(1.5rem, 4vw, 3rem)',
            background: i % 2 === 1 ? '#f8fafc' : undefined,
            borderRadius: i % 2 === 1 ? '3.5rem' : undefined,
            margin: i % 2 === 1 ? '0 clamp(0.5rem, 2vw, 2rem)' : undefined,
          }}
        >
          <div style={{ maxWidth: '72rem', margin: '0 auto' }}>
            <div className="lp-chapter">
              <ScrollReveal className="lp-chapter-copy">
                <div className="lp-chapter-kicker">
                  {ch.num} / {ch.kicker}
                </div>
                <h2 className="lp-chapter-headline">{ch.headline}</h2>
                <p className="lp-chapter-body">{ch.body}</p>
                <div className="lp-chapter-badge">
                  <ShieldCheck size={13} style={{ color: '#2563EB' }} />
                  {ch.badge}
                </div>
              </ScrollReveal>

              <ScrollReveal
                className="lp-chapter-mockup"
                delay={120}
                style={{ display: 'flex', justifyContent: 'center' }}
              >
                {MOCKUP_COMPONENTS[i]}
              </ScrollReveal>
            </div>
          </div>
        </section>
      ))}

      {/* ── SOCIAL IMPACT ─────────────────────────────────────── */}
      <section
        style={{
          padding: 'clamp(4rem, 8vw, 7rem) 1.5rem',
          textAlign: 'center',
          borderRadius: '3.5rem',
          margin: '2rem clamp(0.5rem, 2vw, 2rem)',
          background: '#0F172A',
          boxShadow: '0 32px 80px rgba(0,0,0,0.22)',
          overflow: 'hidden',
        }}
      >
        <ScrollReveal style={{ maxWidth: '44rem', margin: '0 auto' }}>
          <h2
            style={{
              fontSize: 'clamp(1.8rem, 5vw, 3.2rem)',
              fontWeight: 800,
              letterSpacing: '-0.04em',
              color: '#fff',
              marginBottom: '2.5rem',
            }}
          >
            Better clinics.
            <br />
            Better communities.
          </h2>
          <div
            style={{
              fontSize: 'clamp(1rem, 2.3vw, 1.25rem)',
              color: '#cbd5e1',
              display: 'grid',
              gap: '0.9rem',
              marginBottom: '3rem',
              fontWeight: 500,
              lineHeight: 1.6,
            }}
          >
            <p>Small clinics handle most of India&apos;s primary healthcare.</p>
            <p>They deserve tools built for them.</p>
            <p style={{ color: '#93c5fd', fontWeight: 700 }}>
              Better continuity → better outcomes.
            </p>
          </div>
          <div
            style={{
              display: 'inline-block',
              background: 'rgba(255,255,255,0.07)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.11)',
              borderRadius: '1.25rem',
              padding: '1.5rem 2rem',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}
          >
            <p
              style={{
                fontSize: 'clamp(1rem, 2.3vw, 1.4rem)',
                fontWeight: 800,
                color: '#fff',
                letterSpacing: '-0.02em',
                lineHeight: 1.4,
              }}
            >
              Healthcare quality should not depend on location.
            </p>
          </div>
        </ScrollReveal>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────── */}
      <section
        style={{
          padding: 'clamp(4rem, 8vw, 7rem) 1.5rem',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 500,
            height: 500,
            background: '#eff6ff',
            borderRadius: '50%',
            filter: 'blur(100px)',
            transform: 'translate(-50%, -50%)',
            zIndex: 0,
            pointerEvents: 'none',
          }}
        />
        <ScrollReveal style={{ maxWidth: '44rem', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <h2
            style={{
              fontSize: 'clamp(2rem, 5.5vw, 3.25rem)',
              fontWeight: 800,
              color: '#0F172A',
              letterSpacing: '-0.04em',
              marginBottom: '1.25rem',
            }}
          >
            See it in action in 15 minutes
          </h2>
          <p
            style={{
              fontSize: '1.05rem',
              color: '#64748B',
              fontWeight: 500,
              marginBottom: '2.5rem',
              lineHeight: 1.6,
            }}
          >
            No aggressive sales. Just a clear, personalized walkthrough of Medilite AI
            in your clinic&apos;s workflow.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem' }}>
            <DemoTrigger>
              <button className="lp-btn lp-btn--primary lp-btn--lg">Book Demo</button>
            </DemoTrigger>
            <Link href="/onboard" className="lp-btn lp-btn--secondary lp-btn--lg">
              Start Free Trial
            </Link>
          </div>
        </ScrollReveal>
      </section>

      {/* ── LANDING FOOTER ────────────────────────────────────── */}
      <footer
        style={{
          padding: 'clamp(3rem, 6vw, 5rem) 1.5rem 2.5rem',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          textAlign: 'center',
        }}
      >
        <ScrollReveal>
          <h3
            style={{
              fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
              fontWeight: 800,
              color: '#0F172A',
              letterSpacing: '-0.03em',
              marginBottom: '2.5rem',
            }}
          >
            Care should remember.
          </h3>
        </ScrollReveal>
        <div
          style={{
            maxWidth: '72rem',
            margin: '0 auto',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.5rem',
            paddingTop: '2rem',
            borderTop: '1px solid #e2e8f0',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontWeight: 800,
              color: '#0F172A',
              fontSize: '1.1rem',
            }}
          >
            <svg viewBox="0 0 32 32" width={24} height={24} fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="12" y="2" width="8" height="28" rx="4" fill="#2563EB" />
              <rect x="2" y="12" width="28" height="8" rx="4" fill="#60a5fa" opacity="0.9" />
              <circle cx="24" cy="6" r="2.5" fill="#2563EB" />
            </svg>
            Medilite AI
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <p
              style={{
                color: '#64748B',
                fontWeight: 500,
                fontSize: '0.88rem',
                maxWidth: '28rem',
                lineHeight: 1.6,
              }}
            >
              WhatsApp intake · Live queue · AI voice scribe · 1-click discharge.
              Built for India&apos;s neighbourhood clinics.
            </p>
            <a
              href="mailto:Admin@wingspirelabs.com"
              style={{
                color: '#2563EB',
                fontWeight: 600,
                fontSize: '0.85rem',
                textDecoration: 'none',
              }}
            >
              Admin@wingspirelabs.com
            </a>
          </div>
        </div>
      </footer>

      {/* ── MOBILE STICKY CTA ─────────────────────────────────── */}
      <div className="lp-mobile-sticky">
        <DemoTrigger>
          <button
            className="lp-btn lp-btn--primary"
            style={{ width: '100%', maxWidth: '28rem' }}
          >
            Book Demo
          </button>
        </DemoTrigger>
      </div>
    </>
  );
}
