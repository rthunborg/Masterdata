import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import LoginForm from "./login-form";
import { validateNonProductionSupabaseEnvironment } from "@/lib/env/non-production-supabase-guard";

// Force dynamic rendering - this page checks auth status with cookies
export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  validateNonProductionSupabaseEnvironment();

  // Create server-side Supabase client
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // In Server Components, we can't set cookies
          // Let the middleware handle cookie refresh
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set({
                name,
                value,
                ...options,
              });
            });
          } catch {
            // Ignore - middleware will handle session refresh
          }
        },
      },
    }
  );

  // Check authentication status server-side
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect authenticated users to dashboard BEFORE rendering
  if (user) {
    redirect('/dashboard');
  }

  // Only render login form for unauthenticated users
  return <LoginForm />;
}
