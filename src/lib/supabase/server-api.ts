import { createServerClient } from "@supabase/ssr";
import { NextRequest } from "next/server";

/**
 * Create Supabase client for API routes (Node runtime)
 * 
 * WORKAROUND for Next.js 16.0.7 cookies() issue in Vercel production
 * where cookies() returns empty but request headers contain cookies.
 * 
 * Usage in API routes:
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const supabase = createAPIClient(request);
 *   // ... use supabase
 * }
 * ```
 */
export function createAPIClient(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
      cookies: {
        getAll() {
          // Read directly from request cookies instead of cookies() function
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Cannot set cookies in API routes - this is handled by middleware
          // API routes should be read-only for auth
        },
      },
    }
  );
}
