import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const PUBLIC_PATHS = ['/onboard', '/api', '/_next', '/favicon', '/file.svg', '/globe.svg'];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(p => pathname.startsWith(p));
}

function getSlugFromHost(host: string): string | null {
  // drsharma.swasthya-clinic.vercel.app → drsharma
  // drsharma.swasthya.app → drsharma
  // localhost:3000 → null (dev: no tenant isolation)
  if (host.includes('localhost') || host.includes('127.0.0.1')) return null;

  const parts = host.split('.');
  if (parts.length >= 3) return parts[0]; // subdomain
  return null; // custom domain — use full host
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) return NextResponse.next();

  const host = request.headers.get('host') ?? '';
  const slug = getSlugFromHost(host);

  // Dev: skip tenant resolution
  if (!slug && (host.includes('localhost') || host.includes('127.0.0.1'))) {
    return NextResponse.next();
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  let clinicId: string | null = null;

  if (slug) {
    const { data } = await supabase
      .from('clinics')
      .select('id')
      .eq('slug', slug)
      .single();
    clinicId = data?.id ?? null;
  } else {
    // custom domain fallback
    const { data } = await supabase
      .from('clinics')
      .select('id')
      .eq('custom_domain', host)
      .single();
    clinicId = data?.id ?? null;
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
