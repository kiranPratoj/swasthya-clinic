import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import BrandMark from '@/components/BrandMark';

export const metadata: Metadata = {
  title: 'Swasthya Clinic | Clinic Operations Platform',
  description: 'Swasthya Clinic — voice-first appointment management for Indian clinics, with queueing, booking, intake, and patient-facing token flows.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <header className="bda-header">
          <div className="max-w-7xl px-4 bda-header-shell">
            <div className="bda-header-meta">
              <span className="bda-header-meta-note">Voice-first clinic operations</span>
              <div className="bda-header-meta-links">
                <span>Queue management</span>
                <span>Online booking</span>
                <span>Patient tokens</span>
              </div>
            </div>

            <div className="bda-header-main">
              <Link href="/" className="bda-brand">
                <div className="bda-seal" aria-hidden="true">
                  <BrandMark size={56} />
                </div>
                <div className="bda-brand-text">
                  <span className="bda-brand-kannada">ಸ್ವಾಸ್ಥ್ಯ ಕ್ಲಿನಿಕ್</span>
                  <span className="bda-brand-kicker">Clinic system</span>
                  <span className="bda-brand-english">Swasthya Clinic</span>
                </div>
                <div className="bda-prism-badge">VOICE-FIRST</div>
              </Link>

              <nav className="bda-nav">
                <Link href="/login" className="bda-nav-link">
                  Staff Login
                </Link>
                <Link href="/onboard" className="bda-nav-link bda-nav-link--primary">
                  Register Clinic
                </Link>
              </nav>
            </div>
          </div>
        </header>

        <main>
          {children}
        </main>

        <footer className="bda-footer">
          <div className="max-w-7xl px-4">
            <div className="bda-footer-copy">
              <div className="bda-footer-mark" aria-hidden="true">
                <BrandMark size={36} />
              </div>
              <div>
                <div className="bda-footer-title">Swasthya Clinic</div>
                <div>Voice-first intake, queueing, booking, and patient communication for Indian clinics.</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span>ಕನ್ನಡ · हिंदी · English</span>
              <span className="bda-footer-sep">|</span>
              <Link href="/login" className="nh-link">Staff Login</Link>
              <span className="bda-footer-sep">|</span>
              <Link href="/onboard" className="nh-link">Start Onboarding</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
