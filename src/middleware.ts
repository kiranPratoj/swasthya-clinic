import { NextRequest, NextResponse } from 'next/server';

// Slug segments that are reserved app routes, not clinic slugs
const RESERVED_SLUGS = new Set(['onboard', 'api', '_next', 'favicon.ico']);

// Simple in-process cache: slug → clinic_id (resets on cold start)
const slugCache = new Map<string, string | null>();

async function resolveClinicId(slug: string): Promise<string | null> {
  if (slugCache.has(slug)) return slugCache.get(slug)!;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  try {
    const res = await fetch(
      `${url}/rest/v1/clinics?slug=eq.${encodeURIComponent(slug)}&select=id&limit=1`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Accept: 'application/json',
        },
      }
    );

    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ id: string }>;
    const id = rows[0]?.id ?? null;
    slugCache.set(slug, id);
    return id;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Extract first path segment as potential slug
  const slug = pathname.split('/')[1];

  if (!slug || RESERVED_SLUGS.has(slug)) {
    return NextResponse.next();
  }

  const clinicId = await resolveClinicId(slug);

  if (!clinicId) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  response.headers.set('x-clinic-id', clinicId);
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
