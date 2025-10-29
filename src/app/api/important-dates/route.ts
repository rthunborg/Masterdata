import { NextRequest, NextResponse } from "next/server";
import { importantDateRepository } from "@/lib/server/repositories/important-date-repository";
import {
  requireAuthAPI,
  requireHRAdminAPI,
  createErrorResponse,
} from "@/lib/server/auth";
import { createImportantDateSchema } from "@/lib/validation/important-date-schema";
import { z } from "zod";


// Force Node.js runtime for cookies() support
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication (all users can view)
    await requireAuthAPI();

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category") || undefined;

    // Fetch important dates
    const dates = await importantDateRepository.findAll(category);

    return NextResponse.json({
      data: dates,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify HR Admin role
    await requireHRAdminAPI();

    // Parse and validate request body
    const body = await request.json();
    
    let validatedData;
    try {
      validatedData = createImportantDateSchema.parse(body);
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

    // Create important date via repository
    const importantDate = await importantDateRepository.create(validatedData);

    // Return successful response
    return NextResponse.json(
      {
        data: importantDate,
        meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return createErrorResponse(error);
  }
}
