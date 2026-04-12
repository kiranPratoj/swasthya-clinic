import Link from 'next/link';

export default function HomePage() {
  const workstreams = [
    'Voice intake for the front desk',
    'Realtime queue for the doctor',
    'Patient tokens and mobile follow-up',
  ];
  const flowSteps = [
    {
      number: '1',
      title: 'Speak & Register',
      body: "Receptionist speaks the patient's details. Sarvam AI extracts name, phone, and complaint instantly.",
    },
    {
      number: '2',
      title: 'Realtime Queue',
      body: "The patient appears on the doctor's screen and the waiting room display automatically.",
    },
    {
      number: '3',
      title: 'AI Consult Notes',
      body: 'Doctor dictates the consultation. The system generates structured SOAP notes and prescriptions.',
    },
  ];

  return (
    <div className="landing-page landing-page-clone">
      <section className="landing-hero landing-hero-clone">
        <div className="max-w-7xl px-4 landing-hero-grid landing-hero-grid-clone">
          <div className="landing-hero-copy landing-hero-copy-clone">
            <h1 className="landing-hero-title landing-hero-title-clone">
              <span>Faster</span>
              <span>intake.</span>
              <span>Clearer</span>
              <span>queues.</span>
              <span>Better clinic.</span>
            </h1>
          </div>

          <aside className="landing-workstream-panel landing-workstream-panel-clone">
            <div className="landing-workstream-kicker">One system, three workstreams</div>
            <div className="landing-workstream-list">
              {workstreams.map((item) => (
                <div key={item} className="landing-workstream-item landing-workstream-item-clone">
                  <span>{item}</span>
                  <span aria-hidden="true">→</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="max-w-7xl px-4 landing-flow landing-flow-clone">
        <h2 className="landing-flow-title">Seamless patient flow from door to discharge.</h2>
        <div className="landing-flow-grid">
          {flowSteps.map((step) => (
            <div key={step.number} className="landing-flow-step">
              <div className="landing-flow-track">
                <span className="landing-flow-number">{step.number}</span>
              </div>
              <h3 className="landing-flow-step-title">{step.title}</h3>
              <p className="landing-flow-step-body">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl px-4 landing-cta-wrap landing-cta-wrap-clone">
        <div className="landing-cta landing-cta-clone">
          <div style={{ display: 'grid', gap: '1rem', justifyItems: 'center', textAlign: 'center' }}>
            <h2 className="landing-cta-title">Ready to upgrade your clinic?</h2>
            <p className="landing-cta-body">
              Join the voice-first revolution and streamline your operations today.
            </p>
            <Link href="/onboard" className="nh-btn nh-btn-secondary" style={{ background: '#fff', minWidth: '15rem' }}>
              Register Clinic Now
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
