import Link from 'next/link';

export default function ClinicNotFound() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '1rem', padding: '2rem' }}>
      <div style={{ fontSize: '4rem' }}>🏥</div>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text)' }}>Clinic not found</h1>
      <p style={{ color: 'var(--color-text-muted)', maxWidth: '440px', lineHeight: 1.6 }}>
        The clinic you are trying to access doesn&apos;t exist or this page is unavailable.
      </p>
      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
        <Link href="/onboard" style={{
          padding: '0.75rem 1.5rem', background: 'var(--color-primary)', color: 'white',
          borderRadius: 'var(--radius-md)', fontWeight: 600, textDecoration: 'none'
        }}>
          Register New Clinic
        </Link>
        <Link href="/" style={{
          padding: '0.75rem 1.5rem', background: 'white', color: 'var(--color-text)',
          borderRadius: 'var(--radius-md)', fontWeight: 600, textDecoration: 'none', border: '1px solid var(--color-border)'
        }}>
          Back to Home
        </Link>
      </div>
    </div>
  );
}
