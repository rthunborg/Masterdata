import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { validateNonProductionSupabaseEnvironment } from "./src/lib/env/non-production-supabase-guard";
import { shouldUpdateActivity } from "./src/lib/server/utils/activity-tracker";

const PUBLIC_ROUTES = ["/api/auth/login", "/api/health"];
const ADMIN_ROUTES = [
  "/dashboard/important-dates",
  "/dashboard/admin/users",
  "/dashboard/admin/columns",
];
const REJECTED_SESSION_SIGNOUT_TIMEOUT_MS = 500;

type CookieMutation = {
  name: string;
  value: string;
  options: CookieOptions;
};

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

function applyCookieMutations(
  response: NextResponse,
  mutations: CookieMutation[]
) {
  for (const { name, value, options } of mutations) {
    response.cookies.set(name, value, options);
  }
  return response;
}

function redirectWithCookies(
  request: NextRequest,
  pathname: string,
  mutations: CookieMutation[]
) {
  return applyCookieMutations(
    NextResponse.redirect(new URL(pathname, request.url)),
    mutations
  );
}

function sessionResolutionUnavailableWithCookies(mutations: CookieMutation[]) {
  return applyCookieMutations(
    new NextResponse(
      "Vi kunde inte verifiera ditt konto just nu. Försök igen om en stund.",
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": "text/plain; charset=utf-8",
          "Retry-After": "5",
        },
      }
    ),
    mutations
  );
}

function clearRejectedSessionCookies(
  request: NextRequest,
  response: NextResponse,
  mutations: CookieMutation[]
) {
  const baseName = authCookieBaseName();
  const names = new Set<string>();
  for (const { name } of request.cookies.getAll()) {
    if (isSupabaseAuthCookie(name, baseName)) names.add(name);
  }
  for (const { name } of mutations) {
    if (isSupabaseAuthCookie(name, baseName)) names.add(name);
  }
  if (baseName) names.add(baseName);

  for (const name of names) {
    request.cookies.set(name, "");
    response.cookies.set(name, "", { path: "/", maxAge: 0 });
  }
  return response;
}

async function revokeDefinitivelyRejectedSession(
  signOut: () => PromiseLike<{ error: unknown | null }>
) {
  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = (error: unknown | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (error) {
        console.error("[Middleware] Rejected-session revocation failed", {
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
      .then(signOut)
      .then(({ error }) => finish(error), finish);
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/manifest.json" ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  validateNonProductionSupabaseEnvironment();

  const cookieMutations: CookieMutation[] = [];
  const response = NextResponse.next({ request });

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            for (const mutation of cookiesToSet) {
              cookieMutations.push(mutation);
              request.cookies.set(mutation.name, mutation.value);
              response.cookies.set(
                mutation.name,
                mutation.value,
                mutation.options
              );
            }
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) {
      console.error("[Middleware] Auth resolution failed", {
        reason: sanitizedErrorCode(authError),
      });
    }

    let appUser:
      | {
          id: string;
          role: string;
          last_active_at: string | null;
          is_active: boolean;
        }
      | null = null;
    let lookupError: unknown = null;

    if (user && !authError) {
      const lookup = await supabase
        .from("users")
        .select("id, role, last_active_at, is_active")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      appUser = lookup.data;
      lookupError = lookup.error;

      if (lookupError) {
        console.error("[Middleware] Application-user lookup failed", {
          reason: sanitizedErrorCode(lookupError),
        });
        appUser = null;
      }
    }

    const definitiveRejectedSession =
      Boolean(user) &&
      !authError &&
      !lookupError &&
      (!appUser || appUser.is_active !== true);
    const hasActiveAppUser =
      Boolean(user) &&
      !authError &&
      !lookupError &&
      appUser?.is_active === true;
    const userRole = hasActiveAppUser ? appUser?.role ?? null : null;

    if (definitiveRejectedSession) {
      await revokeDefinitivelyRejectedSession(() =>
        supabase.auth.signOut({ scope: "local" })
      );
      clearRejectedSessionCookies(request, response, cookieMutations);
    }

    if (
      hasActiveAppUser &&
      appUser &&
      shouldUpdateActivity(appUser.last_active_at)
    ) {
      void (async () => {
        try {
          const { error: updateError } = await supabase.rpc(
            "update_own_last_active_at"
          );
          if (updateError) {
            console.error("[Middleware] Activity update failed", {
              reason: sanitizedErrorCode(updateError),
            });
          }
        } catch (error) {
          console.error("[Middleware] Activity update failed", {
            reason: sanitizedErrorCode(error),
          });
        }
      })();
    }

    if (user && (authError || lookupError)) {
      return sessionResolutionUnavailableWithCookies(cookieMutations);
    }

    if (user && !hasActiveAppUser && !pathname.startsWith("/login")) {
      const redirect = redirectWithCookies(request, "/login", cookieMutations);
      return definitiveRejectedSession
        ? clearRejectedSessionCookies(request, redirect, cookieMutations)
        : redirect;
    }

    const isAdminRoute = ADMIN_ROUTES.some((route) =>
      pathname.startsWith(route)
    );
    if (isAdminRoute && hasActiveAppUser && userRole !== "hr_admin") {
      return redirectWithCookies(request, "/dashboard", cookieMutations);
    }

    if (!user && !pathname.startsWith("/login") && pathname !== "/") {
      return redirectWithCookies(request, "/login", cookieMutations);
    }

    if (hasActiveAppUser && pathname === "/") {
      return redirectWithCookies(request, "/dashboard", cookieMutations);
    }

    if (hasActiveAppUser && pathname.startsWith("/login")) {
      return redirectWithCookies(request, "/dashboard", cookieMutations);
    }

    return response;
  } catch (error) {
    console.error("[Middleware] Resolution failed closed", {
      reason: sanitizedErrorCode(error),
    });
    if (pathname !== "/" && !pathname.startsWith("/login")) {
      return sessionResolutionUnavailableWithCookies(cookieMutations);
    }
    return response;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
