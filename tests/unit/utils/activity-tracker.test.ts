import { describe, it, expect } from "vitest";
import { shouldUpdateActivity } from "@/lib/server/utils/activity-tracker";

describe("shouldUpdateActivity", () => {
  it("should return true when lastActive is null", () => {
    expect(shouldUpdateActivity(null)).toBe(true);
  });

  it("should return false when last activity was less than 5 minutes ago", () => {
    const fourMinutesAgo = new Date(Date.now() - 4 * 60 * 1000).toISOString();
    expect(shouldUpdateActivity(fourMinutesAgo)).toBe(false);
  });

  it("should return true when last activity was more than 5 minutes ago", () => {
    const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000).toISOString();
    expect(shouldUpdateActivity(sixMinutesAgo)).toBe(true);
  });

  it("should return true when last activity was a very old timestamp", () => {
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    expect(shouldUpdateActivity(oneYearAgo)).toBe(true);
  });

  it("should return false when exactly at 5 minute threshold", () => {
    const now = 1600000000000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const exactlyFiveMinutes = new Date(now - 5 * 60 * 1000).toISOString();
    expect(shouldUpdateActivity(exactlyFiveMinutes)).toBe(false);
    vi.restoreAllMocks();
  });
});
