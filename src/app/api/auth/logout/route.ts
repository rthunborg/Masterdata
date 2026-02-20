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
      console.error("Logout fel:", error);
      return NextResponse.json(
        {
          error: {
            code: "LOGOUT_FAILED",
            message: "Misslyckades att logga ut",
          },
        } as APIResponse,
        { status: 500 }
      );
    }

    // Return successful logout response
    const response: APIResponse<LogoutResponse> = {
      data: {
        message: "Utloggad",
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Logout API fel:", error);
    
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Ett internt fel uppstod",
        },
      } as APIResponse,
      { status: 500 }
    );
  }
}