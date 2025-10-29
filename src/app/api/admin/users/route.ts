import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireHRAdminAPI, createErrorResponse } from "@/lib/server/auth";
import { createUserSchema } from "@/lib/validation/user-validation";
import { ZodError } from "zod";


// Force Node.js runtime for cookies() support
export const runtime = 'nodejs';

export async function GET() {
  try {
    // Enforce HR Admin role
    await requireHRAdminAPI();

    const supabase = await createClient();

    // Fetch all users ordered by creation date
    const { data: users, error } = await supabase
      .from("users")
      .select("id, email, role, is_active, created_at")
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
    await requireHRAdminAPI();

    const supabase = await createClient();
    const body = await request.json();

    // Validate request body
    const validated = createUserSchema.parse(body);

    // Check if user with this email already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", validated.email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        {
          error: {
            code: "DUPLICATE_ENTRY",
            message: "User with this email already exists",
          },
        },
        { status: 409 }
      );
    }

    // Create auth user using admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
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

    // Create app user record
    const { data: appUser, error: appError } = await supabase
      .from("users")
      .insert({
        auth_user_id: authData.user.id,
        email: validated.email,
        role: validated.role,
        is_active: validated.is_active,
      })
      .select("id, email, role, is_active, created_at")
      .single();

    if (appError || !appUser) {
      console.error("App user creation failed:", appError);
      
      // Attempt to clean up auth user
      await supabase.auth.admin.deleteUser(authData.user.id);

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
    console.error("POST /api/admin/users error:", error);

    // Handle validation errors
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: error.errors[0]?.message || "Invalid input data",
          },
        },
        { status: 400 }
      );
    }

    return createErrorResponse(error);
  }
}
