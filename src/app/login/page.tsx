import LoginForm from './LoginForm';
import BrandMark from '@/components/BrandMark';

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, var(--color-bg) 0%, white 72%)',
      padding: '2rem 1rem',
    }}>
      <div className="max-w-7xl" style={{ width: '100%', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', alignItems: 'center' }}>
        <section style={{ display: 'grid', gap: '1rem', padding: '1rem 0' }}>
          <div className="nh-eyebrow">Staff access</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <BrandMark size={72} />
            <div>
              <h1 style={{ fontSize: '2.8rem', fontWeight: 800, color: 'var(--color-primary)', lineHeight: 1.02, letterSpacing: '-0.04em' }}>
                Sign in to your clinic.
              </h1>
            </div>
          </div>
          <p style={{ color: 'var(--color-text)', fontSize: '1.05rem', lineHeight: 1.7, maxWidth: '40rem' }}>
            Use the staff console to find patients by phone, create today&apos;s token, manage the live queue, and complete consultations without breaking clinic flow.
          </p>
          <div style={{ display: 'grid', gap: '0.8rem', maxWidth: '32rem' }}>
            {[
              'Fast phone-first intake at the front desk',
              'Live queue visibility for staff and doctors',
              'Patient token and visit history pages',
            ].map((item) => (
              <div key={item} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <span style={{ width: '0.55rem', height: '0.55rem', borderRadius: '999px', background: 'var(--color-error)' }} />
                <span style={{ fontWeight: 600 }}>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <div style={{ width: '100%', maxWidth: '430px', justifySelf: 'end', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ textAlign: 'left' }}>
            <div className="nh-eyebrow" style={{ marginBottom: '0.35rem' }}>Secure login</div>
            <p style={{ color: 'var(--color-text-muted)' }}>Enter your clinic credentials to open the staff console.</p>
          </div>
          <LoginForm searchParams={searchParams} />
        </div>
      </div>
    </main>
  );
}
