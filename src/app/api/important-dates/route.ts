import { NextRequest, NextResponse } from "next/server";
import { importantDateRepository } from "@/lib/server/repositories/important-date-repository";
import {
  requireHRAdminAPI,
  createErrorResponse,
} from "@/lib/server/auth";
import { createImportantDateSchema } from "@/lib/validation/important-date-schema";
import { z } from "zod";


// Force Node.js runtime for cookies() support
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Verify HR Admin role - Important Dates are internal operational data
    await requireHRAdminAPI();

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
    // Ensure undefined values are converted to null for database compatibility
    const dateData: typeof validatedData & { time_value: string | null; deadline_submit: string | null; deadline_cancel: string | null } = {
      ...validatedData,
      time_value: validatedData.time_value ?? null,
      deadline_submit: validatedData.deadline_submit ?? null,
      deadline_cancel: validatedData.deadline_cancel ?? null,
    };
    
    const importantDate = await importantDateRepository.create(dateData);

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
