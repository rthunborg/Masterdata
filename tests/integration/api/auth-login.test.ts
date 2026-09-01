import { NextRequest } from "next/server";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  from: vi.fn(),
  maybeSingle: vi.fn(),
  rpc: vi.fn(),
  cookieGetAll: vi.fn(),
  cookieSet: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    getAll: mocks.cookieGetAll,
    set: mocks.cookieSet,
  })),
}));

import { POST } from "@/app/api/auth/login/route";

const activeUser = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "admin@example.com",
  role: "hr_admin",
  is_active: true,
  created_at: "2026-07-12T00:00:00.000Z",
  last_active_at: null,
};

function loginRequest() {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: "sb-127-auth-token=stale-session; sb-127-auth-token.0=chunk",
    },
    body: JSON.stringify({
      email: "admin@example.com",
      password: "valid-password-123",
    }),
  });
}

function expectLocalSessionCleared(response: Response) {
  expect(response.headers.get("set-cookie")).toMatch(
    /sb-127-auth-token=.*Max-Age=0/i
  );
  expect(mocks.cookieSet).toHaveBeenCalledWith(
    "sb-127-auth-token",
    "",
    expect.objectContaining({ maxAge: 0, path: "/" })
  );
}

describe("POST /api/auth/login", () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:15421";
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    mocks.cookieGetAll.mockReturnValue([
      { name: "sb-127-auth-token", value: "new-session" },
      { name: "sb-127-auth-token.0", value: "new-chunk" },
    ]);
    mocks.signInWithPassword.mockResolvedValue({
      data: {
        user: { id: "auth-user-id", email: "admin@example.com" },
        session: { access_token: "token", expires_at: 2_000_000_000 },
      },
      error: null,
    });
    mocks.signOut.mockResolvedValue({ error: null });
    mocks.maybeSingle.mockResolvedValue({ data: activeUser, error: null });
    mocks.rpc.mockResolvedValue({ data: "2026-09-01T10:00:00Z", error: null });
    mocks.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: mocks.maybeSingle })),
      })),
    });
    mocks.createClient.mockResolvedValue({
      auth: {
        signInWithPassword: mocks.signInWithPassword,
        signOut: mocks.signOut,
      },
      from: mocks.from,
      rpc: mocks.rpc,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    consoleError.mockRestore();
  });

  it("uses one authenticated client for lookup, activity update, and final revalidation", async () => {
    const response = await POST(loginRequest());

    expect(response.status).toBe(200);
    expect(mocks.createClient).toHaveBeenCalledOnce();
    expect(mocks.from).toHaveBeenCalledTimes(2);
    expect(mocks.rpc).toHaveBeenCalledWith("update_own_last_active_at");
    expect(mocks.maybeSingle).toHaveBeenCalledTimes(2);
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it("globally signs out and clears cookies for a definitive missing app user", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });

    const response = await POST(loginRequest());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe("USER_NOT_FOUND");
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "global" });
    expectLocalSessionCleared(response);
  });

  it("globally signs out and clears cookies for a definitive inactive app user", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: { ...activeUser, is_active: false },
      error: null,
    });

    const response = await POST(loginRequest());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe("ACCOUNT_DEACTIVATED");
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "global" });
    expect(mocks.rpc).not.toHaveBeenCalled();
    expectLocalSessionCleared(response);
  });

  it("fails closed on data plus a lookup error without global revocation", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: activeUser,
      error: { code: "42501", message: "sensitive lookup detail" },
    });

    const response = await POST(loginRequest());
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error.code).toBe("ACCOUNT_LOOKUP_FAILED");
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expectLocalSessionCleared(response);
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
      "sensitive lookup detail"
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
      "admin@example.com"
    );
  });

  it("keeps activity update errors non-blocking and revalidates the active account", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: "PGRST500", message: "write detail" },
    });

    const response = await POST(loginRequest());
    await expect(response.json()).resolves.toMatchObject({
      data: { user: { id: activeUser.id, is_active: true } },
    });

    expect(response.status).toBe(200);
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.maybeSingle).toHaveBeenCalledTimes(2);
    expect(mocks.cookieSet).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("write detail");
  });

  it("bounds a hanging activity update and still revalidates the active account", async () => {
    vi.useFakeTimers();
    mocks.rpc.mockReturnValue(new Promise(() => {}));

    const responsePromise = POST(loginRequest());
    await vi.advanceTimersByTimeAsync(501);
    const response = await responsePromise;
    await expect(response.json()).resolves.toMatchObject({
      data: { user: { id: activeUser.id, is_active: true } },
    });

    expect(response.status).toBe(200);
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.maybeSingle).toHaveBeenCalledTimes(2);
    expect(mocks.cookieSet).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it.each([
    ["missing", null, "USER_NOT_FOUND"],
    ["inactive", { ...activeUser, is_active: false }, "ACCOUNT_DEACTIVATED"],
  ])(
    "rejects a final %s snapshot instead of accepting stale active data",
    async (_label, finalSnapshot, expectedCode) => {
      mocks.maybeSingle
        .mockResolvedValueOnce({ data: activeUser, error: null })
        .mockResolvedValueOnce({ data: finalSnapshot, error: null });

      const response = await POST(loginRequest());
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe(expectedCode);
      expect(mocks.signOut).toHaveBeenCalledWith({ scope: "global" });
      expectLocalSessionCleared(response);
    }
  );

  it("fails closed on a final query error without global revocation", async () => {
    mocks.maybeSingle
      .mockResolvedValueOnce({ data: activeUser, error: null })
      .mockResolvedValueOnce({
        data: activeUser,
        error: { code: "42501", message: "final lookup detail" },
      });

    const response = await POST(loginRequest());
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error.code).toBe("ACCOUNT_LOOKUP_FAILED");
    expect(mocks.signOut).not.toHaveBeenCalled();
    expectLocalSessionCleared(response);
  });

  it("clears cookies when a post-auth lookup throws", async () => {
    mocks.maybeSingle.mockRejectedValue(new Error("private exception detail"));

    const response = await POST(loginRequest());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error.code).toBe("INTERNAL_ERROR");
    expect(mocks.signOut).not.toHaveBeenCalled();
    expectLocalSessionCleared(response);
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
      "private exception detail"
    );
  });

  it("still clears cookies when definitive-session global signout errors", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.signOut.mockResolvedValue({
      error: { code: "network_error", message: "provider detail" },
    });

    const response = await POST(loginRequest());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe("USER_NOT_FOUND");
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "global" });
    expectLocalSessionCleared(response);
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
      "provider detail"
    );
  });

  it("bounds a hung global signout and still rejects with cleared cookies", async () => {
    vi.useFakeTimers();
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.signOut.mockReturnValue(new Promise(() => {}));

    const responsePromise = POST(loginRequest());
    await vi.advanceTimersByTimeAsync(501);
    const response = await responsePromise;
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe("USER_NOT_FOUND");
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "global" });
    expectLocalSessionCleared(response);
    expect(consoleError).toHaveBeenCalledWith(
      "[Login] Global rejected-session revocation failed",
      { reason: "SIGNOUT_TIMEOUT" }
    );
  });
});
