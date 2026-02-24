import { NextRequest, NextResponse } from "next/server";
import { createAPIClient } from "@/lib/supabase/server-api";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireHRAdminAPI, createErrorResponse } from "@/lib/server/auth";
import { createUserSchema } from "@/lib/validation/user-validation";
import { ZodError } from "zod";
import { createValidationErrorResponse, createDuplicateResponse } from "@/lib/server/api-helpers";


// Force Node.js runtime for cookies() support
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Enforce HR Admin role
    await requireHRAdminAPI(request);

    const supabase = createAPIClient(request);

    // Fetch all users ordered by creation date
    const { data: users, error } = await supabase
      .from("users")
      .select("id, email, role, is_active, created_at, last_active_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("GET /api/admin/users error:", error);
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to fetch users",
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: users });
  } catch (error) {
    console.error("GET /api/admin/users error:", error);
    return createErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Enforce HR Admin role
    await requireHRAdminAPI(request);

    const body = await request.json();

    // Validate request body
    const validated = createUserSchema.parse(body);

    // Use service role client for all admin operations
    const supabaseServiceRole = createServiceRoleClient();

    // Check if user with this email already exists
    const { data: existingUser } = await supabaseServiceRole
      .from("users")
      .select("id")
      .eq("email", validated.email)
      .single();

    if (existingUser) {
      return createDuplicateResponse("User with this email already exists");
    }

    // Create auth user using admin API
    const { data: authData, error: authError } = await supabaseServiceRole.auth.admin.createUser({
      email: validated.email,
      password: validated.password,
      email_confirm: true, // Auto-confirm for MVP
    });

    if (authError || !authData.user) {
      console.error("Auth user creation failed:", authError);
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: `Failed to create auth user: ${authError?.message || "Unknown error"}`,
          },
        },
        { status: 500 }
      );
    }

    // Create app user record using service role client to bypass RLS
    const { data: appUser, error: appError } = await supabaseServiceRole
      .from("users")
      .insert({
        auth_user_id: authData.user.id,
        email: validated.email,
        role: validated.role,
        is_active: validated.is_active,
      })
      .select("id, email, role, is_active, created_at, last_active_at")
      .single();

    if (appError || !appUser) {
      console.error("App user creation failed:", appError);
      
      // Attempt to clean up auth user
      await supabaseServiceRole.auth.admin.deleteUser(authData.user.id);

      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: `Failed to create user record: ${appError?.message || "Unknown error"}`,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        data: {
          ...appUser,
          temporary_password: validated.password,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    // Handle validation errors (expected, don't log)
    if (error instanceof ZodError) {
      return createValidationErrorResponse(error);
    }

    // Log unexpected errors
    console.error("POST /api/admin/users error:", error);
    return createErrorResponse(error);
  }
}
