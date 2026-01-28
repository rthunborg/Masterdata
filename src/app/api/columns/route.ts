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
 * 
 * Query params:
 * - role: Optional role to filter by (for HR Admin preview mode only)
 *         Only HR Admin can use this parameter to preview other roles' views
 */

// Force Node.js runtime for cookies() support
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication and get user
    const user = await requireAuthAPI();

    // Check for role query parameter (preview mode)
    const { searchParams } = new URL(request.url);
    const previewRole = searchParams.get("role");

    // Determine which role to filter by
    let roleToFilter = user.role;

    // Only HR Admin can preview other roles
    if (previewRole && user.role === "hr_admin") {
      // Validate that the preview role is a valid role
      const validRoles = ["hr_admin", "sodexo", "omc", "payroll", "toplux", "recruiter", "admin_limited", "crewing"];
      if (validRoles.includes(previewRole)) {
        roleToFilter = previewRole as typeof user.role;
      }
    }

    // Fetch columns visible to the target role
    const columns = await columnConfigRepository.findByRole(roleToFilter);

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
