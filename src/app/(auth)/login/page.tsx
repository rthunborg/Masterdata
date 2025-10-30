import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import LoginForm from "./login-form";

export default async function LoginPage() {
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
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
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
    redirect("/dashboard");
  }

  // Only render login form for unauthenticated users
  return <LoginForm />;
}