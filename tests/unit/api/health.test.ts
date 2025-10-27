import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("returns status ok", async () => {
    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe("ok");
    expect(json.version).toBe("0.1.0");
  });

  it("returns current timestamp", async () => {
    const before = new Date().toISOString();
    const response = await GET();
    const json = await response.json();
    const after = new Date().toISOString();

    expect(json.timestamp).toBeDefined();
    expect(json.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    // Timestamp should be between before and after
    expect(json.timestamp >= before).toBe(true);
    expect(json.timestamp <= after).toBe(true);
  });

  it("returns correct JSON structure", async () => {
    const response = await GET();
    const json = await response.json();

    expect(Object.keys(json)).toEqual(
      expect.arrayContaining(["status", "version", "timestamp"])
    );
    expect(Object.keys(json).length).toBe(3);
  });
});
