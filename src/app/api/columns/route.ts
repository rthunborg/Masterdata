import { NextRequest, NextResponse } from "next/server";
import { columnConfigRepository } from "@/lib/server/repositories/column-config-repository";
import {
  requireAuthAPI,
  createErrorResponse,
} from "@/lib/server/auth";
import { createCustomColumnSchema } from "@/lib/validation/column-validation";
import { z } from "zod";

/**
 * GET /api/columns
 * Fetch all column configurations visible to current user's role
 * Authorization: All authenticated users
 */

// Force Node.js runtime for cookies() support
export const runtime = 'nodejs';

export async function GET() {
  try {
    // Verify authentication and get user
    const user = await requireAuthAPI();

    // Fetch columns visible to user's role
    const columns = await columnConfigRepository.findByRole(user.role);

    return NextResponse.json({
      data: columns,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * POST /api/columns
 * Create a new custom column
 * Authorization: All authenticated users (HR Admin and external parties)
 * - HR Admin can create custom columns for any role
 * - External parties create columns for their own role
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication and get user
    const user = await requireAuthAPI();

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createCustomColumnSchema.parse(body);

    // Create custom column via repository
    const newColumn = await columnConfigRepository.createCustomColumn({
      ...validatedData,
      role: user.role,
    });

    return NextResponse.json({ data: newColumn }, { status: 201 });
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: error.issues[0]?.message || "Invalid input",
            details: error.issues,
          },
        },
        { status: 400 }
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
