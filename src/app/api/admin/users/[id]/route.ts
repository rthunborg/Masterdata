import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requireHRAdminAPI, createErrorResponse } from "@/lib/server/auth";
import { updateUserSchema } from "@/lib/validation/user-validation";
import { parseOrError, createNotFoundResponse } from "@/lib/server/api-helpers";

// Force Node.js runtime for cookies() support
export const runtime = 'nodejs';

const CLEANUP_OPERATION_TIMEOUT_MS = 5_000;
const userIdSchema = z.string().uuid();
const deleteAppUserResultSchema = z.discriminatedUnion("cleanup_state", [
  z
    .object({
      cleanup_id: z.string().uuid(),
      auth_user_id: z.string().uuid(),
      cleanup_state: z.literal("pending"),
    })
    .strict(),
  z
    .object({
      cleanup_id: z.string().uuid(),
      auth_user_id: z.string().uuid().nullable(),
      cleanup_state: z.literal("completed"),
    })
    .strict(),
]);
const completeAuthCleanupResultSchema = z
  .object({
    cleanup_id: z.string().uuid(),
    cleanup_state: z.literal("completed"),
    completed_at: z.string().min(1),
  })
  .strict();

class CleanupOperationTimeoutError extends Error {
  constructor() {
    super("User cleanup operation timed out");
    this.name = "CleanupOperationTimeoutError";
  }
}

function withinDeadline<T>(operation: PromiseLike<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new CleanupOperationTimeoutError()),
      timeoutMs
    );
    operation.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      }
    );
  });
}

function isAuthUserNotFound(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown };
  return candidate.code === "user_not_found";
}

function sanitizedFailureReason(error: unknown): string {
  if (error instanceof CleanupOperationTimeoutError) return "timeout";
  if (error && typeof error === "object") {
    const candidate = error as { code?: unknown; status?: unknown };
    if (typeof candidate.code === "string") return candidate.code;
    if (typeof candidate.status === "number") return `http_${candidate.status}`;
  }
  return "unexpected_error";
}

function partialAuthCleanupResponse(
  cleanupId: string,
  authUserDeleted: boolean,
  reason: string
) {
  console.error("[Admin user deletion] Auth cleanup remains pending", {
    cleanup_id: cleanupId,
    reason,
  });
  return NextResponse.json(
    {
      error: {
        code: "AUTH_CLEANUP_PENDING",
        message:
          "Användarposten togs bort, men auth-rensningen måste försökas igen",
        recoverable: true,
      },
      data: {
        status: "partial",
        cleanup_id: cleanupId,
        cleanup_state: "pending",
        app_user_deleted: true,
        auth_user_deleted: authUserDeleted,
      },
    },
    { status: 502 }
  );
}

function unknownAuthCleanupResponse(reason = "invalid_delete_rpc_result") {
  console.error("[Admin user deletion] Cleanup handoff state is unknown", {
    reason,
  });
  return NextResponse.json(
    {
      error: {
        code: "AUTH_CLEANUP_STATE_UNKNOWN",
        message:
          "Rensningsstatus kunde inte verifieras; försök igen med samma användar-id",
        recoverable: true,
      },
      data: {
        status: "unknown",
        cleanup_id: null,
        app_user_deleted: "unknown",
        retry_same_user_id: true,
      },
    },
    { status: 502 }
  );
}

function successfulDeletionResponse(
  cleanupId: string,
  authCleanupRequired: boolean
) {
  return NextResponse.json(
    {
      data: {
        message: "Användaren borttagen",
        cleanup_id: cleanupId,
        cleanup_state: "completed",
        app_user_deleted: true,
        auth_cleanup_required: authCleanupRequired,
        auth_user_deleted: authCleanupRequired,
      },
    },
    { status: 200 }
  );
}

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
    const { id: rawId } = await params;
    const parsedId = userIdSchema.safeParse(rawId);

    if (!parsedId.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Ogiltigt användar-id",
          },
        },
        { status: 400 }
      );
    }
    const id = parsedId.data;

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

    // The caller-bound RPC performs invariant checks and deletes the app row in
    // one transaction. Foreign-key or invariant failures leave the row exactly
    // as it was before the request.
    let deleteCall;
    try {
      deleteCall = await withinDeadline(
        supabase.rpc("delete_app_user", { p_user_id: id }),
        CLEANUP_OPERATION_TIMEOUT_MS
      );
    } catch (deleteCallError) {
      // The database transaction may have committed even if its transport
      // response was lost or timed out. Do not guess and do not start the
      // privileged phase; a same-ID retry resolves the durable handoff.
      return unknownAuthCleanupResponse(sanitizedFailureReason(deleteCallError));
    }
    const { data: deleteResult, error: deleteError } = deleteCall;

    if (deleteError) {
      if (isFinalActiveAdminError(deleteError)) {
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
      if (deleteError?.code === "42501") {
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
      if (deleteError?.code === "P0002") {
        return createNotFoundResponse("User", id);
      }
      if (deleteError?.code === "23503") {
        return NextResponse.json(
          {
            error: {
              code: "USER_DELETE_CONFLICT",
              message: "Användaren kan inte tas bort eftersom relaterade poster finns",
            },
          },
          { status: 409 }
        );
      }
      // Any unclassified gateway/PostgREST/database response is ambiguous: the
      // transaction may have committed before the response failed. A same-ID
      // retry is safe whether the first attempt committed or rolled back.
      return unknownAuthCleanupResponse(sanitizedFailureReason(deleteError));
    }

    const parsedDeleteResult = deleteAppUserResultSchema.safeParse(deleteResult);
    if (!parsedDeleteResult.success) {
      return unknownAuthCleanupResponse();
    }

    const cleanup = parsedDeleteResult.data;
    if (cleanup.cleanup_state === "completed") {
      return successfulDeletionResponse(
        cleanup.cleanup_id,
        cleanup.auth_user_id !== null
      );
    }

    let authUserDeleted = false;
    let supabaseServiceRole: ReturnType<typeof createServiceRoleClient>;
    try {
      supabaseServiceRole = createServiceRoleClient();
    } catch (serviceClientError) {
      return partialAuthCleanupResponse(
        cleanup.cleanup_id,
        false,
        sanitizedFailureReason(serviceClientError)
      );
    }
    try {
      // Instantiate the privileged client only while a pending handoff actually
      // requires the external Auth operation.
      const { error: authDeleteError } = await withinDeadline(
        supabaseServiceRole.auth.admin.deleteUser(cleanup.auth_user_id),
        CLEANUP_OPERATION_TIMEOUT_MS
      );

      if (authDeleteError && !isAuthUserNotFound(authDeleteError)) {
        return partialAuthCleanupResponse(
          cleanup.cleanup_id,
          false,
          sanitizedFailureReason(authDeleteError)
        );
      }
      authUserDeleted = true;
    } catch (authError) {
      if (!isAuthUserNotFound(authError)) {
        return partialAuthCleanupResponse(
          cleanup.cleanup_id,
          false,
          sanitizedFailureReason(authError)
        );
      }
      authUserDeleted = true;
    }

    let completeResult: unknown = null;
    let completeError: unknown = null;
    try {
      const completion = await withinDeadline(
        supabaseServiceRole.rpc("complete_app_user_auth_cleanup", {
          p_cleanup_id: cleanup.cleanup_id,
        }),
        CLEANUP_OPERATION_TIMEOUT_MS
      );
      completeResult = completion.data;
      completeError = completion.error;
    } catch (completionCallError) {
      return partialAuthCleanupResponse(
        cleanup.cleanup_id,
        authUserDeleted,
        sanitizedFailureReason(completionCallError)
      );
    }
    const parsedCompleteResult = completeAuthCleanupResultSchema.safeParse(
      completeResult
    );

    const completionMatchesPendingCleanup =
      parsedCompleteResult.success &&
      parsedCompleteResult.data.cleanup_id === cleanup.cleanup_id;

    if (completeError || !completionMatchesPendingCleanup) {
      return partialAuthCleanupResponse(
        cleanup.cleanup_id,
        authUserDeleted,
        completeError
          ? sanitizedFailureReason(completeError)
          : parsedCompleteResult.success
            ? "mismatched_complete_rpc_cleanup_id"
            : "invalid_complete_rpc_result"
      );
    }

    return successfulDeletionResponse(cleanup.cleanup_id, true);
  } catch (error) {
    console.error("[Admin user deletion] Unexpected route failure", {
      reason: sanitizedFailureReason(error),
    });
    return createErrorResponse(error);
  }
}
