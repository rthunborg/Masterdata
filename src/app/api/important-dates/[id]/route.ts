import { NextRequest, NextResponse } from "next/server";
import { importantDateRepository } from "@/lib/server/repositories/important-date-repository";
import {
  requireHRAdminAPI,
  createErrorResponse,
} from "@/lib/server/auth";
import { updateImportantDateSchema } from "@/lib/validation/important-date-schema";
import { z } from "zod";

// Force Node.js runtime for cookies() support
export const runtime = 'nodejs';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify HR Admin role
    await requireHRAdminAPI();

    const { id } = await params;

    // Parse and validate request body
    const body = await request.json();
    
    let validatedData;
    try {
      validatedData = updateImportantDateSchema.parse(body);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid input data",
              details: validationError.errors.reduce((acc, err) => {
                const field = err.path.join(".");
                if (!acc[field]) acc[field] = [];
                acc[field].push(err.message);
                return acc;
              }, {} as Record<string, string[]>),
              timestamp: new Date().toISOString(),
            },
          },
          { status: 400 }
        );
      }
      throw validationError;
    }

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify HR Admin role
    await requireHRAdminAPI();

    const { id } = await params;

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
