import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import { headers } from 'next/headers';
import BrandMark from '@/components/BrandMark';
import BrandLockup from '@/components/BrandLockup';
import NavDemoButton from '@/components/landing/NavDemoButton';

export const metadata: Metadata = {
  title: 'Medilite AI | Voice-First Clinic Flow',
  description: 'Smart clinic flow and continuity platform for Indian clinics.',
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
                <div className="bda-seal">
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="20" cy="20" r="20" fill="#0891b2"/>
                    <path d="M13 12c0-1.1.9-2 2-2h2c1.1 0 2 .9 2 2v6c0 3.3-2.7 6-6 6v2c0 2.2 1.8 4 4 4s4-1.8 4-4v-1.1c1.7-.4 3-2 3-3.9V14" 
                          stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="27" cy="13" r="2" stroke="white" strokeWidth="1.8"/>
                  </svg>
                </div>
                <div className="bda-brand-text">
                  <span className="bda-brand-english">Medilite AI</span>
                </div>
              </Link>

              {!isClinicScopedPage && (
                <>
                <nav className="bda-nav bda-nav--desktop">
                  <Link href="/#wa-intake" className="bda-nav-link bda-nav-link--ghost">
                    WhatsApp Intake
                  </Link>
                  <Link href="/#live-queue" className="bda-nav-link bda-nav-link--ghost">
                    Live Queue
                  </Link>
                  <Link href="/#ai-scribe" className="bda-nav-link bda-nav-link--ghost">
                    AI Scribe
                  </Link>
                  <Link href="/#discharge" className="bda-nav-link bda-nav-link--ghost">
                    Discharge
                  </Link>
                  <NavDemoButton />
                </nav>
                <div className="bda-mobile-nav">
                  <details className="bda-mobile-menu">
                    <summary className="bda-mobile-menu-trigger">Menu</summary>
                    <div className="bda-mobile-menu-panel">
                      <Link href="/#wa-intake" className="bda-mobile-menu-link">
                        WhatsApp Intake
                      </Link>
                      <Link href="/#live-queue" className="bda-mobile-menu-link">
                        Live Queue
                      </Link>
                      <Link href="/#ai-scribe" className="bda-mobile-menu-link">
                        AI Scribe
                      </Link>
                      <Link href="/#discharge" className="bda-mobile-menu-link">
                        Discharge
                      </Link>
                    </div>
                  </details>
                </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main>
          {children}
        </main>

        {isClinicScopedPage && <footer className="bda-footer">
          <div className="max-w-7xl px-4">
            <div className="bda-footer-copy">
              <div style={{ display: 'grid', gap: '1.2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                  <div className="bda-seal" aria-hidden="true" style={{ width: '36px', height: '36px' }}>
                    <svg width="36" height="36" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="20" cy="20" r="20" fill="#0891b2"/>
                      <path d="M13 12c0-1.1.9-2 2-2h2c1.1 0 2 .9 2 2v6c0 3.3-2.7 6-6 6v2c0 2.2 1.8 4 4 4s4-1.8 4-4v-1.1c1.7-.4 3-2 3-3.9V14" 
                            stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="27" cy="13" r="2" stroke="white" strokeWidth="1.8"/>
                    </svg>
                  </div>
                  <div>
                    <div className="bda-footer-title">Medilite AI</div>
                    <div className="bda-footer-powered">Medical Excellence</div>
                  </div>
                </div>
                <div style={{ color: 'var(--color-text-muted)', maxWidth: '28rem' }}>
                  Voice-first clinic flow, continuity, and doctor-supportive AI for modern Indian clinics.
                </div>
                <div className="bda-footer-legal">© 2026 Medilite AI. All rights reserved.</div>
              </div>
            </div>
            <div className="bda-footer-links">
              <div>
                <div className="bda-footer-heading">Product</div>
                <div className="bda-footer-link-list">
                  <Link href="/#product" className="nh-link">Product</Link>
                  <Link href="/#workflow" className="nh-link">Workflow</Link>
                  <Link href="/#benefits" className="nh-link">Benefits</Link>
                </div>
              </div>
              <div>
                <div className="bda-footer-heading">Resources</div>
                <div className="bda-footer-link-list">
                  <Link href="/#sarvam" className="nh-link">Why Sarvam AI</Link>
                  <Link href="/#clinics" className="nh-link">Clinics</Link>
                  <Link href="/onboard" className="nh-link">Book Demo</Link>
                </div>
              </div>
              <div>
                <div className="bda-footer-heading">Contact</div>
                <div className="bda-footer-link-list">
                  <a href="mailto:Admin@wingspirelabs.com" className="nh-link">Admin@wingspirelabs.com</a>
                  <Link href="/login" className="nh-link">Staff Login</Link>
                </div>
              </div>
            </div>
          </div>
        </footer>}
      </body>
    </html>
  );
}
