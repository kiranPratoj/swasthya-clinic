import Link from 'next/link';
import {
  Search,
  Activity,
  History,
  Mic,
  Upload,
  BrainCircuit,
  Volume2,
  ShieldAlert,
  ShieldCheck,
  ArrowRight,
  Smartphone,
  FileText,
} from 'lucide-react';
import ScrollReveal from './ScrollReveal';
import MockupInteractive from './MockupInteractive';
import DemoTrigger from './DemoTrigger';

const FLOW_STEPS = [
  { Icon: Smartphone, title: 'Search patient by phone' },
  { Icon: FileText, title: 'Token created instantly' },
  { Icon: Activity, title: 'Live queue updates' },
  { Icon: Mic, title: 'Doctor speaks naturally' },
  { Icon: History, title: 'History saved forever' },
];

const PROBLEMS = [
  'Patients repeating same story every visit',
  'Old prescriptions lost',
  'Doctors overloaded with typing and paperwork',
  'Reception chaos',
];

export default function LandingHero() {
  return (
    <>
      {/* ── 1. HERO ───────────────────────────────────────────── */}
      <section
        style={{
          paddingTop: 'clamp(5rem, 12vw, 10rem)',
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
            top: '50%',
            left: 0,
            width: '500px',
            height: '500px',
            background: '#eff6ff',
            borderRadius: '50%',
            filter: 'blur(100px)',
            opacity: 0.8,
            transform: 'translate(-25%, -50%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ maxWidth: '56rem', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <ScrollReveal>
            <h1
              style={{
                fontSize: 'clamp(2.6rem, 7vw, 5.5rem)',
                fontWeight: 900,
                letterSpacing: '-0.04em',
                color: '#0F172A',
                lineHeight: 1.05,
                marginBottom: '1.25rem',
              }}
            >
              Every visit should not
              <br />
              start from zero.
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <p
              style={{
                fontSize: 'clamp(1rem, 2.5vw, 1.35rem)',
                color: '#64748B',
                fontWeight: 500,
                margin: '0 auto 2.5rem',
                maxWidth: '36rem',
                lineHeight: 1.6,
              }}
            >
              Find patients instantly. Run your queue smoothly. Never lose history again.
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
                <button className="lp-btn lp-btn--primary">Start Free Trial</button>
              </DemoTrigger>
              <Link href="#workflow" className="lp-btn lp-btn--secondary">
                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>▶</span>
                See Workflow
              </Link>
            </div>

            <p
              style={{
                fontSize: '0.75rem',
                color: '#94a3b8',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Built for local clinics, not enterprise budgets
              {' · '}
              <span style={{ color: '#2563EB' }}>Powered by Sarvam AI</span>
              {' · '}
              Works in Kannada, Hindi, English
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ── 2. INTERACTIVE MOCKUP ─────────────────────────────── */}
      <section style={{ padding: '0 1.5rem 5rem' }}>
        <ScrollReveal
          delay={300}
          style={{ maxWidth: '56rem', margin: '0 auto', position: 'relative' }}
        >
          <div
            style={{
              position: 'absolute',
              inset: '-4px',
              background: 'linear-gradient(to bottom, rgba(191,219,254,0.5), transparent)',
              borderRadius: '2rem',
              filter: 'blur(12px)',
              opacity: 0.8,
              pointerEvents: 'none',
            }}
          />
          <MockupInteractive />
        </ScrollReveal>
      </section>

      {/* ── 3. CORE VALUE CARDS ───────────────────────────────── */}
      <section style={{ padding: '4rem 1.5rem' }}>
        <div
          style={{
            maxWidth: '72rem',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {[
            { Icon: Search, title: '1. Instant Patient Recall', body: 'Search by phone. See full history in seconds.' },
            { Icon: Activity, title: '2. Queue That Just Works', body: 'Live tokens. No confusion. No shouting.' },
            { Icon: History, title: '3. Continuity of Care', body: 'Every visit saved. Nothing gets lost again.' },
          ].map(({ Icon, title, body }, i) => (
            <ScrollReveal key={i} delay={i * 100}>
              <div className="lp-feature-card">
                <div className="lp-feature-icon">
                  <Icon size={30} strokeWidth={1.5} />
                </div>
                <h3 className="lp-feature-title">{title}</h3>
                <p className="lp-feature-body">{body}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ── 4. THE PROBLEM ───────────────────────────────────── */}
      <section id="problem" style={{ padding: '4rem 1.5rem' }}>
        <ScrollReveal
          style={{
            maxWidth: '64rem',
            margin: '0 auto',
            borderRadius: '2.5rem',
            padding: 'clamp(2.5rem, 6vw, 5rem) clamp(1.5rem, 5vw, 4rem)',
            textAlign: 'center',
            color: '#fff',
            position: 'relative',
            overflow: 'hidden',
            background: '#0F172A',
            boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
          }}
        >
          <h2 style={{ fontSize: 'clamp(1.8rem, 4.5vw, 3rem)', fontWeight: 800, letterSpacing: '-0.03em', color: '#f8fafc', marginBottom: '3rem' }}>
            This is how most clinics still run
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
              maxWidth: '42rem',
              margin: '0 auto 3.5rem',
              textAlign: 'left',
            }}
          >
            {PROBLEMS.map((text, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem',
                  padding: '1.25rem 1.5rem',
                  borderRadius: '1.5rem',
                  background: 'rgba(30,41,59,0.7)',
                  border: '1px solid rgba(71,85,105,0.5)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <ShieldAlert size={24} strokeWidth={1.5} style={{ color: '#f87171', flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#e2e8f0', lineHeight: 1.4 }}>{text}</span>
              </div>
            ))}
          </div>

          <div style={{ width: '4rem', height: '1px', background: '#334155', margin: '0 auto 2rem' }} />
          <p style={{ fontSize: 'clamp(1.1rem, 2.8vw, 1.6rem)', fontWeight: 700, color: '#fff', lineHeight: 1.5, maxWidth: '40rem', margin: '0 auto', letterSpacing: '-0.02em' }}>
            Good care is lost not because doctors don&apos;t care —{' '}
            <span style={{ color: '#60a5fa' }}>but because systems don&apos;t remember.</span>
          </p>
        </ScrollReveal>
      </section>

      {/* ── 5. HOW IT WORKS ──────────────────────────────────── */}
      <section
        id="workflow"
        style={{
          padding: 'clamp(3rem, 6vw, 6rem) 1.5rem',
          background: '#f8fafc',
          borderRadius: '3.5rem',
          margin: '0 clamp(0.5rem, 2vw, 2.5rem)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '24px 24px', opacity: 0.03, pointerEvents: 'none' }} />
        <div style={{ maxWidth: '72rem', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <ScrollReveal>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4.5vw, 3rem)', fontWeight: 800, letterSpacing: '-0.03em', color: '#0F172A', marginBottom: '0.75rem' }}>
              Medilite AI changes that
            </h2>
            <p style={{ fontSize: '1.2rem', color: '#64748B', fontWeight: 500, marginBottom: '4rem' }}>
              Simple for staff. Powerful for care.
            </p>
          </ScrollReveal>

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 'clamp(1rem, 3vw, 2rem)', position: 'relative' }}>
            {FLOW_STEPS.map(({ Icon, title }, i) => (
              <ScrollReveal key={i} delay={i * 100} style={{ position: 'relative', zIndex: 1 }}>
                <div className="lp-flow-step">
                  <div className="lp-step-icon">
                    <Icon size={32} strokeWidth={1.5} />
                  </div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.35, textAlign: 'center' }}>
                    {title}
                  </h4>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. AI SUPPORT ────────────────────────────────────── */}
      <section id="ai" style={{ padding: 'clamp(3rem, 6vw, 6rem) 1.5rem' }}>
        <div style={{ maxWidth: '72rem', margin: '0 auto', textAlign: 'center' }}>
          <ScrollReveal>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4.5vw, 3rem)', fontWeight: 800, letterSpacing: '-0.03em', color: '#0F172A', marginBottom: '1.25rem' }}>
              AI that supports, not replaces
            </h2>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.6rem',
                background: '#eff6ff',
                color: '#1e40af',
                padding: '0.6rem 1.25rem',
                borderRadius: '999px',
                fontWeight: 700,
                fontSize: '0.875rem',
                marginBottom: '3rem',
                border: '1px solid #bfdbfe',
              }}
            >
              <ShieldCheck size={18} style={{ color: '#2563EB' }} />
              Always optional. Doctor stays in control.
            </div>
          </ScrollReveal>

          {/* Scribe banner */}
          <ScrollReveal delay={100}>
            <div
              style={{
                background: '#0F172A',
                borderRadius: '2.5rem',
                padding: 'clamp(2rem, 4vw, 3.5rem)',
                marginBottom: '2.5rem',
                textAlign: 'left',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '2.5rem',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
              }}
            >
              <div style={{ position: 'absolute', top: 0, right: 0, width: 400, height: 400, background: 'rgba(37,99,235,0.2)', borderRadius: '50%', filter: 'blur(80px)', transform: 'translate(30%, -40%)', pointerEvents: 'none' }} />

              <div style={{ flex: '1 1 280px', position: 'relative', zIndex: 1 }}>
                <h3 style={{ fontSize: 'clamp(1.4rem, 3.5vw, 2.5rem)', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: '1rem' }}>
                  Doctor speaks naturally.{' '}
                  <span style={{ color: '#60a5fa' }}>Medilite AI prepares the draft.</span>
                </h3>
                <p style={{ fontSize: '1.05rem', color: '#cbd5e1', marginBottom: '1.5rem', fontWeight: 500, lineHeight: 1.6, maxWidth: '28rem' }}>
                  The doctor reviews, edits, and stays in control. Built for real clinics — not expensive enterprise software.
                </p>
                <ul style={{ display: 'grid', gap: '0.75rem' }}>
                  {['Less typing. Faster notes. Better continuity.', 'What you say becomes a structured record.'].map((item, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', color: '#94a3b8', fontWeight: 500, fontSize: '0.95rem' }}>
                      <ShieldCheck size={20} style={{ color: '#3b82f6', flexShrink: 0, marginTop: 2 }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ flex: '1 1 220px', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '1.5rem', padding: '1.75rem', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#fff', fontWeight: 700 }}>
                    <Mic size={20} style={{ color: '#60a5fa', animation: 'lp-pulse 1.5s ease-in-out infinite' }} />
                    Recording Consult…
                  </div>
                  <span style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#93c5fd', background: 'rgba(30,58,138,0.5)', padding: '3px 10px', borderRadius: '999px' }}>
                    Sarvam AI
                  </span>
                </div>
                <div style={{ display: 'grid', gap: '0.75rem', opacity: 0.7 }}>
                  {[0.75, 1, 0.85].map((w, i) => (
                    <div key={i} style={{ height: 10, width: `${w * 100}%`, background: 'rgba(191,219,254,0.2)', borderRadius: '999px' }} />
                  ))}
                </div>
                <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 500 }}>Draft ready for review</span>
                  <ArrowRight size={18} style={{ color: '#60a5fa' }} />
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* AI tool cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', textAlign: 'left' }}>
            {[
              { Icon: Upload, trigger: 'Upload', action: 'read old reports', sub: 'Snap a photo to organize past context.' },
              { Icon: BrainCircuit, trigger: 'AI', action: 'second look', sub: 'Optional assist to spot patterns.' },
              { Icon: Volume2, trigger: 'Voice', action: 'explain to patients', sub: 'Easily explain care plans in local languages.' },
            ].map(({ Icon, trigger, action, sub }, i) => (
              <ScrollReveal key={i} delay={i * 100}>
                <div className="lp-ai-card">
                  <div className="lp-ai-icon">
                    <Icon size={24} strokeWidth={1.5} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
                    {trigger}
                    <ArrowRight size={18} style={{ color: '#94a3b8' }} />
                  </div>
                  <div style={{ fontSize: '1rem', color: '#475569', fontWeight: 500 }}>{action}</div>
                  <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>{sub}</div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. SOCIAL IMPACT ─────────────────────────────────── */}
      <section
        style={{
          padding: 'clamp(4rem, 8vw, 8rem) 1.5rem',
          textAlign: 'center',
          borderRadius: '3.5rem',
          margin: '2rem clamp(0.5rem, 2vw, 2.5rem)',
          background: '#0F172A',
          boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
      >
        <ScrollReveal style={{ maxWidth: '48rem', margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.8rem, 5vw, 3.5rem)', fontWeight: 800, letterSpacing: '-0.04em', color: '#fff', marginBottom: '3rem' }}>
            Better clinics.
            <br />
            Better communities.
          </h2>
          <div style={{ fontSize: 'clamp(1rem, 2.5vw, 1.4rem)', color: '#cbd5e1', display: 'grid', gap: '1rem', marginBottom: '3.5rem', fontWeight: 500, lineHeight: 1.6 }}>
            <p>Small clinics handle most of India&apos;s healthcare.</p>
            <p>They deserve better tools.</p>
            <p style={{ color: '#93c5fd', fontWeight: 700 }}>Better continuity → better outcomes.</p>
          </div>
          <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '1.25rem', padding: '1.5rem 2rem', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.5rem)', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.4 }}>
              Healthcare quality should not depend on location.
            </p>
          </div>
        </ScrollReveal>
      </section>

      {/* ── 8. FINAL CTA ─────────────────────────────────────── */}
      <section style={{ padding: 'clamp(4rem, 8vw, 8rem) 1.5rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', width: 500, height: 500, background: '#eff6ff', borderRadius: '50%', filter: 'blur(100px)', transform: 'translate(-50%, -50%)', zIndex: 0, pointerEvents: 'none' }} />
        <ScrollReveal style={{ maxWidth: '48rem', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: 'clamp(2rem, 5.5vw, 3.5rem)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.04em', marginBottom: '3rem' }}>
            See it in action in 2 minutes
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem' }}>
            <DemoTrigger>
              <button className="lp-btn lp-btn--primary lp-btn--lg">Book Demo</button>
            </DemoTrigger>
            <DemoTrigger>
              <button className="lp-btn lp-btn--secondary lp-btn--lg">Start Free Trial</button>
            </DemoTrigger>
          </div>
        </ScrollReveal>
      </section>

      {/* ── 9. LANDING FOOTER ─────────────────────────────────── */}
      <footer style={{ padding: 'clamp(3rem, 6vw, 5rem) 1.5rem 2.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
        <ScrollReveal>
          <h3 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.8rem)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', marginBottom: '3rem' }}>
            Care should remember.
          </h3>
        </ScrollReveal>
        <div style={{ maxWidth: '72rem', margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', paddingTop: '2rem', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 800, color: '#0F172A', fontSize: '1.1rem' }}>
            <svg viewBox="0 0 32 32" width={24} height={24} fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="12" y="2" width="8" height="28" rx="4" fill="#2563EB" />
              <rect x="2" y="12" width="28" height="8" rx="4" fill="#60a5fa" opacity="0.9" />
              <circle cx="24" cy="6" r="2.5" fill="#2563EB" />
            </svg>
            Medilite AI
          </div>
          <p style={{ color: '#64748B', fontWeight: 500, fontSize: '0.9rem', maxWidth: '28rem' }}>
            Medilite AI helps clinics remember patients, run queues smoothly, and deliver better care — without complexity.
          </p>
        </div>
      </footer>

      {/* Sticky mobile CTA */}
      <div className="lp-mobile-sticky">
        <DemoTrigger>
          <button className="lp-btn lp-btn--primary" style={{ width: '100%', maxWidth: '28rem' }}>
            Start Free Trial
          </button>
        </DemoTrigger>
      </div>
    </>
  );
}
