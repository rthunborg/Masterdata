import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  findByAuthId: vi.fn(),
  updateLastActive: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/server/repositories/user-repository", () => ({
  userRepository: {
    findByAuthId: mocks.findByAuthId,
    updateLastActive: mocks.updateLastActive,
  },
}));

import { POST } from "@/app/api/auth/login/route";

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    mocks.createClient.mockResolvedValue({
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: {
            user: { id: "auth-user-id", email: "admin@example.com" },
            session: { access_token: "token", expires_at: 2_000_000_000 },
          },
          error: null,
        }),
      },
    });
    mocks.findByAuthId.mockResolvedValue({
      id: "user-id",
      email: "admin@example.com",
      role: "hr_admin",
      is_active: true,
      created_at: "2026-07-12T00:00:00.000Z",
      last_active_at: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not let activity tracking hang an otherwise valid login", async () => {
    mocks.updateLastActive.mockReturnValue(new Promise(() => {}));
    const request = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@example.com",
        password: "valid-password-123",
      }),
    });

    const responsePromise = POST(request);
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(501);

    const response = await responsePromise;
    expect(response.status).toBe(200);
    expect(mocks.updateLastActive).toHaveBeenCalledOnce();
  });
});
