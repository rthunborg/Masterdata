import { beforeEach, describe, expect, it, vi } from "vitest";

import { UserRepository } from "@/lib/server/repositories/user-repository";
import * as supabaseServer from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("UserRepository activity tracking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when the caller-bound activity RPC succeeds", async () => {
    vi.mocked(supabaseServer.createClient).mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as never);

    await expect(new UserRepository().updateLastActive()).resolves.toBe(true);
  });

  it("returns false when the caller-bound activity RPC fails", async () => {
    vi.mocked(supabaseServer.createClient).mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "activity unavailable" },
      }),
    } as never);

    await expect(new UserRepository().updateLastActive()).resolves.toBe(false);
  });
});
