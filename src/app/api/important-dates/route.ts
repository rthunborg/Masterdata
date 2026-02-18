import { NextRequest, NextResponse } from "next/server";
import { createAPIClient } from "@/lib/supabase/server-api";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAuthAPI, requireRoleAPI, createErrorResponse } from "@/lib/server/auth";
import { importantDateRepository } from "@/lib/server/repositories/important-date-repository";
import { createImportantDateSchema } from "@/lib/validation/important-date-schema";
import { UserRole } from "@/lib/types/user";
import { z } from "zod";

export const dynamic = 'force-dynamic';

/**
 * GET /api/important-dates
 * Get important dates with optional filters
 * Query params:
 *   - category: Optional category filter (e.g., "Stena Dates", "ÖMC Dates", "PE3 Dates")
 *   - id: Optional ID filter to fetch a single date
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    await requireAuthAPI(request);

    // Use service role client to bypass RLS for reading shared reference data.
    // Important dates are needed by ALL authenticated roles to resolve date UUID
    // fields (stena_date, omc_date, pe3_date) into formatted display strings.
    // Without this, roles whose RLS context doesn't include a SELECT policy on
    // important_dates (e.g. Toplux) would get an empty result, causing date
    // columns to render as dashes instead of formatted dates.
    const supabase = createServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const id = searchParams.get("id");

    // Build query
    let query = supabase
      .from("important_dates")
      .select("*");

    // Apply ID filter if provided (single record lookup)
    if (id) {
      query = query.eq("id", id);
    } else {
      // Apply sorting only for list queries
      query = query
        .order("year", { ascending: true })
        .order("week_number", { ascending: true, nullsFirst: false });
    }

    // Apply category filter if provided
    if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[API /important-dates] Query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch important dates" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error("[API /important-dates] Unexpected error:", error);
    
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify HR Admin or Recruiter role
    await requireRoleAPI([UserRole.HR_ADMIN, UserRole.RECRUITER], request);

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
              details: validationError.issues.reduce((acc, err) => {
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
    const dateData = {
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
