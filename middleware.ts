import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { shouldUpdateActivity } from './src/lib/server/utils/activity-tracker';

// Routes that don't require authentication (excluding /login which needs special handling)
const PUBLIC_ROUTES = ['/api/auth/login', '/api/health'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Allow public API routes that don't need auth checks
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Skip middleware for static files, API routes, PWA files
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname === '/manifest.json' ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

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
    const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));
    
    if (isAdminRoute && userRole !== 'hr_admin') {
      const redirectUrl = new URL('/dashboard', request.url);
      return NextResponse.redirect(redirectUrl);
    }

    // Track user activity if authenticated
    if (user) {
      // Fetch application user record to get last_active_at
      const { data: appUser, error: fetchError } = await supabase
        .from('users')
        .select('id, last_active_at')
        .eq('auth_user_id', user.id)
        .single();

      // Update activity asynchronously (fire-and-forget pattern)
      if (appUser && shouldUpdateActivity(appUser.last_active_at)) {
        // Don't await - let it run in background (non-blocking)
        void (async () => {
          try {
            const { error: updateError } = await supabase
              .from('users')
              .update({ last_active_at: new Date().toISOString() })
              .eq('id', appUser.id);
            
            if (updateError) {
              console.error('[Middleware] Update error:', updateError);
            }
          } catch (error) {
            // Silently fail - activity tracking shouldn't break requests
            console.error('[Middleware] Failed to update user activity:', error);
          }
        })();
      }
    }

    // Redirect to login if not authenticated (except on login page itself)
    if (!user && !pathname.startsWith('/login') && pathname !== '/') {
      const redirectUrl = new URL('/login', request.url);
      return NextResponse.redirect(redirectUrl);
    }

    // Redirect authenticated users from root to dashboard
    if (user && pathname === '/') {
      const redirectUrl = new URL('/dashboard', request.url);
      return NextResponse.redirect(redirectUrl);
    }

    // Redirect to dashboard if authenticated user tries to access login
    if (user && pathname.startsWith('/login')) {
      const redirectUrl = new URL('/dashboard', request.url);
      return NextResponse.redirect(redirectUrl);
    }

    // Return response with any cookies set by Supabase
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
