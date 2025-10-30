import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './src/i18n';

// Routes that don't require authentication (excluding /login which needs special handling)
const PUBLIC_ROUTES = ['/api/auth/login', '/api/health'];

// Create next-intl middleware
const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public API routes that don't need auth checks
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Skip locale handling for static files and API routes
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Extract locale from pathname
  const pathSegments = pathname.split('/').filter(Boolean);
  const firstSegment = pathSegments[0];
  const isValidLocale = locales.includes(firstSegment as (typeof locales)[number]);
  
  // If no locale in path, let intl middleware handle the redirect
  if (!isValidLocale) {
    return intlMiddleware(request);
  }

  const locale = firstSegment;
  const pathWithoutLocale = pathname.slice(locale.length + 1) || '/';

  // Create response with intl middleware
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  try {
    // Create Supabase client for Edge Runtime
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value);
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    // Refresh session if expired
    const { data: { user } } = await supabase.auth.getUser();

    // Redirect to login if not authenticated (except on login page itself)
    if (!user && !pathWithoutLocale.startsWith('/login') && pathWithoutLocale !== '/') {
      const redirectUrl = new URL(`/${locale}/login`, request.url);
      return NextResponse.redirect(redirectUrl);
    }

    // Redirect authenticated users from root to dashboard
    if (user && pathWithoutLocale === '/') {
      const redirectUrl = new URL(`/${locale}/dashboard`, request.url);
      return NextResponse.redirect(redirectUrl);
    }

    // Redirect to dashboard if authenticated user tries to access login
    if (user && pathWithoutLocale.startsWith('/login')) {
      const redirectUrl = new URL(`/${locale}/dashboard`, request.url);
      return NextResponse.redirect(redirectUrl);
    }

    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    // On error, allow the request to continue to avoid blocking the app
    return intlMiddleware(request);
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
