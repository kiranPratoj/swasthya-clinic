import Link from 'next/link';
import BrandMark from '@/components/BrandMark';

const trustChips = [
  'Voice-first registration',
  'Realtime queue visibility',
  'Patient history continuity',
  'Doctor-supportive AI',
  'Powered by Sarvam AI',
  'Local-language ready',
];

const workflowSteps = [
  {
    number: '01',
    title: 'Reception speaks and registers patient',
    body: 'Front-desk staff capture the basics naturally, with Sarvam AI helping extract structured details from voice.',
  },
  {
    number: '02',
    title: 'Token is created instantly',
    body: 'The visit enters today’s queue without a heavy booking workflow or a long registration ritual.',
  },
  {
    number: '03',
    title: 'Queue updates in realtime',
    body: 'Reception, doctor, and patient all get a clearer view of who is waiting, who is consulting, and what moves next.',
  },
  {
    number: '04',
    title: 'Doctor sees visit context',
    body: 'Repeat visits do not start from zero. Recent continuity, prior notes, and relevant history are available when needed.',
  },
  {
    number: '05',
    title: 'Notes and prescription stay clean',
    body: 'The doctor stays in control while AI helps organize context, draft structure, and reduce repeated writing.',
  },
  {
    number: '06',
    title: 'Follow-up becomes easier next time',
    body: 'The next visit starts with memory instead of paper slips, repeated explanations, and missing context.',
  },
];

const uspCards = [
  {
    icon: 'Mic',
    title: 'Voice-first front desk',
    kicker: 'Natural intake, less typing',
    body: 'Reception can register patients by speaking instead of stopping the queue to type every field manually.',
  },
  {
    icon: 'Wave',
    title: 'Sarvam AI-powered language layer',
    kicker: 'Built for speech and local language',
    body: 'Sarvam AI makes voice and local-language workflows practical in clinics where speed and clarity matter every day.',
  },
  {
    icon: 'Queue',
    title: 'Realtime queue clarity',
    kicker: 'Patients and staff stay aligned',
    body: 'Live token flow reduces confusion at the front desk and gives the doctor a cleaner operating picture.',
  },
  {
    icon: 'Record',
    title: 'Patient history continuity',
    kicker: 'Repeat visits retain context',
    body: 'Old complaints, prescriptions, and visit summaries are easier to retrieve when the patient returns.',
  },
  {
    icon: 'Doctor',
    title: 'Doctor-supportive AI',
    kicker: 'Assistive, never replacing clinical judgment',
    body: 'AI helps structure and summarize context, while the doctor stays fully responsible for the final record.',
  },
  {
    icon: 'Heart',
    title: 'Better chronic care follow-up',
    kicker: 'Useful for recurring care',
    body: 'Especially valuable for BP, diabetes, thyroid, and repeat-care visits where continuity matters over time.',
  },
  {
    icon: 'Clinic',
    title: 'Designed for practical Indian clinics',
    kicker: 'Built for real OPD rhythm',
    body: 'Useful for small and mid-sized clinics where walk-ins, phone calls, and local language all shape the day.',
  },
  {
    icon: 'Lite',
    title: 'Simple, not heavy ERP',
    kicker: 'Operational clarity without software burden',
    body: 'medilite.ai keeps the workflow light, teachable, and useful without becoming an enterprise admin system.',
  },
];

const stakeholderColumns = [
  {
    title: 'For patients',
    items: [
      'Less repeated explanation at each visit',
      'Faster repeat registration',
      'Less queue confusion',
      'Old prescriptions easier to retrieve',
      'Stronger continuity across follow-up visits',
    ],
  },
  {
    title: 'For doctors',
    items: [
      'Less repeated questioning',
      'Faster access to prior context',
      'Structured consult support',
      'Better continuity across visits',
      'Optional AI support without losing control',
    ],
  },
  {
    title: 'For clinic owners',
    items: [
      'Smoother front-desk operations',
      'Better workflow visibility',
      'More professional patient experience',
      'Stronger trust and retention',
      'Scalable clinic discipline without heavy software',
    ],
  },
];

const showcaseCards = [
  {
    label: 'Reception',
    title: 'Voice intake',
    lines: ['Name, age, mobile, complaint', 'Sarvam AI extraction', 'Confirm and create token'],
  },
  {
    label: 'Queue',
    title: 'Live queue dashboard',
    lines: ['Waiting, in consult, completed', 'Token movement in realtime', 'Clear front-desk view'],
  },
  {
    label: 'Doctor',
    title: 'Consult context',
    lines: ['Recent continuity', 'Structured note support', 'Prescription capture'],
  },
  {
    label: 'History',
    title: 'Patient timeline',
    lines: ['Previous visits', 'Prior prescriptions', 'Continuity for follow-up'],
  },
];

function Icon({ kind }: { kind: string }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.8',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  switch (kind) {
    case 'Mic':
      return (
        <svg {...common}>
          <path d="M12 14a3 3 0 0 0 3-3V7a3 3 0 1 0-6 0v4a3 3 0 0 0 3 3Z" />
          <path d="M19 11a7 7 0 0 1-14 0M12 18v3M8 21h8" />
        </svg>
      );
    case 'Wave':
      return (
        <svg {...common}>
          <path d="M3 12c1.5 0 1.5-4 3-4s1.5 8 3 8 1.5-12 3-12 1.5 16 3 16 1.5-8 3-8 1.5 4 3 4" />
        </svg>
      );
    case 'Queue':
      return (
        <svg {...common}>
          <path d="M8 6h13M8 12h13M8 18h13" />
          <circle cx="4" cy="6" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="4" cy="12" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="4" cy="18" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'Record':
      return (
        <svg {...common}>
          <path d="M8 7h8M8 12h8M8 17h5" />
          <path d="M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
        </svg>
      );
    case 'Doctor':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20a7 7 0 0 1 14 0" />
          <path d="M19 5v4M17 7h4" />
        </svg>
      );
    case 'Heart':
      return (
        <svg {...common}>
          <path d="M12 20s-6.7-4.5-8.7-8A4.9 4.9 0 0 1 12 6.6 4.9 4.9 0 0 1 20.7 12C18.7 15.5 12 20 12 20Z" />
        </svg>
      );
    case 'Clinic':
      return (
        <svg {...common}>
          <path d="M12 3v18M3 12h18" />
          <rect x="4" y="4" width="16" height="16" rx="3" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M6 12h12M12 6v12" />
        </svg>
      );
  }
}

export default function HomePage() {
  return (
    <div className="medilite-landing">
      <section className="medilite-hero" id="product">
        <div className="max-w-7xl px-4 medilite-hero-grid">
          <div className="medilite-hero-copy">
            <div className="medilite-eyebrow-row">
              <span className="nh-eyebrow">Smart clinic flow for modern care</span>
              <span className="medilite-sarvam-pill">Powered by Sarvam AI</span>
            </div>

            <h1 className="medilite-hero-title">
              Faster intake. Clearer queues. Better care continuity.
            </h1>

            <p className="medilite-hero-body">
              medilite.ai helps clinics streamline patient intake, manage live queues, preserve
              patient context, and support doctors with practical AI workflows powered by Sarvam
              AI.
            </p>

            <div className="medilite-hero-actions">
              <Link href="/onboard" className="nh-btn nh-btn-primary">
                Book Demo
              </Link>
              <Link href="#workflow" className="nh-btn nh-btn-secondary">
                See Workflow
              </Link>
            </div>

            <div className="medilite-chip-grid">
              {trustChips.map((chip) => (
                <div key={chip} className="medilite-chip">
                  {chip}
                </div>
              ))}
            </div>
          </div>

          <div className="medilite-hero-visual">
            <div className="medilite-product-stage">
              <div className="medilite-stage-header">
                <div className="medilite-stage-brand">
                  <BrandMark size={34} />
                  <div>
                    <div className="medilite-stage-title">medilite.ai</div>
                    <div className="medilite-stage-kicker">Voice-first clinic flow</div>
                  </div>
                </div>
                <span className="medilite-stage-badge">Sarvam AI enabled</span>
              </div>

              <div className="medilite-stage-grid">
                <article className="medilite-ui-card medilite-ui-card-primary">
                  <div className="medilite-ui-card-top">
                    <span className="medilite-ui-label">Reception intake</span>
                    <span className="medilite-ui-dot" />
                  </div>
                  <h3>Voice-first registration</h3>
                  <p className="mobile-copy-optional">Capture name, age, mobile, complaint, and visit type from natural speech.</p>
                  <div className="medilite-wave-block">
                    <div className="medilite-wave-bars">
                      <span />
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                    <div className="medilite-wave-copy">Kannada / English / local-language ready</div>
                  </div>
                </article>

                <article className="medilite-ui-card">
                  <span className="medilite-ui-label">Live queue</span>
                  <h3>Today&apos;s doctor flow</h3>
                  <ul className="medilite-mini-list">
                    <li><strong>#12</strong><span>Waiting</span></li>
                    <li><strong>#13</strong><span>In consult</span></li>
                    <li><strong>#14</strong><span>Completed</span></li>
                  </ul>
                </article>

                <article className="medilite-ui-card">
                  <span className="medilite-ui-label">Continuity</span>
                  <h3>Patient memory when needed</h3>
                  <div className="medilite-history-stack">
                    <div>Last visit: BP follow-up</div>
                    <div>Prior Rx: Telmisartan</div>
                    <div>Repeat complaint: headache + dizziness</div>
                  </div>
                </article>

                <article className="medilite-ui-card medilite-ui-card-compact">
                  <span className="medilite-ui-label">Doctor support</span>
                  <h3>AI that supports, not replaces</h3>
                  <p className="mobile-copy-optional">Structured note support, prescription drafting, and follow-up context with the doctor still in control.</p>
                </article>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="medilite-section" id="workflow">
        <div className="max-w-7xl px-4 medilite-section-head">
          <span className="nh-eyebrow">One system. Complete clinic flow.</span>
          <h2 className="medilite-section-title">
            Entry to follow-up, without making the clinic feel like software.
          </h2>
          <p className="medilite-section-body mobile-copy-optional">
            medilite.ai is built around the practical patient journey in everyday clinics: entry,
            registration, token, queue, doctor consult, prescription, history, and the next visit.
          </p>
        </div>

        <div className="max-w-7xl px-4 medilite-workflow-grid">
          {workflowSteps.map((step) => (
            <article key={step.number} className="medilite-workflow-card">
              <div className="medilite-workflow-number">{step.number}</div>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="medilite-section medilite-section-soft" id="benefits">
        <div className="max-w-7xl px-4 medilite-section-head">
          <span className="nh-eyebrow">Why clinics choose medilite.ai</span>
          <h2 className="medilite-section-title">Operational clarity, continuity, and useful AI.</h2>
        </div>

        <div className="max-w-7xl px-4 medilite-usp-grid">
          {uspCards.map((card) => (
            <article key={card.title} className="medilite-usp-card">
              <div className="medilite-usp-icon">
                <Icon kind={card.icon} />
              </div>
              <div className="medilite-usp-kicker">{card.kicker}</div>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="medilite-section" id="sarvam">
        <div className="max-w-7xl px-4 medilite-sarvam-grid">
          <div className="medilite-sarvam-copy">
            <span className="nh-eyebrow">Why Sarvam AI</span>
            <h2 className="medilite-section-title">The language layer that makes voice-first clinic workflows practical.</h2>
            <p className="medilite-section-body mobile-copy-optional">
              Sarvam AI helps medilite.ai turn voice and local-language workflows into something
              operationally useful at the front desk. It supports speech capture, structured
              extraction, and context support without making the clinic flow robotic.
            </p>
            <div className="medilite-sarvam-points">
              <div>Voice input becomes usable in real registration flows.</div>
              <div>Local-language friendliness feels regionally relevant, not generic.</div>
              <div>Doctors get support from structured context, not a replacement workflow.</div>
            </div>
          </div>

          <div className="medilite-sarvam-diagram">
            <div className="medilite-diagram-node">Voice input</div>
            <div className="medilite-diagram-arrow">→</div>
            <div className="medilite-diagram-node medilite-diagram-node-primary">Sarvam AI extraction</div>
            <div className="medilite-diagram-arrow">→</div>
            <div className="medilite-diagram-node">Queue + patient record</div>
            <div className="medilite-diagram-arrow">→</div>
            <div className="medilite-diagram-node">Doctor support</div>
          </div>
        </div>
      </section>

      <section className="medilite-section medilite-section-soft" id="clinics">
        <div className="max-w-7xl px-4 medilite-section-head">
          <span className="nh-eyebrow">Value for everyone in the clinic</span>
          <h2 className="medilite-section-title">Built for patients, doctors, and clinic operators.</h2>
        </div>

        <div className="max-w-7xl px-4 medilite-stakeholder-grid">
          {stakeholderColumns.map((column) => (
            <article key={column.title} className="medilite-stakeholder-card">
              <h3>{column.title}</h3>
              <ul>
                {column.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="medilite-narrative">
        <div className="max-w-6xl px-4">
          <span className="nh-eyebrow">Small clinics deserve powerful simplicity</span>
          <h2 className="medilite-narrative-title">When care remembers, people suffer less.</h2>
          <p className="medilite-narrative-body mobile-copy-optional">
            In many local clinics, patients do not just suffer from illness. They also suffer from
            lost context. Paper slips disappear. Old prescriptions go missing. Every visit starts
            again. medilite.ai helps clinics preserve continuity and reduce avoidable confusion.
          </p>
        </div>
      </section>

      <section className="medilite-section">
        <div className="max-w-7xl px-4 medilite-section-head">
          <span className="nh-eyebrow">Product showcase</span>
          <h2 className="medilite-section-title">A clinic operations product that feels real, not conceptual.</h2>
        </div>

        <div className="max-w-7xl px-4 medilite-showcase-grid">
          {showcaseCards.map((card) => (
            <article key={card.title} className="medilite-showcase-card">
              <div className="medilite-showcase-frame">
                <div className="medilite-showcase-header">
                  <span>{card.label}</span>
                  <span className="medilite-showcase-dot" />
                </div>
                <div className="medilite-showcase-content">
                  <h3>{card.title}</h3>
                  <div className="medilite-showcase-lines">
                    {card.lines.map((line) => (
                      <div key={line}>{line}</div>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="medilite-final-cta" id="contact">
        <div className="max-w-7xl px-4 medilite-final-cta-shell">
          <div className="medilite-final-copy">
            <span className="nh-eyebrow" style={{ color: 'rgba(255,255,255,0.72)' }}>Book a demo</span>
            <h2 className="medilite-final-title">Upgrade your clinic flow without making it complicated.</h2>
            <p className="medilite-final-body mobile-copy-optional">
              Bring voice-first intake, clearer queues, stronger continuity, and Sarvam AI-enabled
              clinic workflows into your practice.
            </p>
          </div>

          <div className="medilite-final-actions">
            <Link href="/onboard" className="nh-btn nh-btn-secondary" style={{ background: '#fff', minWidth: '12rem' }}>
              Book Demo
            </Link>
            <a href="mailto:hello@medilite.ai" className="nh-btn medilite-final-ghost">
              Talk to Us
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
