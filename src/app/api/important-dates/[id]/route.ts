import { NextRequest, NextResponse } from "next/server";
import { importantDateRepository } from "@/lib/server/repositories/important-date-repository";
import {
  requireRoleAPI,
  createErrorResponse,
} from "@/lib/server/auth";
import { UserRole } from "@/lib/types/user";
import { updateImportantDateSchema } from "@/lib/validation/important-date-schema";
import { parseOrError, createNotFoundResponse } from "@/lib/server/api-helpers";

// Force Node.js runtime for cookies() support
export const runtime = 'nodejs';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Verify HR Admin or Recruiter role
    await requireRoleAPI([UserRole.HR_ADMIN, UserRole.RECRUITER], request);

    // Parse and validate request body
    const body = await request.json();
    const result = parseOrError(updateImportantDateSchema, body);
    if (result instanceof NextResponse) return result;
    const validatedData = result;

    // Update important date via repository
    const importantDate = await importantDateRepository.update(id, validatedData);

    // Return successful response
    return NextResponse.json({
      data: importantDate,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    // Handle not found error
    if (error instanceof Error && error.message.includes("not found")) {
      return createNotFoundResponse("Important date", id);
    }

    return createErrorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Verify HR Admin or Recruiter role
    await requireRoleAPI([UserRole.HR_ADMIN, UserRole.RECRUITER], request);

    // Delete important date via repository
    await importantDateRepository.delete(id);

    // Return successful response
    return NextResponse.json(
      {
        meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle not found error
    if (error instanceof Error && error.message.includes("not found")) {
      return createNotFoundResponse("Important date", id);
    }

    return createErrorResponse(error);
  }
}
