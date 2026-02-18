import { NextRequest, NextResponse } from "next/server";
import { createAPIClient } from "@/lib/supabase/server-api";
import { cookies, headers } from "next/headers";

/**
 * DEBUG ENDPOINT - Remove after investigation
 * Checks authentication state and Supabase connection
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    
    // Also check headers directly
    const headersList = await headers();
    const cookieHeader = headersList.get('cookie');
    
    const supabase = createAPIClient(request);
    
    // Check 1: Can we connect to Supabase?
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    // Check 2: If user exists, can we query users table?
    let userData = null;
    let dbError = null;
    if (user) {
      const result = await supabase
        .from("users")
        .select("id, email, role, is_active")
        .eq("auth_user_id", user.id)
        .single();
      
      userData = result.data;
      dbError = result.error;
    }
    
    // Check 3: Cookie info
    const supabaseCookies = allCookies.filter(c => 
      c.name.startsWith('sb-')
    );
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + "...",
      },
      auth: {
        hasAuthUser: !!user,
        userId: user?.id || null,
        userError: userError?.message || null,
      },
      database: {
        hasUserRecord: !!userData,
        userEmail: userData?.email || null,
        userRole: userData?.role || null,
        isActive: userData?.is_active || null,
        dbError: dbError?.message || null,
        dbErrorDetails: dbError ? JSON.stringify(dbError) : null,
      },
      cookies: {
        total: allCookies.length,
        supabaseCookies: supabaseCookies.length,
        supabaseCookieNames: supabaseCookies.map(c => c.name),
        cookieHeader: cookieHeader?.substring(0, 100) || null,
        hasCookieHeader: !!cookieHeader,
      },
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : null,
    }, { status: 500 });
  }
}
