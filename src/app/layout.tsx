import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Swasthya Clinic | Voice-First Appointment Management',
  description: 'Swasthya Clinic — Voice-first patient appointment management for Indian clinics. Kannada & Hindi support.',
};

function StethoscopeIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="20" cy="20" r="20" fill="#0891b2"/>
      <path d="M13 12c0-1.1.9-2 2-2h2c1.1 0 2 .9 2 2v6c0 3.3-2.7 6-6 6v2c0 2.2 1.8 4 4 4s4-1.8 4-4v-1.1c1.7-.4 3-2 3-3.9V14" 
            stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="27" cy="13" r="2" stroke="white" strokeWidth="1.8"/>
    </svg>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>
        <header className="bda-header">
          <div className="max-w-7xl px-4 bda-header-inner">
            <Link href="/" className="bda-brand">
              <div className="bda-seal" aria-hidden="true">
                <StethoscopeIcon />
              </div>
              <div className="bda-brand-text">
                <span className="bda-brand-kannada">ಸ್ವಾಸ್ಥ್ಯ ಕ್ಲಿನಿಕ್</span>
                <span className="bda-brand-english">Swasthya Clinic</span>
              </div>
              <div className="bda-prism-badge">VOICE-FIRST</div>
            </Link>

            <nav className="bda-nav">
              <Link href="/onboard" className="bda-nav-link">Register Clinic</Link>
            </nav>
          </div>
        </header>

        <main>
          {children}
        </main>

        <footer className="bda-footer">
          <div className="max-w-7xl px-4">
            <StethoscopeIcon />
            <span>Swasthya Clinic — Voice-first appointment management</span>
            <span className="bda-footer-sep">|</span>
            <span>ಕನ್ನಡ · हिंदी · English</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
