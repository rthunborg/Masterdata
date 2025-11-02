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
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: userId } = await params;

    // Update last active timestamp
    await userRepository.updateLastActive(userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update user activity:", error);
    return NextResponse.json(
      { error: "Failed to update activity" },
      { status: 500 }
    );
  }
}
