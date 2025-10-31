import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "@/app/api/important-dates/import/route";
import { NextRequest } from "next/server";
import * as auth from "@/lib/server/auth";
import { importantDateRepository } from "@/lib/server/repositories/important-date-repository";
import { UserRole } from "@/lib/types/user";

vi.mock("@/lib/server/auth");
vi.mock("@/lib/server/repositories/important-date-repository");

// Helper to create a mock NextRequest with FormData
function createRequestWithFormData(formData: FormData): NextRequest {
  const request = new NextRequest("http://localhost:3000/api/important-dates/import", {
    method: "POST",
  });
  
  vi.spyOn(request, 'formData').mockResolvedValue(formData);
  
  return request;
}

// Helper to create a File object with text() method for testing
function createMockFile(content: string, filename: string, mimeType: string = "text/csv"): File {
  const blob = new Blob([content], { type: mimeType });
  const file = new File([blob], filename, { type: mimeType });
  
  if (!file.text) {
    Object.defineProperty(file, 'text', {
      value: async () => content,
      writable: false
    });
  }
  
  return file;
}

describe("POST /api/important-dates/import - Empty Notes Field", () => {
  const mockHRAdminUser = {
    id: "user-1",
    auth_id: "auth-1",
    email: "admin@example.com",
    role: UserRole.HR_ADMIN,
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
  };

  const columnMapping = {
    "Week Number": "week_number",
    "Year": "year",
    "Category": "category",
    "Date Description": "date_description",
    "Date Value": "date_value",
    "Notes": "notes",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(importantDateRepository.findAll).mockResolvedValue([]);
  });

  it("should accept important date with empty notes field", async () => {
    const csvContent = `Week Number,Year,Category,Date Description,Date Value,Notes
7,2025,Stena Dates,Fredag 14/2,15-16/2,`;

    vi.mocked(importantDateRepository.createMany).mockResolvedValue({
      imported: 1,
      skipped: 0,
      errors: [],
    });

    const file = createMockFile(csvContent, "test.csv");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("columnMapping", JSON.stringify(columnMapping));

    const request = createRequestWithFormData(formData);
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.imported).toBe(1);
    expect(body.data.skipped).toBe(0);
    
    // Verify that createMany was called with null for notes
    expect(vi.mocked(importantDateRepository.createMany)).toHaveBeenCalledWith([
      {
        week_number: 7,
        year: 2025,
        category: "Stena Dates",
        date_description: "Fredag 14/2",
        date_value: "15-16/2",
        notes: null,
      }
    ]);
  });

  it("should store NULL for notes when field was empty", async () => {
    const csvContent = `Week Number,Year,Category,Date Description,Date Value,Notes
10,2025,ÖMC Dates,Fredag 7/3,8-9/3,
,2025,Other,Special Date,2025-03-15,`;

    vi.mocked(importantDateRepository.createMany).mockResolvedValue({
      imported: 2,
      skipped: 0,
      errors: [],
    });

    const file = createMockFile(csvContent, "test.csv");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("columnMapping", JSON.stringify(columnMapping));

    const request = createRequestWithFormData(formData);
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.imported).toBe(2);
    expect(body.data.skipped).toBe(0);
    
    // Verify both dates have null for notes
    const createManyCall = vi.mocked(importantDateRepository.createMany).mock.calls[0][0];
    expect(createManyCall[0].notes).toBe(null);
    expect(createManyCall[1].notes).toBe(null);
  });

  it("should accept mix of populated and empty notes", async () => {
    const csvContent = `Week Number,Year,Category,Date Description,Date Value,Notes
7,2025,Stena Dates,Fredag 14/2,15-16/2,This has a note
10,2025,ÖMC Dates,Fredag 7/3,8-9/3,
12,2025,Other,Special,2025-03-15,Another note`;

    vi.mocked(importantDateRepository.createMany).mockResolvedValue({
      imported: 3,
      skipped: 0,
      errors: [],
    });

    const file = createMockFile(csvContent, "test.csv");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("columnMapping", JSON.stringify(columnMapping));

    const request = createRequestWithFormData(formData);
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.imported).toBe(3);
    expect(body.data.skipped).toBe(0);
    
    // Verify notes values
    const createManyCall = vi.mocked(importantDateRepository.createMany).mock.calls[0][0];
    expect(createManyCall[0].notes).toBe("This has a note");
    expect(createManyCall[1].notes).toBe(null);
    expect(createManyCall[2].notes).toBe("Another note");
  });

  it("should trim and convert whitespace-only notes to null", async () => {
    const csvContent = `Week Number,Year,Category,Date Description,Date Value,Notes
7,2025,Stena Dates,Fredag 14/2,15-16/2,   `;

    vi.mocked(importantDateRepository.createMany).mockResolvedValue({
      imported: 1,
      skipped: 0,
      errors: [],
    });

    const file = createMockFile(csvContent, "test.csv");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("columnMapping", JSON.stringify(columnMapping));

    const request = createRequestWithFormData(formData);
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.imported).toBe(1);
    
    // Verify whitespace-only notes was converted to null
    const createManyCall = vi.mocked(importantDateRepository.createMany).mock.calls[0][0];
    expect(createManyCall[0].notes).toBe(null);
  });
});
