import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/lib/session';

export async function POST(request: NextRequest) {
  const loginUrl = new URL('/login', request.nextUrl);
  const response = NextResponse.redirect(loginUrl);
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return response;
}
