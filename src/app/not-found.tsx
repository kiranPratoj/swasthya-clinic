import Link from 'next/link';
import BrandMark from '@/components/BrandMark';

export default function NotFound() {
  return (
    <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '1.5rem', padding: '2rem' }}>
      <BrandMark size={88} />
      <h1 style={{ fontSize: '5rem', fontWeight: 900, color: 'var(--color-primary)', lineHeight: 1 }}>404</h1>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)' }}>Page not found</h2>
      <p style={{ color: 'var(--color-text-muted)', maxWidth: '400px' }}>
        The page you are looking for doesn&apos;t exist or has been moved.
      </p>
      <Link href="/" className="nh-btn nh-btn-primary" style={{ marginTop: '1rem' }}>
        Go Home
      </Link>
    </div>
  );
}
