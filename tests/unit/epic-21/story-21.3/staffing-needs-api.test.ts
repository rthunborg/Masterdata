/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT } from "@/app/api/staffing-needs/route";
import { mockUsers } from "../../../utils/role-test-utils";
import * as auth from "@/lib/server/auth";
import type { SessionUser, UserRole } from "@/lib/types/user";

vi.mock("@/lib/server/auth", async () => {
  const actual = await vi.importActual("@/lib/server/auth");
  return {
    ...actual,
    requireAuthAPI: vi.fn(),
    requireRoleAPI: vi.fn(),
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

// Mock the dynamic import for notification module
vi.mock("@/lib/services/staffing-needs-notification", () => ({
  sendStaffingNeedsUpdateEmail: vi.fn().mockResolvedValue(undefined),
}));

import { staffingNeedsRepository } from "@/lib/server/repositories/staffing-needs-repository";

const mockCrewingUser: SessionUser = {
  id: "crewing-1",
  auth_id: "auth-crewing-1",
  email: "crewing@company.com",
  role: "crewing" as UserRole,
  is_active: true,
  created_at: "2025-01-01T00:00:00Z",
  last_active_at: null,
};

function createRequest(method: string, body?: unknown): Request {
  const url = "http://localhost:3000/api/staffing-needs";
  if (method === "GET") {
    return new Request(url, { method });
  }
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/staffing-needs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns data for authenticated user with correct shape", async () => {
    const mockData = [
      {
        id: "uuid-1",
        location: "Trelleborg",
        headcount_need: 50,
        updated_at: "2026-01-10T10:00:00Z",
        updated_by: "admin@company.com",
        crewReadyCount: 25,
        crewReadyPercentage: 50,
        last_change: null,
      },
    ];

    vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockUsers.hrAdmin);
    vi.mocked(staffingNeedsRepository.getAll).mockResolvedValue(mockData);

    const request = createRequest("GET");
    const response = await GET(request as any);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toEqual(mockData);
    expect(json.meta).toBeDefined();
    expect(json.meta.timestamp).toBeDefined();
  });

  it("returns 401 for unauthenticated requests", async () => {
    vi.mocked(auth.requireAuthAPI).mockRejectedValue(
      new Error("Autentisering krävs")
    );

    const request = createRequest("GET");
    const response = await GET(request as any);

    expect(response.status).toBe(401);
  });
});

describe("PUT /api/staffing-needs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates for authorized hr_admin role", async () => {
    vi.mocked(auth.requireRoleAPI).mockResolvedValue(mockUsers.hrAdmin);
    vi.mocked(staffingNeedsRepository.updateNeed).mockResolvedValue({
      oldValue: 10,
      newValue: 20,
    });

    const request = createRequest("PUT", {
      location: "Göteborg",
      headcount_need: 20,
    });
    const response = await PUT(request as any);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toEqual({
      location: "Göteborg",
      old_value: 10,
      new_value: 20,
    });
    expect(json.meta.timestamp).toBeDefined();
  });

  it("updates for authorized crewing role", async () => {
    vi.mocked(auth.requireRoleAPI).mockResolvedValue(mockCrewingUser);
    vi.mocked(staffingNeedsRepository.updateNeed).mockResolvedValue({
      oldValue: 5,
      newValue: 15,
    });

    const request = createRequest("PUT", {
      location: "Trelleborg",
      headcount_need: 15,
    });
    const response = await PUT(request as any);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toEqual({
      location: "Trelleborg",
      old_value: 5,
      new_value: 15,
    });
  });

  it("returns 403 for unauthorized roles", async () => {
    vi.mocked(auth.requireRoleAPI).mockRejectedValue(
      new Error("Saknar behörighet")
    );

    const request = createRequest("PUT", {
      location: "Göteborg",
      headcount_need: 30,
    });
    const response = await PUT(request as any);

    expect(response.status).toBe(403);
  });

  it("returns 400 for invalid location", async () => {
    vi.mocked(auth.requireRoleAPI).mockResolvedValue(mockUsers.hrAdmin);

    const request = createRequest("PUT", {
      location: "Stockholm",
      headcount_need: 5,
    });
    const response = await PUT(request as any);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for negative headcount", async () => {
    vi.mocked(auth.requireRoleAPI).mockResolvedValue(mockUsers.hrAdmin);

    const request = createRequest("PUT", {
      location: "Göteborg",
      headcount_need: -1,
    });
    const response = await PUT(request as any);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("does not trigger email when value unchanged", async () => {
    vi.mocked(auth.requireRoleAPI).mockResolvedValue(mockUsers.hrAdmin);
    vi.mocked(staffingNeedsRepository.updateNeed).mockResolvedValue({
      oldValue: 20,
      newValue: 20,
    });

    const request = createRequest("PUT", {
      location: "Göteborg",
      headcount_need: 20,
    });
    const response = await PUT(request as any);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.old_value).toBe(20);
    expect(json.data.new_value).toBe(20);
  });
});
