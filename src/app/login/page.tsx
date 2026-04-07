import LoginForm from './LoginForm';

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  return (
    <main style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
      display: 'grid',
      placeItems: 'center',
      padding: '1rem',
    }}>
      <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '3rem', height: '3rem', borderRadius: '999px',
            background: 'var(--color-primary)', display: 'grid',
            placeItems: 'center', margin: '0 auto 0.75rem',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Swasthya Clinic</h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>Sign in to your clinic</p>
        </div>

        <LoginForm searchParams={searchParams} />
      </div>
    </main>
  );
}
