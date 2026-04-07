import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSession, COOKIE_NAME, SESSION_TTL_SECONDS } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json() as { email?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    // Use anon key for auth — signInWithPassword works with anon key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    // Look up clinic membership
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: clinicUser, error: cuError } = await serviceClient
      .from('clinic_users')
      .select('clinic_id, role, clinics(slug)')
      .eq('auth_user_id', authData.user.id)
      .single();

    if (cuError || !clinicUser) {
      return NextResponse.json({ error: 'No clinic account found for this user.' }, { status: 403 });
    }

    const clinicsRaw = clinicUser.clinics as unknown;
    const clinicsObj = Array.isArray(clinicsRaw) ? clinicsRaw[0] : clinicsRaw;
    const slug = (clinicsObj as { slug?: string } | null)?.slug;
    if (!slug) {
      return NextResponse.json({ error: 'Clinic configuration error.' }, { status: 500 });
    }

    const sessionToken = createSession({
      userId: authData.user.id,
      clinicId: clinicUser.clinic_id,
      role: clinicUser.role,
      slug,
    });

    const response = NextResponse.json({ slug, role: clinicUser.role });
    response.cookies.set(COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_TTL_SECONDS,
      path: '/',
    });

    return response;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Login failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
