import { NextRequest, NextResponse } from "next/server";
import { columnConfigRepository } from "@/lib/server/repositories/column-config-repository";
import {
  requireAuthAPI,
  createErrorResponse,
  createForbiddenResponse,
} from "@/lib/server/auth";
import { updateColumnSchema } from "@/lib/validation/column-validation";
import { parseOrError, createNotFoundResponse } from "@/lib/server/api-helpers";

// Force Node.js runtime for cookies() support
export const runtime = 'nodejs';

/**
 * PATCH /api/columns/[id]
 * Update an existing custom column (name, category)
 * Authorization: External party users can only update columns they have edit permission for
 * HR Admin cannot use this endpoint (403)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Verify authentication and get user
    const user = await requireAuthAPI();

    // Verify user is NOT hr_admin (use admin endpoint for permission changes)
    if (user.role === "hr_admin") {
      return createForbiddenResponse(
        "HR Admin cannot use this endpoint. Use admin panel to update column permissions."
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const result = parseOrError(updateColumnSchema, body);
    if (result instanceof NextResponse) return result;
    const validatedData = result;

    // Update column via repository (includes permission check)
    const updatedColumn = await columnConfigRepository.updateColumn(
      id,
      user.id,
      user.role,
      validatedData
    );

    return NextResponse.json({ data: updatedColumn });
  } catch (error) {
    // Handle permission errors
    if (error instanceof Error && error.message.includes("permission")) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: error.message,
          },
        },
        { status: 403 }
      );
    }

    // Handle not found errors
    if (error instanceof Error && error.message.includes("not found")) {
      return createNotFoundResponse("Column", id);
    }

    // Handle duplicate column name error
    if (error instanceof Error && error.message.includes("already exists")) {
      return NextResponse.json(
        {
          error: {
            code: "DUPLICATE_COLUMN",
            message: error.message,
          },
        },
        { status: 400 }
      );
    }

    return createErrorResponse(error);
  }
}

/**
 * DELETE /api/columns/[id]
 * Legacy external-party delete endpoint.
 * Column lifecycle is HR Admin-managed; use /api/admin/columns/[id].
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await requireAuthAPI(request);
    return createForbiddenResponse(
      "Endast HR Admin kan ta bort kolumner via adminpanelen"
    );
  } catch (error) {
    // Handle permission errors
    if (error instanceof Error && error.message.includes("permission")) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: error.message,
          },
        },
        { status: 403 }
      );
    }

    // Handle not found errors
    if (error instanceof Error && error.message.includes("not found")) {
      return createNotFoundResponse("Column", id);
    }

    // Handle masterdata column deletion attempt
    if (error instanceof Error && error.message.includes("masterdata")) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: error.message,
          },
        },
        { status: 403 }
      );
    }

    return createErrorResponse(error);
  }
}
