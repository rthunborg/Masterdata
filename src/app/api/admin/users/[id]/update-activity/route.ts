import { NextRequest, NextResponse } from "next/server";
import { userRepository } from "@/lib/server/repositories/user-repository";
import { getUserFromSession } from "@/lib/server/auth";

/**
 * PATCH /api/admin/users/[id]/update-activity
 * Updates the last_active_at timestamp for a user
 * Internal endpoint used by middleware for activity tracking
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require authenticated user
    const currentUser = await getUserFromSession();
    if (!currentUser) {
      return NextResponse.json(
        { error: "Obehörig" },
        { status: 401 }
      );
    }

    const { id: userId } = await params;

    if (userId !== currentUser.id) {
      return NextResponse.json(
        { error: "Du kan bara uppdatera din egen aktivitet" },
        { status: 403 }
      );
    }

    // Update last active timestamp
    const updated = await userRepository.updateLastActive();
    if (!updated) {
      return NextResponse.json(
        {
          success: false,
          error: "Aktivitetsuppdateringen kunde inte sparas",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Misslyckades att uppdatera användarens aktivitet:", error);
    return NextResponse.json(
      { error: "Misslyckades att uppdatera aktivitet" },
      { status: 500 }
    );
  }
}
