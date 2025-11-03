import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import createMiddleware from 'next-intl/middleware';
import { locales } from './src/i18n';
import { shouldUpdateActivity } from './src/lib/server/utils/activity-tracker';

// Routes that don't require authentication (excluding /login which needs special handling)
const PUBLIC_ROUTES = ['/api/auth/login', '/api/health'];

// Create next-intl middleware with Swedish as default
const intlMiddleware = createMiddleware({
  locales,
  defaultLocale: 'sv', // Default to Swedish
  localePrefix: 'always',
});

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log('[Middleware] Processing:', pathname);

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

  // Extract locale from pathname to check if valid
  const pathSegments = pathname.split('/').filter(Boolean);
  const firstSegment = pathSegments[0];
  const isValidLocale = locales.includes(firstSegment as (typeof locales)[number]);
  
  // If no valid locale, let intl middleware handle it (it will redirect)
  if (!isValidLocale) {
    return intlMiddleware(request);
  }

  const locale = firstSegment;
  const pathWithoutLocale = pathname.slice(locale.length + 1) || '/';

  try {
    // Create a response that will be returned
    const response = NextResponse.next();
    
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

    // Get user role for authorization checks
    let userRole: string | null = null;
    if (user) {
      const { data: appUser } = await supabase
        .from('users')
        .select('role')
        .eq('auth_user_id', user.id)
        .single();
      
      userRole = appUser?.role || null;
    }

    // Protect admin-only routes
    const adminRoutes = ['/dashboard/important-dates', '/dashboard/admin/users', '/dashboard/admin/columns'];
    const isAdminRoute = adminRoutes.some(route => pathWithoutLocale.startsWith(route));
    
    if (isAdminRoute && userRole !== 'hr_admin') {
      console.log('[Middleware] Access denied to admin route:', pathWithoutLocale, 'User role:', userRole);
      const redirectUrl = new URL(`/${locale}/dashboard`, request.url);
      return NextResponse.redirect(redirectUrl);
    }

    // Track user activity if authenticated
    if (user) {
      console.log('[Middleware] Authenticated user detected:', user.id);
      
      // Fetch application user record to get last_active_at
      const { data: appUser, error: fetchError } = await supabase
        .from('users')
        .select('id, last_active_at')
        .eq('auth_user_id', user.id)
        .single();
      
      console.log('[Middleware] App user fetch result:', { 
        appUser, 
        fetchError,
        shouldUpdate: appUser ? shouldUpdateActivity(appUser.last_active_at) : false 
      });
      
      // Update activity asynchronously (fire-and-forget pattern)
      if (appUser && shouldUpdateActivity(appUser.last_active_at)) {
        console.log('[Middleware] Updating last_active_at for user:', appUser.id);
        
        // Don't await - let it run in background (non-blocking)
        void (async () => {
          try {
            const { error: updateError } = await supabase
              .from('users')
              .update({ last_active_at: new Date().toISOString() })
              .eq('id', appUser.id);
            
            if (updateError) {
              console.error('[Middleware] Update error:', updateError);
            } else {
              console.log('[Middleware] ✓ Successfully updated last_active_at');
            }
          } catch (error) {
            // Silently fail - activity tracking shouldn't break requests
            console.error('[Middleware] Failed to update user activity:', error);
          }
        })();
      } else {
        console.log('[Middleware] Skipping update - no user or within throttle window');
      }
    }

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

    // Return intl response with any cookies set by Supabase
    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    // On error, allow the request to continue to avoid blocking the app
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
