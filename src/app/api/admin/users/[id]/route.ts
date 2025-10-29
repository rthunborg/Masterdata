import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireHRAdminAPI, createErrorResponse } from "@/lib/server/auth";
import { updateUserSchema } from "@/lib/validation/user-validation";
import { ZodError } from "zod";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Enforce HR Admin role and get current user
    const currentUser = await requireHRAdminAPI();

    const supabase = await createClient();
    const body = await request.json();
    const { id } = await params;

    // Validate request body
    const validated = updateUserSchema.parse(body);

    // Prevent self-deactivation
    if (id === currentUser.id && validated.is_active === false) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Cannot deactivate your own account",
          },
        },
        { status: 403 }
      );
    }

    // Get user to find auth_user_id
    const { data: userToUpdate, error: fetchError } = await supabase
      .from("users")
      .select("id, auth_user_id, email, role, is_active, created_at")
      .eq("id", id)
      .single();

    if (fetchError || !userToUpdate) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "User not found",
          },
        },
        { status: 404 }
      );
    }

    // Update user status
    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update({ is_active: validated.is_active })
      .eq("id", id)
      .select("id, email, role, is_active, created_at")
      .single();

    if (updateError || !updatedUser) {
      console.error("User update failed:", updateError);
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to update user status",
          },
        },
        { status: 500 }
      );
    }

    // If deactivating, revoke auth sessions
    if (validated.is_active === false && userToUpdate.auth_user_id) {
      try {
        await supabase.auth.admin.signOut(userToUpdate.auth_user_id);
      } catch (signOutError) {
        console.error("Failed to sign out user:", signOutError);
        // Continue - user is deactivated even if sign out fails
      }
    }

    return NextResponse.json({ data: updatedUser });
  } catch (error) {
    console.error("PATCH /api/admin/users/[id] error:", error);

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
