import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockUsers } from "../../utils/role-test-utils";

const mocks = vi.hoisted(() => ({
  requireHRAdminAPI: vi.fn(),
  requireAuthAPI: vi.fn(),
  createCustomColumn: vi.fn(),
  deleteColumn: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAuthAPI: mocks.requireAuthAPI,
  requireHRAdminAPI: mocks.requireHRAdminAPI,
  createErrorResponse: vi.fn((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: message === "Saknar behörighet" ? 403 : 500 }
    );
  }),
  createForbiddenResponse: vi.fn((message: string) =>
    NextResponse.json({ error: message }, { status: 403 })
  ),
}));

vi.mock("@/lib/server/repositories/column-config-repository", () => ({
  columnConfigRepository: {
    createCustomColumn: mocks.createCustomColumn,
    deleteColumn: mocks.deleteColumn,
    updateColumn: vi.fn(),
  },
}));

const { POST } = await import("@/app/api/columns/route");
const { DELETE } = await import("@/app/api/columns/[id]/route");

function createRequest(isMasterdata: boolean) {
  return new NextRequest("http://localhost:3000/api/columns", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      column_name: "Story 22.13 probe",
      db_column_name: "story_22_13_probe",
      column_type: "boolean",
      is_masterdata: isMasterdata,
    }),
  });
}

describe("POST /api/columns authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createCustomColumn.mockResolvedValue({
      id: "column-22-13",
      column_name: "Story 22.13 probe",
      db_column_name: "story_22_13_probe",
      column_type: "boolean",
      is_masterdata: false,
      role_permissions: {},
    });
  });

  it("rejects external-party column creation before privileged DDL", async () => {
    mocks.requireHRAdminAPI.mockRejectedValue(new Error("Saknar behörighet"));

    const response = await POST(createRequest(true));

    expect(response.status).toBe(403);
    expect(mocks.createCustomColumn).not.toHaveBeenCalled();
  });

  it("preserves HR Admin's explicit masterdata classification", async () => {
    mocks.requireHRAdminAPI.mockResolvedValue(mockUsers.hrAdmin);

    const response = await POST(createRequest(true));

    expect(response.status).toBe(201);
    expect(mocks.createCustomColumn).toHaveBeenCalledWith(
      expect.objectContaining({
        role: mockUsers.hrAdmin.role,
        is_masterdata: true,
      })
    );
  });

  it("rejects the legacy external-party column deletion path", async () => {
    mocks.requireAuthAPI.mockResolvedValue(mockUsers.sodexo);

    const response = await DELETE(
      new NextRequest("http://localhost:3000/api/columns/column-22-13", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "column-22-13" }) }
    );

    expect(response.status).toBe(403);
    expect(mocks.deleteColumn).not.toHaveBeenCalled();
  });
});
