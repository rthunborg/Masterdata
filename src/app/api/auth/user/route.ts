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

    // Get current session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getUser();

    if (sessionError || !session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get user record from users table
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, email, role, is_active, created_at, last_active_at")
      .eq("auth_user_id", session.user.id)
      .single();

    if (userError) {
      console.error("[API /auth/user] Failed to fetch user:", userError);
      return NextResponse.json(
        { error: "Failed to fetch user data" },
        { status: 500 }
      );
    }

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!userData.is_active) {
      return NextResponse.json(
        { error: "Account is deactivated" },
        { status: 403 }
      );
    }

    // Return user with auth_id
    return NextResponse.json({
      ...userData,
      auth_id: session.user.id,
    });
  } catch (error) {
    console.error("[API /auth/user] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
