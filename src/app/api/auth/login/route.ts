import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import type { APIResponse, LoginResponse } from "@/lib/types/api";
import { loginFormSchema } from "@/lib/validation/auth-schema";

export const runtime = "nodejs";

const ACTIVITY_UPDATE_TIMEOUT_MS = 500;
const REJECTED_SESSION_SIGNOUT_TIMEOUT_MS = 500;

type AuthenticatedClient = Awaited<ReturnType<typeof createClient>>;

function sanitizedErrorCode(error: unknown): string {
  if (error && typeof error === "object") {
    const candidate = error as { code?: unknown; status?: unknown };
    if (typeof candidate.code === "string") return candidate.code;
    if (typeof candidate.status === "number") return `http_${candidate.status}`;
  }
  return "unexpected_error";
}

function authCookieBaseName(): string | null {
  try {
    const hostname = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
    return hostname ? `sb-${hostname.split(".")[0]}-auth-token` : null;
  } catch {
    return null;
  }
}

function isSupabaseAuthCookie(name: string, baseName: string | null): boolean {
  if (baseName && (name === baseName || name.startsWith(`${baseName}.`))) {
    return true;
  }
  return /^sb-[a-z0-9-]+-auth-token(?:\.\d+)?$/i.test(name);
}

async function clearRejectedSessionCookies(
  request: NextRequest,
  response: NextResponse
) {
  const baseName = authCookieBaseName();
  const names = new Set(
    request.cookies
      .getAll()
      .map(({ name }) => name)
      .filter((name) => isSupabaseAuthCookie(name, baseName))
  );

  try {
    const cookieStore = await cookies();
    for (const { name } of cookieStore.getAll()) {
      if (isSupabaseAuthCookie(name, baseName)) names.add(name);
    }
    if (baseName) names.add(baseName);
    for (const name of names) {
      cookieStore.set(name, "", { path: "/", maxAge: 0 });
    }
  } catch {
    console.error("[Login] Local session cookie-store cleanup failed", {
      reason: "cookie_store_write_failed",
    });
  }

  if (baseName) names.add(baseName);
  for (const name of names) {
    response.cookies.set(name, "", { path: "/", maxAge: 0 });
  }
  return response;
}

async function rejectPostAuth(
  request: NextRequest,
  code: string,
  message: string,
  status: number
) {
  const response = NextResponse.json(
    { error: { code, message } } as APIResponse,
    { status }
  );
  return clearRejectedSessionCookies(request, response);
}

async function revokeDefinitivelyRejectedSession(
  supabase: AuthenticatedClient
) {
  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = (error: unknown | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (error) {
        console.error("[Login] Global rejected-session revocation failed", {
          reason: sanitizedErrorCode(error),
        });
      }
      resolve();
    };
    const timeout = setTimeout(
      () => finish({ code: "SIGNOUT_TIMEOUT" }),
      REJECTED_SESSION_SIGNOUT_TIMEOUT_MS
    );

    Promise.resolve()
      .then(() => supabase.auth.signOut({ scope: "global" }))
      .then(({ error }) => finish(error), finish);
  });
}

async function updateLoginActivityWithinDeadline(
  supabase: AuthenticatedClient
) {
  return new Promise<{ error: unknown | null }>((resolve) => {
    const timeout = setTimeout(
      () => resolve({ error: { code: "ACTIVITY_UPDATE_TIMEOUT" } }),
      ACTIVITY_UPDATE_TIMEOUT_MS
    );

    supabase.rpc("update_own_last_active_at").then(
      ({ error }) => {
        clearTimeout(timeout);
        resolve({ error });
      },
      (error) => {
        clearTimeout(timeout);
        resolve({ error });
      }
    );
  });
}

async function lookupAppUser(
  supabase: AuthenticatedClient,
  authUserId: string
) {
  return supabase
    .from("users")
    .select("id, email, role, is_active, created_at, last_active_at")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
}

export async function POST(request: NextRequest) {
  let authenticatedClient: AuthenticatedClient | null = null;
  let postAuth = false;

  try {
    const body = await request.json();
    const validationResult = loginFormSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input data",
            details: validationResult.error.flatten(),
          },
        } as APIResponse,
        { status: 400 }
      );
    }

    const { email, password } = validationResult.data;
    const supabase = await createClient();
    authenticatedClient = supabase;
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (authError || !authData.user) {
      console.error("[Login] Authentication rejected", {
        reason: authError ? sanitizedErrorCode(authError) : "missing_auth_user",
      });
      return NextResponse.json(
        {
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email or password",
          },
        } as APIResponse,
        { status: 401 }
      );
    }
    postAuth = true;

    const { data: userData, error: lookupError } = await lookupAppUser(
      supabase,
      authData.user.id
    );
    if (lookupError) {
      console.error("[Login] Application-user lookup failed", {
        reason: sanitizedErrorCode(lookupError),
      });
      return rejectPostAuth(
        request,
        "ACCOUNT_LOOKUP_FAILED",
        "Unable to verify user account",
        503
      );
    }
    if (!userData) {
      await revokeDefinitivelyRejectedSession(supabase);
      console.error("[Login] Definitive application-user rejection", {
        reason: "missing_app_user",
      });
      return rejectPostAuth(
        request,
        "USER_NOT_FOUND",
        "User account not found",
        401
      );
    }
    if (!userData.is_active) {
      await revokeDefinitivelyRejectedSession(supabase);
      console.error("[Login] Definitive application-user rejection", {
        reason: "inactive_app_user",
      });
      return rejectPostAuth(
        request,
        "ACCOUNT_DEACTIVATED",
        "Account has been deactivated",
        401
      );
    }

    const { error: activityError } =
      await updateLoginActivityWithinDeadline(supabase);
    if (activityError) {
      console.error("[Login] Activity update failed", {
        reason: sanitizedErrorCode(activityError),
      });
    }

    const { data: finalUserData, error: finalLookupError } = await lookupAppUser(
      supabase,
      authData.user.id
    );
    if (finalLookupError) {
      console.error("[Login] Final application-user lookup failed", {
        reason: sanitizedErrorCode(finalLookupError),
      });
      return rejectPostAuth(
        request,
        "ACCOUNT_LOOKUP_FAILED",
        "Unable to verify user account",
        503
      );
    }
    if (!finalUserData || !finalUserData.is_active) {
      await revokeDefinitivelyRejectedSession(supabase);
      console.error("[Login] Definitive final-snapshot rejection", {
        reason: finalUserData ? "inactive_app_user" : "missing_app_user",
      });
      return rejectPostAuth(
        request,
        finalUserData ? "ACCOUNT_DEACTIVATED" : "USER_NOT_FOUND",
        finalUserData
          ? "Account has been deactivated"
          : "User account not found",
        401
      );
    }

    const response: APIResponse<LoginResponse> = {
      data: {
        user: {
          id: finalUserData.id,
          email: finalUserData.email,
          role: finalUserData.role,
          is_active: finalUserData.is_active,
          auth_id: authData.user.id,
          created_at: finalUserData.created_at,
          last_active_at: finalUserData.last_active_at,
        },
        session: {
          access_token: authData.session?.access_token || "",
          expires_at: authData.session?.expires_at
            ? new Date(authData.session.expires_at * 1000).toISOString()
            : new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Login] Route failure", {
      reason: sanitizedErrorCode(error),
      phase: postAuth ? "post_auth" : "pre_auth",
    });

    if (postAuth && authenticatedClient) {
      return rejectPostAuth(
        request,
        "INTERNAL_ERROR",
        "An internal error occurred",
        500
      );
    }
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "An internal error occurred",
        },
      } as APIResponse,
      { status: 500 }
    );
  }
}
