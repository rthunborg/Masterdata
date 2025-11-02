import { NextRequest, NextResponse } from "next/server";
import {
  requireHRAdminAPI,
  createErrorResponse,
} from "@/lib/server/auth";
import { columnConfigRepository } from "@/lib/server/repositories/column-config-repository";
import { ReorderColumnsRequest } from "@/lib/types/column-config";

/**
 * PATCH /api/admin/columns/reorder
 * Reorder columns by updating display_order values
 * Authorization: HR Admin only
 */
export const runtime = "nodejs";

export async function PATCH(request: NextRequest) {
  try {
    // Verify HR Admin authentication
    await requireHRAdminAPI();

    // Parse request body
    const body: ReorderColumnsRequest = await request.json();

    // Validate request
    if (!body.columns || !Array.isArray(body.columns)) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid columns array",
          },
        },
        { status: 400 }
      );
    }

    // Validate each column entry
    for (const col of body.columns) {
      if (!col.id || typeof col.display_order !== "number") {
        return NextResponse.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "Each column must have id and display_order",
            },
          },
          { status: 400 }
        );
      }
    }

    // Update display_order for all columns
    await columnConfigRepository.updateDisplayOrder(body.columns);

    return NextResponse.json(
      { success: true, message: "Column order updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    return createErrorResponse(error);
  }
}
