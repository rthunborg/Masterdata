import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET, POST } from "@/app/api/important-dates/route";
import { PATCH, DELETE } from "@/app/api/important-dates/[id]/route";
import { NextRequest } from "next/server";
import * as auth from "@/lib/server/auth";
import { importantDateRepository } from "@/lib/server/repositories/important-date-repository";
import type { ImportantDate, ImportantDateFormData } from "@/lib/types/important-date";
import { UserRole } from "@/lib/types/user";

vi.mock("@/lib/server/auth");
vi.mock("@/lib/server/repositories/important-date-repository");

describe("GET /api/important-dates", () => {
  const mockAuthUser = {
    id: "user-1",
    auth_id: "auth-1",
    email: "user@example.com",
    role: UserRole.SODEXO,
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
  };

  const mockHRAdminUser = {
    ...mockAuthUser,
    email: "admin@example.com",
    role: UserRole.HR_ADMIN,
  };

  const mockImportantDates: ImportantDate[] = [
    {
      id: "date-1",
      week_number: 7,
      year: 2025,
      category: "Stena Dates",
      date_description: "Fredag 14/2",
      date_value: "15-16/2",
      notes: null,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    },
    {
      id: "date-2",
      week_number: 10,
      year: 2025,
      category: "ÖMC Dates",
      date_description: "Fredag 7/3",
      date_value: "8-9/3",
      notes: "Important deadline",
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return important dates for authenticated users", async () => {
    vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockAuthUser);
    vi.mocked(importantDateRepository.findAll).mockResolvedValue(mockImportantDates);

    const request = new NextRequest("http://localhost:3000/api/important-dates");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toEqual(mockImportantDates);
    expect(importantDateRepository.findAll).toHaveBeenCalledWith(undefined);
  });

  it("should filter important dates by category", async () => {
    const stenaDates = [mockImportantDates[0]];
    vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockAuthUser);
    vi.mocked(importantDateRepository.findAll).mockResolvedValue(stenaDates);

    const request = new NextRequest(
      "http://localhost:3000/api/important-dates?category=Stena%20Dates"
    );
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toEqual(stenaDates);
    expect(importantDateRepository.findAll).toHaveBeenCalledWith("Stena Dates");
  });

  it("should return 401 for unauthenticated requests", async () => {
    vi.mocked(auth.requireAuthAPI).mockRejectedValue(
      new Error("Authentication required")
    );
    vi.mocked(auth.createErrorResponse).mockReturnValue(
      new Response(
        JSON.stringify({
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
          },
        }),
        { status: 401 }
      ) as never
    );

    const request = new NextRequest("http://localhost:3000/api/important-dates");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("should handle repository errors gracefully", async () => {
    vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockAuthUser);
    vi.mocked(importantDateRepository.findAll).mockRejectedValue(
      new Error("Database connection failed")
    );
    vi.mocked(auth.createErrorResponse).mockReturnValue(
      new Response(
        JSON.stringify({
          error: {
            code: "INTERNAL_ERROR",
            message: "Database connection failed",
          },
        }),
        { status: 500 }
      ) as never
    );

    const request = new NextRequest("http://localhost:3000/api/important-dates");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error.code).toBe("INTERNAL_ERROR");
  });
});

describe("POST /api/important-dates", () => {
  const mockHRAdminUser = {
    id: "user-1",
    auth_id: "auth-1",
    email: "admin@example.com",
    role: UserRole.HR_ADMIN,
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
  };

  const mockExternalUser = {
    ...mockHRAdminUser,
    email: "sodexo@example.com",
    role: UserRole.SODEXO,
  };

  const validFormData: ImportantDateFormData = {
    week_number: 15,
    year: 2025,
    category: "Stena Dates",
    date_description: "Test Date",
    date_value: "10/4",
    notes: null,
  };

  const mockCreatedDate: ImportantDate = {
    id: "date-new",
    ...validFormData,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create important date for HR Admin", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(importantDateRepository.create).mockResolvedValue(mockCreatedDate);

    const request = new NextRequest("http://localhost:3000/api/important-dates", {
      method: "POST",
      body: JSON.stringify(validFormData),
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.data).toEqual(mockCreatedDate);
    expect(json.meta).toHaveProperty("timestamp");
    expect(importantDateRepository.create).toHaveBeenCalledWith(validFormData);
  });

  it("should return 403 for external party users", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockRejectedValue(
      new Error("Insufficient permissions")
    );
    vi.mocked(auth.createErrorResponse).mockReturnValue(
      new Response(
        JSON.stringify({
          error: {
            code: "FORBIDDEN",
            message: "Insufficient permissions",
          },
        }),
        { status: 403 }
      ) as never
    );

    const request = new NextRequest("http://localhost:3000/api/important-dates", {
      method: "POST",
      body: JSON.stringify(validFormData),
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.error.code).toBe("FORBIDDEN");
    expect(importantDateRepository.create).not.toHaveBeenCalled();
  });

  it("should return 400 for invalid data (missing required fields)", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);

    const invalidData = {
      week_number: 15,
      // Missing required fields: year, category, date_description, date_value
    };

    const request = new NextRequest("http://localhost:3000/api/important-dates", {
      method: "POST",
      body: JSON.stringify(invalidData),
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.details).toBeDefined();
    expect(importantDateRepository.create).not.toHaveBeenCalled();
  });

  it("should return 400 for invalid week_number range", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);

    const invalidData = {
      ...validFormData,
      week_number: 54, // Invalid: max is 53
    };

    const request = new NextRequest("http://localhost:3000/api/important-dates", {
      method: "POST",
      body: JSON.stringify(invalidData),
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(importantDateRepository.create).not.toHaveBeenCalled();
  });

  it("should accept null week_number", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(importantDateRepository.create).mockResolvedValue({
      ...mockCreatedDate,
      week_number: null,
    });

    const dataWithNullWeek = {
      ...validFormData,
      week_number: null,
    };

    const request = new NextRequest("http://localhost:3000/api/important-dates", {
      method: "POST",
      body: JSON.stringify(dataWithNullWeek),
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.data.week_number).toBeNull();
  });
});

describe("PATCH /api/important-dates/[id]", () => {
  const mockHRAdminUser = {
    id: "user-1",
    auth_id: "auth-1",
    email: "admin@example.com",
    role: UserRole.HR_ADMIN,
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
  };

  const mockUpdatedDate: ImportantDate = {
    id: "date-1",
    week_number: 7,
    year: 2025,
    category: "Stena Dates",
    date_description: "Updated Description",
    date_value: "15-16/2",
    notes: "Updated notes",
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-02T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update important date for HR Admin", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(importantDateRepository.update).mockResolvedValue(mockUpdatedDate);

    const updateData = {
      date_description: "Updated Description",
      notes: "Updated notes",
    };

    const request = new NextRequest(
      "http://localhost:3000/api/important-dates/date-1",
      {
        method: "PATCH",
        body: JSON.stringify(updateData),
      }
    );
    const response = await PATCH(request, { params: { id: "date-1" } });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toEqual(mockUpdatedDate);
    expect(importantDateRepository.update).toHaveBeenCalledWith("date-1", updateData);
  });

  it("should return 403 for external party users", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockRejectedValue(
      new Error("Insufficient permissions")
    );
    vi.mocked(auth.createErrorResponse).mockReturnValue(
      new Response(
        JSON.stringify({
          error: {
            code: "FORBIDDEN",
            message: "Insufficient permissions",
          },
        }),
        { status: 403 }
      ) as never
    );

    const request = new NextRequest(
      "http://localhost:3000/api/important-dates/date-1",
      {
        method: "PATCH",
        body: JSON.stringify({ notes: "Try to update" }),
      }
    );
    const response = await PATCH(request, { params: { id: "date-1" } });
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.error.code).toBe("FORBIDDEN");
  });

  it("should return 404 for non-existent date", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(importantDateRepository.update).mockRejectedValue(
      new Error("Important date not found")
    );

    const request = new NextRequest(
      "http://localhost:3000/api/important-dates/non-existent",
      {
        method: "PATCH",
        body: JSON.stringify({ notes: "Update" }),
      }
    );
    const response = await PATCH(request, { params: { id: "non-existent" } });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error.code).toBe("NOT_FOUND");
  });

  it("should return 400 for invalid update data", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);

    const invalidData = {
      week_number: 100, // Invalid: max is 53
    };

    const request = new NextRequest(
      "http://localhost:3000/api/important-dates/date-1",
      {
        method: "PATCH",
        body: JSON.stringify(invalidData),
      }
    );
    const response = await PATCH(request, { params: { id: "date-1" } });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("DELETE /api/important-dates/[id]", () => {
  const mockHRAdminUser = {
    id: "user-1",
    auth_id: "auth-1",
    email: "admin@example.com",
    role: UserRole.HR_ADMIN,
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should delete important date for HR Admin", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(importantDateRepository.delete).mockResolvedValue();

    const request = new NextRequest(
      "http://localhost:3000/api/important-dates/date-1",
      {
        method: "DELETE",
      }
    );
    const response = await DELETE(request, { params: { id: "date-1" } });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.meta).toHaveProperty("timestamp");
    expect(importantDateRepository.delete).toHaveBeenCalledWith("date-1");
  });

  it("should return 403 for external party users", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockRejectedValue(
      new Error("Insufficient permissions")
    );
    vi.mocked(auth.createErrorResponse).mockReturnValue(
      new Response(
        JSON.stringify({
          error: {
            code: "FORBIDDEN",
            message: "Insufficient permissions",
          },
        }),
        { status: 403 }
      ) as never
    );

    const request = new NextRequest(
      "http://localhost:3000/api/important-dates/date-1",
      {
        method: "DELETE",
      }
    );
    const response = await DELETE(request, { params: { id: "date-1" } });
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.error.code).toBe("FORBIDDEN");
  });

  it("should return 404 for non-existent date", async () => {
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(importantDateRepository.delete).mockRejectedValue(
      new Error("Important date not found")
    );

    const request = new NextRequest(
      "http://localhost:3000/api/important-dates/non-existent",
      {
        method: "DELETE",
      }
    );
    const response = await DELETE(request, { params: { id: "non-existent" } });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error.code).toBe("NOT_FOUND");
  });
});
