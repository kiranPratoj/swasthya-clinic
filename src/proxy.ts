import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySession, COOKIE_NAME } from '@/lib/session';

// Public paths — no auth required
const PUBLIC_PREFIXES = [
  '/onboard',
  '/login',
  '/api',
  '/_next',
  '/favicon',
  '/file.svg',
  '/globe.svg',
];

// Clinic-scoped paths that are public (patient self-booking)
const PUBLIC_SLUG_SUFFIXES = ['/book'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

function isPublicSlugPath(pathname: string): boolean {
  return PUBLIC_SLUG_SUFFIXES.some((s) => pathname.endsWith(s) || pathname.includes(s + '/'));
}

function getSlugFromHost(host: string): string | null {
  const bare = host.split(':')[0];
  const parts = bare.split('.');
  if (parts.length === 3 && !bare.endsWith('.vercel.app')) return parts[0];
  if (parts.length >= 4 && bare.endsWith('.vercel.app')) return parts[0];
  return null;
}

function getSlugFromPathname(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  return segments[0] ?? null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public paths
  if (isPublicPath(pathname)) return NextResponse.next();

  // Root path — allow (landing page)
  if (pathname === '/') return NextResponse.next();

  const host = request.headers.get('host') ?? '';
  const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');

  const subdomainSlug = getSlugFromHost(host);
  const slug = subdomainSlug ?? getSlugFromPathname(pathname);

  if (!slug) return NextResponse.next();

  // ── Resolve clinic ────────────────────────────────────────────────────────
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  let clinicId: string | null = null;

  const { data } = await supabase
    .from('clinics').select('id').eq('slug', slug).single();
  clinicId = data?.id ?? null;

  if (!clinicId && !subdomainSlug && !isLocalhost) {
    const { data: domainData } = await supabase
      .from('clinics').select('id').eq('custom_domain', host.split(':')[0]).single();
    clinicId = domainData?.id ?? null;
  }

  if (!clinicId) {
    return new NextResponse('Clinic not found', { status: 404 });
  }

  // ── Auth check for protected clinic routes ────────────────────────────────
  const isPublicSlug = isPublicSlugPath(pathname);

  if (!isPublicSlug) {
    const sessionCookie = request.cookies.get(COOKIE_NAME)?.value;
    const session = sessionCookie ? verifySession(sessionCookie) : null;

    if (!session) {
      const loginUrl = new URL('/login', request.nextUrl);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Verify session belongs to this clinic
    if (session.clinicId !== clinicId) {
      return new NextResponse('Access denied', { status: 403 });
    }

    const response = NextResponse.next();
    response.headers.set('x-clinic-id', clinicId);
    response.headers.set('x-user-id', session.userId);
    response.headers.set('x-user-role', session.role);
    return response;
  }

  // Public slug route (e.g. /book) — inject clinic but no auth needed
  const response = NextResponse.next();
  response.headers.set('x-clinic-id', clinicId);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
