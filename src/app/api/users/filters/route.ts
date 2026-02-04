import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuthAPI, createErrorResponse } from "@/lib/server/auth";
import type { CreateSavedFilterRequest, GetSavedFiltersResponse, CreateSavedFilterResponse } from "@/lib/types/saved-filter";

/**
 * GET /api/users/filters
 * Fetch all saved filters for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthAPI(request);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("user_filters")
      .select("*")
      .eq("user_id", user.auth_id)
      .order("name");

    if (error) {
      console.error("[GET /api/users/filters] Database error:", error);
      throw error;
    }

    const response: GetSavedFiltersResponse = { data: data || [] };
    return NextResponse.json(response);
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * POST /api/users/filters
 * Create a new saved filter for the authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthAPI(request);
    const body: CreateSavedFilterRequest = await request.json();

    // Validate request body
    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json(
        { error: "Name is required and must be a string" },
        { status: 400 }
      );
    }

    if (!body.filters || !Array.isArray(body.filters)) {
      return NextResponse.json(
        { error: "Filters are required and must be an array" },
        { status: 400 }
      );
    }

    // Trim and validate name length
    const trimmedName = body.name.trim();
    if (trimmedName.length === 0) {
      return NextResponse.json(
        { error: "Name cannot be empty" },
        { status: 400 }
      );
    }

    if (trimmedName.length > 50) {
      return NextResponse.json(
        { error: "Name cannot exceed 50 characters" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("user_filters")
      .insert({
        user_id: user.auth_id,
        name: trimmedName,
        filters: body.filters,
      })
      .select()
      .single();

    if (error) {
      // Check for duplicate name constraint violation
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A filter with this name already exists" },
          { status: 409 }
        );
      }
      console.error("[POST /api/users/filters] Database error:", error);
      throw error;
    }

    const response: CreateSavedFilterResponse = { data };
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    return createErrorResponse(error);
  }
}
