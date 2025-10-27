import { NextResponse } from "next/server";
import { requireAuthAPI, createErrorResponse } from "@/lib/server/auth";
import type { APIResponse } from "@/lib/types/api";

// Example protected API route - requires any authenticated user
export async function GET() {
  try {
    // Require authentication (any role)
    const user = await requireAuthAPI();

    const response: APIResponse = {
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          is_active: user.is_active,
          created_at: user.created_at,
        },
        message: "Profile retrieved successfully",
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Profile API error:", error);
    return createErrorResponse(error);
  }
}