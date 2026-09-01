import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  validateEnvironment: vi.fn(),
  shouldUpdateActivity: vi.fn(),
  getUser: vi.fn(),
  maybeSingle: vi.fn(),
  rpc: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: mocks.createServerClient,
}));

vi.mock("@/lib/env/non-production-supabase-guard", () => ({
  validateNonProductionSupabaseEnvironment: mocks.validateEnvironment,
}));

vi.mock("@/lib/server/utils/activity-tracker", () => ({
  shouldUpdateActivity: mocks.shouldUpdateActivity,
}));

import { middleware } from "../../../../middleware";

function request(pathname: string) {
  return new NextRequest(`http://localhost${pathname}`, {
    headers: { Cookie: "sb-127-auth-token=stale-session" },
  });
}

function expectRefreshedCookiesPreserved(response: Response) {
  expect(response.headers.get("set-cookie")).toContain(
    "sb-127-auth-token.0=refreshed-session"
  );
}

function expectRejectedCookieCleared(response: Response) {
  expect(response.headers.get("set-cookie")).toMatch(
    /sb-127-auth-token=.*Max-Age=0/i
  );
}

describe("Story 22.15 middleware active-user gate", () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:15421";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    mocks.shouldUpdateActivity.mockReturnValue(false);
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "auth-user" } },
      error: null,
    });
    mocks.maybeSingle.mockResolvedValue({
      data: {
        id: "app-user",
        role: "hr_admin",
        is_active: true,
        last_active_at: null,
      },
      error: null,
    });
    mocks.rpc.mockResolvedValue({ error: null });
    mocks.signOut.mockResolvedValue({ error: null });
    mocks.createServerClient.mockImplementation(
      (_url: string, _key: string, options: {
        cookies: {
          setAll: (cookies: Array<{
            name: string;
            value: string;
            options: Record<string, unknown>;
          }>) => void;
        };
      }) => {
        options.cookies.setAll([
          {
            name: "sb-127-auth-token.0",
            value: "refreshed-session",
            options: { path: "/", httpOnly: true, sameSite: "lax" },
          },
        ]);
        return {
          auth: { getUser: mocks.getUser, signOut: mocks.signOut },
          from: vi.fn(() => ({
            select: vi.fn(() => ({
              eq: vi.fn(() => ({ maybeSingle: mocks.maybeSingle })),
            })),
          })),
          rpc: mocks.rpc,
        };
      }
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    consoleError.mockRestore();
  });

  it("allows an active HR Admin through an admin route", async () => {
    const response = await middleware(request("/dashboard/admin/users"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("preserves all Supabase cookie mutations on an admin-role redirect", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: {
        id: "app-user",
        role: "sodexo",
        is_active: true,
        last_active_at: null,
      },
      error: null,
    });

    const response = await middleware(request("/dashboard/admin/users"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/dashboard");
    expectRefreshedCookiesPreserved(response);
  });

  it.each([
    [
      "inactive",
      {
        data: {
          id: "app-user",
          role: "hr_admin",
          is_active: false,
          last_active_at: null,
        },
        error: null,
      },
    ],
    ["orphan", { data: null, error: null }],
  ])(
    "locally revokes and clears a definitive %s session",
    async (_label, lookup) => {
      mocks.maybeSingle.mockResolvedValue(lookup);

      const response = await middleware(request("/dashboard"));

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost/login");
      expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
      expect(mocks.rpc).not.toHaveBeenCalled();
      expectRejectedCookieCleared(response);
    }
  );

  it("returns a recoverable error for an uncertain app-user lookup", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: {
        id: "app-user",
        role: "hr_admin",
        is_active: true,
        last_active_at: null,
      },
      error: { code: "42501", message: "private policy detail" },
    });

    const response = await middleware(request("/dashboard"));

    expect(response.status).toBe(503);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("retry-after")).toBe("5");
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expectRefreshedCookiesPreserved(response);
    expect(await response.text()).toBe(
      "Vi kunde inte verifiera ditt konto just nu. Försök igen om en stund."
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
      "private policy detail"
    );
  });

  it("returns a recoverable error for uncertain authenticated Auth state", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "auth-user" } },
      error: { code: "bad_jwt", message: "private token detail" },
    });

    const response = await middleware(request("/dashboard"));

    expect(response.status).toBe(503);
    expect(response.headers.get("location")).toBeNull();
    expect(mocks.maybeSingle).not.toHaveBeenCalled();
    expect(mocks.signOut).not.toHaveBeenCalled();
    expectRefreshedCookiesPreserved(response);
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
      "private token detail"
    );
  });

  it("still clears a definitive rejected session when local signout errors", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.signOut.mockResolvedValue({
      error: { code: "network_error", message: "provider detail" },
    });

    const response = await middleware(request("/dashboard"));

    expect(response.status).toBe(307);
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
    expectRejectedCookieCleared(response);
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
      "provider detail"
    );
  });

  it("bounds a hung local signout and still redirects with cleared cookies", async () => {
    vi.useFakeTimers();
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.signOut.mockReturnValue(new Promise(() => {}));

    const responsePromise = middleware(request("/dashboard"));
    await vi.advanceTimersByTimeAsync(501);
    const response = await responsePromise;

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/login");
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
    expectRejectedCookieCleared(response);
    expect(consoleError).toHaveBeenCalledWith(
      "[Middleware] Rejected-session revocation failed",
      { reason: "SIGNOUT_TIMEOUT" }
    );
  });

  it("lets an inactive user reach login after revoking and clearing the session", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: {
        id: "app-user",
        role: "hr_admin",
        is_active: false,
        last_active_at: null,
      },
      error: null,
    });

    const response = await middleware(request("/login"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
    expectRejectedCookieCleared(response);
  });

  it("prevents an uncertain app-user lookup from reaching the login redirect loop", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: null,
      error: { code: "PGRST000", message: "private connection detail" },
    });

    const response = await middleware(request("/login"));

    expect(response.status).toBe(503);
    expect(response.headers.get("location")).toBeNull();
    expect(mocks.signOut).not.toHaveBeenCalled();
    expectRefreshedCookiesPreserved(response);
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
      "private connection detail"
    );
  });

  it("returns a recoverable error on an unexpected protected-route failure", async () => {
    mocks.getUser.mockRejectedValue(new Error("private session detail"));

    const response = await middleware(request("/dashboard"));

    expect(response.status).toBe(503);
    expect(response.headers.get("location")).toBeNull();
    expect(mocks.signOut).not.toHaveBeenCalled();
    expectRefreshedCookiesPreserved(response);
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
      "private session detail"
    );
  });

  it("preserves refreshed cookies on an unauthenticated login redirect", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const response = await middleware(request("/dashboard"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/login");
    expect(mocks.signOut).not.toHaveBeenCalled();
    expectRefreshedCookiesPreserved(response);
  });
});
