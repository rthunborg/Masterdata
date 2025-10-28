import { NextRequest, NextResponse } from "next/server";
import { columnConfigRepository } from "@/lib/server/repositories/column-config-repository";
import {
  requireAuthAPI,
  createErrorResponse,
  createForbiddenResponse,
} from "@/lib/server/auth";
import { createCustomColumnSchema } from "@/lib/validation/column-validation";
import { z } from "zod";

/**
 * GET /api/columns
 * Fetch all column configurations visible to current user's role
 * Authorization: All authenticated users
 */
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
 * Create a new custom column for current user's role
 * Authorization: External party users only (sodexo, omc, payroll, toplux)
 * HR Admin cannot create custom columns (403)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication and get user
    const user = await requireAuthAPI();

    // Verify user is NOT hr_admin (only external parties can create custom columns)
    if (user.role === "hr_admin") {
      return createForbiddenResponse(
        "HR Admin cannot create custom columns"
      );
    }

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
            message: error.errors[0]?.message || "Invalid input",
            details: error.errors,
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
