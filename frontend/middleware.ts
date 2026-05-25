import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const { pathname } = request.nextUrl;

  const isPublicPage = pathname === '/signin' || pathname === '/forgot-password' || pathname.startsWith('/reset-password');

  if (!token && !isPublicPage) {
    return NextResponse.redirect(new URL('/signin', request.url));
  }

  if (token && isPublicPage && pathname === '/signin') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
