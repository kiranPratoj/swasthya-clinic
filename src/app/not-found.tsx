import Link from 'next/link';

function StethoscopeIcon() {
  return (
    <svg width="80" height="80" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="20" fill="#0891b2"/>
      <path d="M13 12c0-1.1.9-2 2-2h2c1.1 0 2 .9 2 2v6c0 3.3-2.7 6-6 6v2c0 2.2 1.8 4 4 4s4-1.8 4-4v-1.1c1.7-.4 3-2 3-3.9V14" 
            stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="27" cy="13" r="2" stroke="white" strokeWidth="1.8"/>
    </svg>
  );
}

export default function NotFound() {
  return (
    <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '1.5rem', padding: '2rem' }}>
      <StethoscopeIcon />
      <h1 style={{ fontSize: '5rem', fontWeight: 900, color: 'var(--color-primary)', lineHeight: 1 }}>404</h1>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)' }}>Page not found</h2>
      <p style={{ color: 'var(--color-text-muted)', maxWidth: '400px' }}>
        The page you are looking for doesn&apos;t exist or has been moved.
      </p>
      <Link href="/" style={{
        marginTop: '1rem', padding: '0.75rem 1.5rem', background: 'var(--color-primary)', color: 'white',
        borderRadius: 'var(--radius-md)', fontWeight: 600, textDecoration: 'none'
      }}>
        Go Home
      </Link>
    </div>
  );
}
