import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requireHRAdminAPI, createErrorResponse } from "@/lib/server/auth";
import { updateUserSchema } from "@/lib/validation/user-validation";
import { parseOrError, createNotFoundResponse } from "@/lib/server/api-helpers";

// Force Node.js runtime for cookies() support
export const runtime = 'nodejs';

function isFinalActiveAdminError(error: { code?: string; message?: string } | null): boolean {
  return error?.code === "42501" && /final active HR Admin/i.test(error.message ?? "");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Enforce HR Admin role and get current user
    const currentUser = await requireHRAdminAPI(request);

    const supabase = await createClient();
    const body = await request.json();
    const { id } = await params;

    // Validate request body
    const result = parseOrError(updateUserSchema, body);
    if (result instanceof NextResponse) return result;
    const validated = result;

    // Prevent self-deactivation
    if (id === currentUser.id && validated.is_active === false) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Kan inte inaktivera din egen användare",
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
      return createNotFoundResponse("User", id);
    }

    // The caller-bound database function serializes the last-admin check and
    // status transition so concurrent requests cannot deactivate every HR Admin.
    const { data: updatedUser, error: updateError } = await supabase.rpc(
      "set_user_active_status",
      {
        p_user_id: id,
        p_is_active: validated.is_active,
      }
    );

    if (updateError || !updatedUser) {
      if (isFinalActiveAdminError(updateError)) {
        return NextResponse.json(
          {
            error: {
              code: "FORBIDDEN",
              message: "Kan inte inaktivera den sista aktiva HR Admin:en",
            },
          },
          { status: 403 }
        );
      }
      if (updateError?.code === "42501") {
        return NextResponse.json(
          {
            error: {
              code: "FORBIDDEN",
              message: "Saknar behörighet att ändra användarstatus",
            },
          },
          { status: 403 }
        );
      }
      if (updateError?.code === "P0002") {
        return createNotFoundResponse("User", id);
      }
      console.error("User update failed:", updateError);
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "Misslyckades att uppdatera användarens status",
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
        console.error("Misslyckades att logga ut användaren:", signOutError);
        // Continue - user is deactivated even if sign out fails
      }
    }

    return NextResponse.json({ data: updatedUser });
  } catch (error) {
    // Log unexpected errors
    console.error("PATCH /api/admin/users/[id] error:", error);
    return createErrorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Enforce HR Admin role and get current user
    const currentUser = await requireHRAdminAPI(request);

    const supabase = await createClient();
    const { id } = await params;

    // Prevent self-deletion
    if (id === currentUser.id) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Kan inte ta bort din egen användare",
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
      return createNotFoundResponse("User", id);
    }

    // Serialize deletion with the same database invariant used by deactivation.
    // Once the transition succeeds, deleting the inactive row cannot remove the
    // final active HR Admin even when requests race.
    const { error: deactivateError } = await supabase.rpc(
      "set_user_active_status",
      {
        p_user_id: id,
        p_is_active: false,
      }
    );

    if (deactivateError) {
      if (isFinalActiveAdminError(deactivateError)) {
        return NextResponse.json(
          {
            error: {
              code: "FORBIDDEN",
              message: "Kan inte ta bort den sista aktiva HR Admin:en",
            },
          },
          { status: 403 }
        );
      }
      if (deactivateError.code === "42501") {
        return NextResponse.json(
          {
            error: {
              code: "FORBIDDEN",
              message: "Saknar behörighet att ta bort användaren",
            },
          },
          { status: 403 }
        );
      }
      if (deactivateError.code === "P0002") {
        return createNotFoundResponse("User", id);
      }
      console.error("User deactivation before delete failed:", deactivateError);
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "Misslyckades att förbereda borttagning av användaren",
          },
        },
        { status: 500 }
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
      console.error("Användarens borttagning misslyckades:", deleteError);
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "Misslyckades att ta bort användarens post",
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
          console.error("Misslyckades att ta bort auth-användaren:", authDeleteError);
          // Continue - app user is deleted, auth cleanup failure is acceptable
        }
      } catch (authError) {
        console.error("Misslyckades att ta bort auth-användaren:", authError);
        // Continue - app user is deleted
      }
    }

    return NextResponse.json(
      {
        data: {
          message: "Användaren borttagen",
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE /api/admin/users/[id] error:", error);
    return createErrorResponse(error);
  }
}
