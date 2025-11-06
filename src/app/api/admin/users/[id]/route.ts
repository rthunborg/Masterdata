import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requireHRAdminAPI, createErrorResponse } from "@/lib/server/auth";
import { updateUserSchema } from "@/lib/validation/user-validation";
import { ZodError } from "zod";

// Force Node.js runtime for cookies() support
export const runtime = 'nodejs';

/**
 * Helper function to check if there's only one active HR Admin remaining
 * Returns true if the operation would remove the last active HR Admin
 */
async function wouldRemoveLastHRAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  targetUserId: string
): Promise<boolean> {
  // Get the target user to check if they're an active HR Admin
  const { data: targetUser, error: fetchError } = await supabase
    .from("users")
    .select("role, is_active")
    .eq("id", targetUserId)
    .single();

  if (fetchError || !targetUser) {
    return false;
  }

  // Only check if target is an active HR Admin
  if (targetUser.role !== "hr_admin" || !targetUser.is_active) {
    return false;
  }

  // Count total active HR Admins
  const { count, error: countError } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("role", "hr_admin")
    .eq("is_active", true);

  if (countError) {
    console.error("Error counting HR Admins:", countError);
    return false;
  }

  // If there's only 1 active HR Admin and we're trying to deactivate/delete them
  return count === 1;
}

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

    // Prevent removing the last active HR Admin
    if (validated.is_active === false && await wouldRemoveLastHRAdmin(supabase, id)) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Cannot deactivate the last active HR Admin",
          },
        },
        { status: 403 }
      );
    }

    // Get user to find auth_user_id
    const { data: userToUpdate, error: fetchError } = await supabase
      .from("users")
      .select("id, auth_user_id, email, role, is_active, created_at, last_active_at")
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
      .select("id, email, role, is_active, created_at, last_active_at")
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

    // If deactivating, revoke auth sessions using service role client
    if (validated.is_active === false && userToUpdate.auth_user_id) {
      try {
        const supabaseServiceRole = createServiceRoleClient();
        await supabaseServiceRole.auth.admin.signOut(userToUpdate.auth_user_id);
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Enforce HR Admin role and get current user
    const currentUser = await requireHRAdminAPI();

    const supabase = await createClient();
    const { id } = await params;

    // Prevent self-deletion
    if (id === currentUser.id) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Cannot delete your own account",
          },
        },
        { status: 403 }
      );
    }

    // Prevent deleting the last active HR Admin
    if (await wouldRemoveLastHRAdmin(supabase, id)) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Cannot delete the last active HR Admin",
          },
        },
        { status: 403 }
      );
    }

    // Get user to find auth_user_id
    const { data: userToDelete, error: fetchError } = await supabase
      .from("users")
      .select("id, auth_user_id, email, role, is_active")
      .eq("id", id)
      .single();

    if (fetchError || !userToDelete) {
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

    // Use service role client for all admin operations
    const supabaseServiceRole = createServiceRoleClient();

    // Delete app user record first using service role to bypass RLS
    const { error: deleteError } = await supabaseServiceRole
      .from("users")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("User deletion failed:", deleteError);
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to delete user record",
          },
        },
        { status: 500 }
      );
    }

    // Delete auth user using service role client
    if (userToDelete.auth_user_id) {
      try {
        const { error: authDeleteError } = await supabaseServiceRole.auth.admin.deleteUser(
          userToDelete.auth_user_id
        );
        
        if (authDeleteError) {
          console.error("Auth user deletion failed:", authDeleteError);
          // Continue - app user is deleted, auth cleanup failure is acceptable
        }
      } catch (authError) {
        console.error("Failed to delete auth user:", authError);
        // Continue - app user is deleted
      }
    }

    return NextResponse.json(
      {
        data: {
          message: "User deleted successfully",
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE /api/admin/users/[id] error:", error);
    return createErrorResponse(error);
  }
}
