import { NextRequest, NextResponse } from "next/server";
import { columnConfigRepository } from "@/lib/server/repositories/column-config-repository";
import {
  requireAuthAPI,
  createErrorResponse,
  createForbiddenResponse,
} from "@/lib/server/auth";
import { updateColumnSchema } from "@/lib/validation/column-validation";
import { z } from "zod";

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
  try {
    // Await params (Next.js 15 requirement)
    const { id } = await params;
    
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
    const validatedData = updateColumnSchema.parse(body);

    // Update column via repository (includes permission check)
    const updatedColumn = await columnConfigRepository.updateColumn(
      id,
      user.id,
      user.role,
      validatedData
    );

    return NextResponse.json({ data: updatedColumn });
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: error.errors[0]?.message || "Invalid input",
            details: error.errors,
          },
        },
        { status: 400 }
      );
    }

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
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: error.message,
          },
        },
        { status: 404 }
      );
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
