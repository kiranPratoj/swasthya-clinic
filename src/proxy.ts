import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const PUBLIC_PATHS = ['/onboard', '/api', '/_next', '/favicon', '/file.svg', '/globe.svg'];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

// Returns a clinic slug from the subdomain only for real custom domains
// (4+ parts like drpriya.swasthya-clinic.vercel.app, or foo.example.com).
// Vercel deployment URLs (xxx.vercel.app) and localhost use path-based routing.
function getSlugFromHost(host: string): string | null {
  const bare = host.split(':')[0]; // strip port
  const parts = bare.split('.');

  // custom domain with subdomain: e.g. drpriya.example.com (3 parts, not vercel.app)
  if (parts.length === 3 && !bare.endsWith('.vercel.app')) return parts[0];

  // wildcard vercel subdomain: drpriya.swasthya-clinic.vercel.app (4 parts)
  if (parts.length >= 4 && bare.endsWith('.vercel.app')) return parts[0];

  return null;
}

function getSlugFromPathname(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  return segments[0] ?? null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) return NextResponse.next();

  const host = request.headers.get('host') ?? '';
  const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');

  // Use subdomain only for real custom/wildcard domains; path otherwise
  const subdomainSlug = getSlugFromHost(host);
  const slug = subdomainSlug ?? getSlugFromPathname(pathname);

  if (!slug) {
    return NextResponse.next();
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  let clinicId: string | null = null;

  // Slug from path/subdomain — look up by slug
  const { data } = await supabase
    .from('clinics')
    .select('id')
    .eq('slug', slug)
    .single();
  clinicId = data?.id ?? null;

  // If not found by slug and we're on a custom domain, try domain lookup
  if (!clinicId && !subdomainSlug && !isLocalhost) {
    const { data: domainData } = await supabase
      .from('clinics')
      .select('id')
      .eq('custom_domain', host.split(':')[0])
      .single();
    clinicId = domainData?.id ?? null;
  }

  if (!clinicId) {
    return new NextResponse('Clinic not found', { status: 404 });
  }

  const response = NextResponse.next();
  response.headers.set('x-clinic-id', clinicId);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
