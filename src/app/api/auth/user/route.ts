import { NextRequest, NextResponse } from "next/server";
import { createAPIClient } from "@/lib/supabase/server-api";

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/user
 * Get current authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createAPIClient(request);

    // Get current authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Ej autentiserad" }, { status: 401 });
    }

    // Get user record from users table
    const { data: userData, error: dbError } = await supabase
      .from("users")
      .select("id, email, role, is_active, created_at, last_active_at")
      .eq("auth_user_id", user.id)
      .single();

    if (dbError) {
      console.error("[API /auth/user] Misslyckades att hämta användaren:", dbError);
      return NextResponse.json(
        { error: "Misslyckades att hämta användarens data" },
        { status: 500 }
      );
    }

    if (!userData) {
      return NextResponse.json({ error: "Användaren hittades inte" }, { status: 404 });
    }

    if (!userData.is_active) {
      return NextResponse.json(
        { error: "Kontot är inaktiverat" },
        { status: 403 }
      );
    }

    // Return user with auth_id
    return NextResponse.json({
      ...userData,
      auth_id: user.id,
    });
  } catch (error) {
    console.error("[API /auth/user] Oväntat fel:", error);
    return NextResponse.json(
      { error: "Internt serverfel" },
      { status: 500 }
    );
  }
}
