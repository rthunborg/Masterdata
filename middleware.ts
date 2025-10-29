import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/api/auth/login', '/api/health'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

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

    // Redirect to login if not authenticated
    if (!user && !pathname.startsWith('/login')) {
      const redirectUrl = new URL('/login', request.url);
      return NextResponse.redirect(redirectUrl);
    }

    // Redirect to dashboard if authenticated user tries to access login
    if (user && pathname === '/login') {
      const redirectUrl = new URL('/dashboard', request.url);
      return NextResponse.redirect(redirectUrl);
    }

    return response;
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
