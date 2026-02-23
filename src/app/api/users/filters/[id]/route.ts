import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuthAPI, createErrorResponse } from "@/lib/server/auth";
import type { DeleteSavedFilterResponse } from "@/lib/types/saved-filter";

/**
 * DELETE /api/users/filters/:id
 * Delete a saved filter for the authenticated user
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthAPI(request);
    const { id } = await params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: "Invalid filter ID format" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Delete filter - RLS ensures user can only delete their own filters
    const { error } = await supabase
      .from("user_filters")
      .delete()
      .eq("id", id)
      .eq("user_id", user.auth_id); // Explicit check for extra safety

    if (error) {
      console.error("[DELETE /api/users/filters/:id] Databasfel:", error);
      throw error;
    }

    const response: DeleteSavedFilterResponse = { success: true };
    return NextResponse.json(response);
  } catch (error) {
    return createErrorResponse(error);
  }
}
