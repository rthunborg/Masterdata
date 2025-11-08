import { NextRequest, NextResponse } from "next/server";
import { importantDateRepository } from "@/lib/server/repositories/important-date-repository";
import {
  requireHRAdminAPI,
  createErrorResponse,
} from "@/lib/server/auth";

// Force Node.js runtime for cookies() support
export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify HR Admin role
    await requireHRAdminAPI();

    const { id } = await params;

    // Archive important date by setting is_active to false
    const importantDate = await importantDateRepository.update(id, { is_active: false });

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
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: error.message,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 404 }
      );
    }

    return createErrorResponse(error);
  }
}
