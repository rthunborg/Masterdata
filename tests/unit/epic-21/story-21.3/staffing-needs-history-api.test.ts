/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/staffing-needs/history/route";
import { mockUsers } from "../../../utils/role-test-utils";
import * as auth from "@/lib/server/auth";

vi.mock("@/lib/server/auth", async () => {
  const actual = await vi.importActual("@/lib/server/auth");
  return {
    ...actual,
    requireAuthAPI: vi.fn(),
    createErrorResponse: (actual as any).createErrorResponse,
  };
});

vi.mock("@/lib/server/repositories/staffing-needs-repository", () => ({
  staffingNeedsRepository: {
    getAll: vi.fn(),
    updateNeed: vi.fn(),
    getHistory: vi.fn(),
  },
}));

import { staffingNeedsRepository } from "@/lib/server/repositories/staffing-needs-repository";

function createHistoryRequest(location?: string): Request {
  const url = location
    ? `http://localhost:3000/api/staffing-needs/history?location=${encodeURIComponent(location)}`
    : "http://localhost:3000/api/staffing-needs/history";
  return new Request(url, { method: "GET" });
}

describe("GET /api/staffing-needs/history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns changelog for valid location", async () => {
    const mockHistory = [
      {
        id: "cl-1",
        location: "Göteborg",
        old_value: 10,
        new_value: 20,
        changed_by: "admin@company.com",
        changed_at: "2026-03-01T10:00:00Z",
      },
    ];

    vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockUsers.hrAdmin);
    vi.mocked(staffingNeedsRepository.getHistory).mockResolvedValue(mockHistory);

    const request = createHistoryRequest("Göteborg");
    const response = await GET(request as any);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toEqual(mockHistory);
    expect(json.meta.timestamp).toBeDefined();
    expect(staffingNeedsRepository.getHistory).toHaveBeenCalledWith("Göteborg");
  });

  it("returns 400 when location param is missing", async () => {
    vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockUsers.hrAdmin);

    const request = createHistoryRequest();
    const response = await GET(request as any);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.message).toContain("Invalid location");
  });

  it("returns 400 for invalid location value", async () => {
    vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockUsers.hrAdmin);

    const request = createHistoryRequest("Stockholm");
    const response = await GET(request as any);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 401 for unauthenticated requests", async () => {
    vi.mocked(auth.requireAuthAPI).mockRejectedValue(
      new Error("Autentisering krävs")
    );

    const request = createHistoryRequest("Göteborg");
    const response = await GET(request as any);

    expect(response.status).toBe(401);
  });
});
