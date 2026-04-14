import Link from 'next/link';
import BrandLockup from '@/components/BrandLockup';

type Props = {
  title: string;
  message: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export default function ClinicFallbackPage({
  title,
  message,
  primaryHref = '/onboard',
  primaryLabel = 'Register New Clinic',
  secondaryHref = '/',
  secondaryLabel = 'Back to Home',
}: Props) {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '2rem 1rem',
        background:
          'radial-gradient(circle at top left, rgba(80, 130, 255, 0.12), transparent 34%), radial-gradient(circle at top right, rgba(118, 207, 255, 0.14), transparent 30%), var(--color-bg)',
      }}
    >
      <section
        style={{
          width: 'min(100%, 36rem)',
          background: 'rgba(255,255,255,0.94)',
          border: '1px solid var(--color-border)',
          borderRadius: '1.75rem',
          boxShadow: 'var(--shadow-md)',
          padding: '2rem',
          display: 'grid',
          gap: '1.25rem',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'grid', gap: '0.85rem', justifyItems: 'center' }}>
          <BrandLockup markSize={76} titleSize="lg" stacked />
          <div
            style={{
              width: '4.5rem',
              height: '4.5rem',
              display: 'grid',
              placeItems: 'center',
              borderRadius: '999px',
              background: 'rgba(3, 78, 162, 0.08)',
              color: 'var(--color-primary)',
              fontSize: '2rem',
            }}
          >
            🏥
          </div>
        </div>

        <div style={{ display: 'grid', gap: '0.65rem' }}>
          <h1 style={{ margin: 0, fontSize: 'clamp(1.75rem, 3vw, 2.4rem)', fontWeight: 800, color: 'var(--color-text)' }}>
            {title}
          </h1>
          <p style={{ margin: 0, color: 'var(--color-text-muted)', lineHeight: 1.65 }}>
            {message}
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.85rem' }}>
          <Link
            href={primaryHref}
            style={{
              padding: '0.85rem 1.4rem',
              borderRadius: '999px',
              background: 'var(--color-primary)',
              color: 'white',
              textDecoration: 'none',
              fontWeight: 700,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {primaryLabel}
          </Link>
          <Link
            href={secondaryHref}
            style={{
              padding: '0.85rem 1.4rem',
              borderRadius: '999px',
              background: 'white',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            {secondaryLabel}
          </Link>
        </div>
      </section>
    </main>
  );
}
