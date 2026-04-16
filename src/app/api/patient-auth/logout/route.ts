import { NextRequest, NextResponse } from 'next/server';
import { PATIENT_COOKIE_NAME } from '@/lib/session';

export async function POST(request: NextRequest) {
  const nextPath = request.nextUrl.searchParams.get('next')?.trim();
  const safeNextPath = nextPath?.startsWith('/') ? nextPath : null;
  const response = NextResponse.redirect(
    new URL(safeNextPath ?? '/', request.nextUrl),
    303
  );

  response.cookies.set(PATIENT_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  return response;
}
