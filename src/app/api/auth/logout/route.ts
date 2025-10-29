import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { APIResponse, LogoutResponse } from "@/lib/types/api";

// Force Node.js runtime for cookies() support
export const runtime = 'nodejs';

export async function POST() {
  try {
    const supabase = await createClient();

    // Sign out the user
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      return NextResponse.json(
        {
          error: {
            code: "LOGOUT_FAILED",
            message: "Failed to log out",
          },
        } as APIResponse,
        { status: 500 }
      );
    }

    // Return successful logout response
    const response: APIResponse<LogoutResponse> = {
      data: {
        message: "Logged out successfully",
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Logout API error:", error);
    
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "An internal error occurred",
        },
      } as APIResponse,
      { status: 500 }
    );
  }
}