import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import { headers } from 'next/headers';
import BrandMark from '@/components/BrandMark';

export const metadata: Metadata = {
  title: 'Sarvam Clinic | Clinic Operations Platform',
  description: 'Sarvam Clinic — a queue-first clinic flow system for Indian OPD clinics, covering intake, live queue, consultation, continuity, and patient token tracking.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headerList = await headers();
  const isClinicScopedPage = Boolean(headerList.get('x-clinic-id'));

  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <header className="bda-header">
          <div className="max-w-7xl px-4 bda-header-shell">
            <div className="bda-header-main">
              <Link href="/" className="bda-brand">
                <div className="bda-seal" aria-hidden="true">
                  <BrandMark size={56} />
                </div>
                <div className="bda-brand-text">
                  <span className="bda-brand-english">Sarvam Clinic</span>
                  <span className="bda-brand-kicker">Powered by Sarvam AI</span>
                </div>
                <div className="bda-prism-badge">VOICE-FIRST</div>
              </Link>

              {!isClinicScopedPage && (
                <nav className="bda-nav">
                  <Link href="/login" className="bda-nav-link">
                    Staff Login
                  </Link>
                  <Link href="/onboard" className="bda-nav-link bda-nav-link--primary">
                    Register Clinic
                  </Link>
                </nav>
              )}
            </div>
          </div>
        </header>

        <main>
          {children}
        </main>

        <footer className="bda-footer">
          <div className="max-w-7xl px-4">
            <div className="bda-footer-copy">
              <div style={{ display: 'grid', gap: '1.2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                  <div className="bda-footer-mark" aria-hidden="true">
                    <BrandMark size={36} />
                  </div>
                  <div>
                    <div className="bda-footer-title">Sarvam Clinic</div>
                  </div>
                </div>
                <div className="bda-footer-legal">© 2026 Sarvam Clinic Systems. All rights reserved.</div>
              </div>
            </div>
            <div className="bda-footer-links">
              <div>
                <div className="bda-footer-heading">Product</div>
                <div className="bda-footer-link-list">
                  <span>Features</span>
                  <span>Pricing</span>
                  <span>Security</span>
                </div>
              </div>
              <div>
                <div className="bda-footer-heading">Resources</div>
                <div className="bda-footer-link-list">
                  <span>Documentation</span>
                  <span>User Guides</span>
                  <span>Help Center</span>
                </div>
              </div>
              <div>
                <div className="bda-footer-heading">Legal</div>
                <div className="bda-footer-link-list">
                  <span>Privacy Policy</span>
                  <span>Terms of Service</span>
                  <Link href="/login" className="nh-link">Staff Login</Link>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
