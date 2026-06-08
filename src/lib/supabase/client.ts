import { createBrowserClient } from "@supabase/ssr";
import { validateNonProductionSupabaseEnvironment } from "@/lib/env/non-production-supabase-guard";

export function createClient() {
  validateNonProductionSupabaseEnvironment();

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    }
  );
}

