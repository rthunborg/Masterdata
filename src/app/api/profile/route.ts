import { NextRequest, NextResponse } from "next/server";
import { requireAuthAPI, createErrorResponse } from "@/lib/server/auth";
import type { APIResponse } from "@/lib/types/api";

// Force Node.js runtime for cookies() support
export const runtime = 'nodejs';

// Example protected API route - requires any authenticated user
export async function GET(request: NextRequest) {
  try {
    // Require authentication (any role)
    const user = await requireAuthAPI(request);

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

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error("Profile API fel:", error);
    return createErrorResponse(error);
  }
}