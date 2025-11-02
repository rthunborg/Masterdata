import { NextRequest, NextResponse } from "next/server";
import {
  requireHRAdminAPI,
  createErrorResponse,
} from "@/lib/server/auth";
import { columnConfigRepository } from "@/lib/server/repositories/column-config-repository";
import { ToggleVisibilityRequest } from "@/lib/types/column-config";

/**
 * PATCH /api/admin/columns/[id]/toggle-visibility
 * Toggle column visibility (show/hide column)
 * Authorization: HR Admin only
 */
export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify HR Admin authentication
    await requireHRAdminAPI();

    const { id } = params;

    // Parse request body
    const body: ToggleVisibilityRequest = await request.json();

    // Validate request
    if (typeof body.is_visible !== "boolean") {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "is_visible must be a boolean",
          },
        },
        { status: 400 }
      );
    }

    // Toggle visibility
    const updatedColumn = await columnConfigRepository.toggleVisibility(
      id,
      body.is_visible
    );

    return NextResponse.json({ data: updatedColumn }, { status: 200 });
  } catch (error) {
    return createErrorResponse(error);
  }
}
