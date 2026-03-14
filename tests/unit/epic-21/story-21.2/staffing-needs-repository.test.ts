import { describe, it, expect, beforeEach, vi } from "vitest";
import { StaffingNeedsRepository } from "@/lib/server/repositories/staffing-needs-repository";
import * as supabaseServer from "@/lib/supabase/server";
import * as notificationHelpers from "@/lib/services/notification-helpers";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/services/notification-helpers", () => ({
  getTodayStockholm: vi.fn(),
}));

describe("StaffingNeedsRepository", () => {
  let repository: StaffingNeedsRepository;

  beforeEach(() => {
    repository = new StaffingNeedsRepository();
    vi.clearAllMocks();
  });

  describe("getAll", () => {
    it("returns locations with progress, last_change, and correct percentage", async () => {
      const needsData = [
        {
          id: "uuid-1",
          location: "Trelleborg",
          headcount_need: 50,
          updated_at: "2026-01-10T10:00:00Z",
          updated_by: "user-1",
          users: { email: "admin@stena.se" },
        },
        {
          id: "uuid-2",
          location: "Göteborg",
          headcount_need: 0,
          updated_at: "2026-01-10T10:00:00Z",
          updated_by: "user-2",
          users: { email: "admin2@stena.se" },
        },
      ];

      const employeeRows = [
        // 20 crew-ready in Trelleborg
        ...Array.from({ length: 20 }, () => ({ town_district: "Trelleborg" })),
        // 5 crew-ready in Göteborg
        ...Array.from({ length: 5 }, () => ({ town_district: "Göteborg" })),
      ];

      const changelogData = [
        {
          location: "Trelleborg",
          old_value: 40,
          new_value: 50,
          changed_at: "2026-01-10T09:00:00Z",
          users: { email: "changer@stena.se" },
        },
      ];

      const mockClient = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "staffing_needs") {
            const chain: Record<string, ReturnType<typeof vi.fn>> = {};
            chain.select = vi.fn().mockReturnValue(chain);
            chain.order = vi.fn().mockReturnValue(chain);
            chain.then = vi.fn().mockImplementation((onFulfilled) =>
              Promise.resolve({ data: needsData, error: null }).then(onFulfilled)
            );
            return chain;
          }

          if (table === "employees") {
            const chain: Record<string, ReturnType<typeof vi.fn>> = {};
            chain.select = vi.fn().mockReturnValue(chain);
            chain.in = vi.fn().mockReturnValue(chain);
            chain.eq = vi.fn().mockReturnValue(chain);
            chain.then = vi.fn().mockImplementation((onFulfilled) =>
              Promise.resolve({ data: employeeRows, error: null }).then(onFulfilled)
            );
            return chain;
          }

          if (table === "staffing_needs_changelog") {
            const chain: Record<string, ReturnType<typeof vi.fn>> = {};
            chain.select = vi.fn().mockReturnValue(chain);
            chain.in = vi.fn().mockReturnValue(chain);
            chain.order = vi.fn().mockReturnValue(chain);
            chain.then = vi.fn().mockImplementation((onFulfilled) =>
              Promise.resolve({ data: changelogData, error: null }).then(onFulfilled)
            );
            return chain;
          }

          const chain: Record<string, ReturnType<typeof vi.fn>> = {};
          chain.select = vi.fn().mockReturnValue(chain);
          chain.then = vi.fn().mockImplementation((onFulfilled) =>
            Promise.resolve({ data: null, error: null }).then(onFulfilled)
          );
          return chain;
        }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      const results = await repository.getAll();

      expect(results).toHaveLength(2);

      // Trelleborg: 20 crew-ready / 50 need = 40%
      expect(results[0].location).toBe("Trelleborg");
      expect(results[0].crewReadyCount).toBe(20);
      expect(results[0].crewReadyPercentage).toBe(40);
      expect(results[0].last_change).toEqual({
        old_value: 40,
        new_value: 50,
        changed_at: "2026-01-10T09:00:00Z",
        changed_by_email: "changer@stena.se",
      });

      // Göteborg: headcount_need = 0 → percentage must be 0
      expect(results[1].location).toBe("Göteborg");
      expect(results[1].crewReadyPercentage).toBe(0);
      expect(results[1].last_change).toBeNull();

      // Verify batched queries: only 3 from() calls (needs, employees, changelog)
      expect(mockClient.from).toHaveBeenCalledTimes(3);
    });
  });

  describe("updateNeed", () => {
    it("skips write when value unchanged (via RPC)", async () => {
      const rpcFn = vi.fn().mockResolvedValue({
        data: [{ old_value: 10, new_value: 10 }],
        error: null,
      });

      const mockClient = { rpc: rpcFn };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      const result = await repository.updateNeed("Trelleborg", 10, "user-1");

      expect(result).toEqual({ oldValue: 10, newValue: 10 });
      expect(rpcFn).toHaveBeenCalledWith("update_staffing_need", {
        p_location: "Trelleborg",
        p_new_value: 10,
        p_user_id: "user-1",
      });
    });

    it("updates atomically via RPC when value changes", async () => {
      const rpcFn = vi.fn().mockResolvedValue({
        data: [{ old_value: 10, new_value: 25 }],
        error: null,
      });

      const mockClient = { rpc: rpcFn };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      const result = await repository.updateNeed("Trelleborg", 25, "user-1");

      expect(result).toEqual({ oldValue: 10, newValue: 25 });
      expect(rpcFn).toHaveBeenCalledWith("update_staffing_need", {
        p_location: "Trelleborg",
        p_new_value: 25,
        p_user_id: "user-1",
      });
    });

    it("throws when RPC returns error", async () => {
      const rpcFn = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Staffing need not found for location: Trelleborg" },
      });

      const mockClient = { rpc: rpcFn };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      await expect(
        repository.updateNeed("Trelleborg", 25, "user-1")
      ).rejects.toThrow("Failed to update staffing need for Trelleborg");
    });
  });

  describe("getHistory", () => {
    it("filters by current year and returns entries in DESC order with changed_by_email", async () => {
      vi.mocked(notificationHelpers.getTodayStockholm).mockReturnValue("2026-03-13");

      const changelogEntries = [
        {
          id: "cl-2",
          location: "Trelleborg",
          old_value: 40,
          new_value: 50,
          changed_by: "user-1",
          changed_at: "2026-02-15T10:00:00Z",
          users: { email: "admin@stena.se" },
        },
        {
          id: "cl-1",
          location: "Trelleborg",
          old_value: 30,
          new_value: 40,
          changed_by: "user-2",
          changed_at: "2026-01-10T08:00:00Z",
          users: { email: "admin2@stena.se" },
        },
      ];

      const chain: Record<string, ReturnType<typeof vi.fn>> = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.gte = vi.fn().mockReturnValue(chain);
      chain.order = vi.fn().mockReturnValue(chain);
      chain.then = vi.fn().mockImplementation((onFulfilled) =>
        Promise.resolve({ data: changelogEntries, error: null }).then(onFulfilled)
      );

      const mockClient = {
        from: vi.fn().mockReturnValue(chain),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      const results = await repository.getHistory("Trelleborg");

      expect(mockClient.from).toHaveBeenCalledWith("staffing_needs_changelog");
      expect(chain.gte).toHaveBeenCalledWith(
        "changed_at",
        "2026-01-01T00:00:00+01:00"
      );
      expect(chain.order).toHaveBeenCalledWith("changed_at", { ascending: false });

      expect(results).toHaveLength(2);
      // changed_by should be the UUID, changed_by_email should be the email
      expect(results[0].changed_by).toBe("user-1");
      expect(results[0].changed_by_email).toBe("admin@stena.se");
      expect(results[0].id).toBe("cl-2");
      expect(results[1].changed_by).toBe("user-2");
      expect(results[1].changed_by_email).toBe("admin2@stena.se");
      expect(results[1].id).toBe("cl-1");
    });
  });
});
