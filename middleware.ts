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

  // Handle locale routing first
  const intlResponse = intlMiddleware(request);

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

    // Extract locale from pathname
    const locale = pathname.split('/')[1];
    const isValidLocale = locales.includes(locale as (typeof locales)[number]);
    const pathWithoutLocale = isValidLocale ? pathname.slice(locale.length + 1) : pathname;

    // Redirect to login if not authenticated
    if (!user && !pathWithoutLocale.startsWith('/login')) {
      const redirectUrl = new URL(`/${locale}/login`, request.url);
      return NextResponse.redirect(redirectUrl);
    }

    // Redirect to dashboard if authenticated user tries to access login
    if (user && pathWithoutLocale === '/login') {
      const redirectUrl = new URL(`/${locale}/dashboard`, request.url);
      return NextResponse.redirect(redirectUrl);
    }

    return intlResponse || response;
  } catch (error) {
    console.error('Middleware error:', error);
    // On error, allow the request to continue to avoid blocking the app
    return response;
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
