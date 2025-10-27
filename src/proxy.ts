import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Check if there's a session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If accessing login page and already authenticated, redirect to dashboard
  if (request.nextUrl.pathname === "/login" && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If accessing protected routes without authentication, redirect to login
  if ((request.nextUrl.pathname.startsWith("/dashboard") || 
       request.nextUrl.pathname.startsWith("/admin")) && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If user is authenticated, fetch user role and validate access
  if (session && (request.nextUrl.pathname.startsWith("/dashboard") || 
                  request.nextUrl.pathname.startsWith("/admin"))) {
    try {
      const { data: userData, error } = await supabase
        .from("users")
        .select("id, role, is_active")
        .eq("auth_user_id", session.user.id)
        .single();

      // If no user record found or user is inactive, redirect to login
      if (error || !userData || !userData.is_active) {
        const redirectResponse = NextResponse.redirect(new URL("/login", request.url));
        // Clear the session
        await supabase.auth.signOut();
        return redirectResponse;
      }

      // Admin route protection - only hr_admin can access /admin/* routes
      if (request.nextUrl.pathname.startsWith("/admin") && userData.role !== "hr_admin") {
        return NextResponse.redirect(new URL("/403", request.url));
      }

      // Attach user role to request headers for downstream consumption
      const newResponse = NextResponse.next({
        request: {
          headers: new Headers(request.headers),
        },
      });
      
      newResponse.headers.set("x-user-id", userData.id);
      newResponse.headers.set("x-user-role", userData.role);
      
      return newResponse;
    } catch {
      // If there's an error checking user status, redirect to login
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (they handle auth internally)
     */
    "/((?!_next/static|_next/image|favicon.ico|public/|api/).*)",
  ],
};