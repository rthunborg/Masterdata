import { NextResponse, type NextRequest } from "next/server";

/**
 * Simplified middleware for basic route protection
 * Auth validation is handled in page components and API routes
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check for Supabase auth cookie
  const authCookie = request.cookies.get('sb-access-token') || 
                     request.cookies.get('sb-refresh-token');
  
  const isAuthenticated = !!authCookie;

  // Redirect unauthenticated users from protected routes to login
  if (!isAuthenticated && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect authenticated users away from login
  if (isAuthenticated && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/login",
    "/admin/:path*",
  ],
};
