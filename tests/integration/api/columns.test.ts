/**
 * Integration Tests for Columns API
 * 
 * Story: 22.13 - Harden custom-column lifecycle authorization
 * 
 * Tests verify the legacy user-facing DELETE endpoint is closed:
 * - Authenticated callers are directed to the HR Admin-managed lifecycle
 * - The repository delete path is never reached
 * - Unauthenticated callers retain the existing 401 behavior
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { DELETE } from "@/app/api/columns/[id]/route";
import { NextRequest } from "next/server";
import * as auth from "@/lib/server/auth";
import { columnConfigRepository } from "@/lib/server/repositories/column-config-repository";
import { UserRole } from "@/lib/types/user";

vi.mock("@/lib/server/auth", () => ({
  requireAuthAPI: vi.fn(),
  createErrorResponse: vi.fn((error) => {
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "An unexpected error occurred",
        },
      }),
      { status: 500 }
    );
  }),
  createForbiddenResponse: vi.fn((message) => {
    return new Response(
      JSON.stringify({
        error: {
          code: "FORBIDDEN",
          message: message || "Saknar behörighet",
        },
      }),
      { status: 403 }
    );
  }),
}));
vi.mock("@/lib/server/repositories/column-config-repository");

describe("DELETE /api/columns/[id]", () => {
  const mockExternalUser = {
    id: "user-1",
    auth_id: "auth-1",
    email: "external@example.com",
    role: UserRole.SODEXO,
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
    last_active_at: null,
  };

  const mockHRAdminUser = {
    id: "admin-1",
    auth_id: "auth-admin",
    email: "admin@example.com",
    role: UserRole.HR_ADMIN,
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
    last_active_at: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["external party", mockExternalUser],
    ["HR Admin", mockHRAdminUser],
  ])("returns 403 for an authenticated %s", async (_label, user) => {
    vi.mocked(auth.requireAuthAPI).mockResolvedValue(user);

    const request = new NextRequest(
      "http://localhost:3000/api/columns/col-custom-1",
      { method: "DELETE" }
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "col-custom-1" }),
    });
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.error.code).toBe("FORBIDDEN");
    expect(json.error.message).toBe(
      "Endast HR Admin kan ta bort kolumner via adminpanelen"
    );
    expect(columnConfigRepository.deleteColumn).not.toHaveBeenCalled();
  });

  it("should return 401 for unauthenticated requests", async () => {
    vi.mocked(auth.requireAuthAPI).mockRejectedValue(
      new Error("Autentisering krävs")
    );
    vi.mocked(auth.createErrorResponse).mockReturnValue(
      new Response(
        JSON.stringify({
          error: {
            code: "UNAUTHORIZED",
            message: "Autentisering krävs",
          },
        }),
        { status: 401 }
      ) as never
    );

    const request = new NextRequest(
      "http://localhost:3000/api/columns/col-custom-1",
      {
        method: "DELETE",
      }
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "col-custom-1" }),
    });
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
    expect(columnConfigRepository.deleteColumn).not.toHaveBeenCalled();
  });

});

