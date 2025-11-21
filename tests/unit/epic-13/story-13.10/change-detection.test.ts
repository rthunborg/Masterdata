/**
 * Unit tests for change detection utility
 * Story 13.10: Prevent Unnecessary View Refreshes
 */

import { describe, it, expect } from "vitest";
import { hasValueChanged } from "@/lib/utils/change-detection";

describe("hasValueChanged", () => {
  describe("string values", () => {
    it("should detect string changes", () => {
      expect(hasValueChanged("original", "changed")).toBe(true);
    });

    it("should return false for unchanged strings", () => {
      expect(hasValueChanged("same", "same")).toBe(false);
    });

    it("should trim whitespace when comparing strings", () => {
      expect(hasValueChanged("  value  ", "value")).toBe(false);
      expect(hasValueChanged("value", "  value  ")).toBe(false);
      expect(hasValueChanged("value1", "value2")).toBe(true);
    });
  });

  describe("number values", () => {
    it("should detect number changes", () => {
      expect(hasValueChanged(1, 2)).toBe(true);
      expect(hasValueChanged(0, 1)).toBe(true);
    });

    it("should return false for unchanged numbers", () => {
      expect(hasValueChanged(42, 42)).toBe(false);
      expect(hasValueChanged(0, 0)).toBe(false);
    });

    it("should handle NaN correctly", () => {
      expect(hasValueChanged(NaN, NaN)).toBe(false);
      expect(hasValueChanged(NaN, 1)).toBe(true);
      expect(hasValueChanged(1, NaN)).toBe(true);
    });

    it("should handle Infinity correctly", () => {
      expect(hasValueChanged(Infinity, Infinity)).toBe(false);
      expect(hasValueChanged(-Infinity, -Infinity)).toBe(false);
      expect(hasValueChanged(Infinity, -Infinity)).toBe(true);
    });
  });

  describe("boolean values", () => {
    it("should detect boolean changes", () => {
      expect(hasValueChanged(true, false)).toBe(true);
      expect(hasValueChanged(false, true)).toBe(true);
    });

    it("should return false for unchanged booleans", () => {
      expect(hasValueChanged(true, true)).toBe(false);
      expect(hasValueChanged(false, false)).toBe(false);
    });
  });

  describe("null and undefined", () => {
    it("should detect change from null to value", () => {
      expect(hasValueChanged(null, "value")).toBe(true);
      expect(hasValueChanged(null, 1)).toBe(true);
      expect(hasValueChanged(null, true)).toBe(true);
    });

    it("should detect change from value to null", () => {
      expect(hasValueChanged("value", null)).toBe(true);
      expect(hasValueChanged(1, null)).toBe(true);
      expect(hasValueChanged(true, null)).toBe(true);
    });

    it("should return false for null to null", () => {
      expect(hasValueChanged(null, null)).toBe(false);
    });

    it("should detect change from undefined to value", () => {
      expect(hasValueChanged(undefined, "value")).toBe(true);
      expect(hasValueChanged(undefined, 1)).toBe(true);
    });

    it("should detect change from value to undefined", () => {
      expect(hasValueChanged("value", undefined)).toBe(true);
      expect(hasValueChanged(1, undefined)).toBe(true);
    });

    it("should return false for undefined to undefined", () => {
      expect(hasValueChanged(undefined, undefined)).toBe(false);
    });

    it("should handle null vs undefined", () => {
      expect(hasValueChanged(null, undefined)).toBe(true);
      expect(hasValueChanged(undefined, null)).toBe(true);
    });
  });

  describe("date values", () => {
    it("should detect date changes", () => {
      const date1 = new Date("2024-01-01");
      const date2 = new Date("2024-01-02");
      expect(hasValueChanged(date1, date2)).toBe(true);
    });

    it("should return false for unchanged dates", () => {
      const date1 = new Date("2024-01-01T10:00:00");
      const date2 = new Date("2024-01-01T10:00:00");
      expect(hasValueChanged(date1, date2)).toBe(false);
    });

    it("should detect changes in date strings (ISO format)", () => {
      expect(hasValueChanged("2024-01-01", "2024-01-02")).toBe(true);
    });

    it("should return false for unchanged date strings", () => {
      expect(hasValueChanged("2024-01-01T10:00:00Z", "2024-01-01T10:00:00Z")).toBe(false);
    });

    it("should handle invalid date strings as regular strings", () => {
      // Invalid date strings should be compared as regular strings
      expect(hasValueChanged("not-a-date", "also-not-a-date")).toBe(true);
      expect(hasValueChanged("not-a-date", "not-a-date")).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle empty string vs null", () => {
      expect(hasValueChanged("", null)).toBe(true);
      expect(hasValueChanged(null, "")).toBe(true);
    });

    it("should handle empty string vs undefined", () => {
      expect(hasValueChanged("", undefined)).toBe(true);
      expect(hasValueChanged(undefined, "")).toBe(true);
    });

    it("should handle whitespace-only strings", () => {
      expect(hasValueChanged("   ", "")).toBe(false); // Both trim to empty
      expect(hasValueChanged("   ", "value")).toBe(true);
    });

    it("should handle different types", () => {
      expect(hasValueChanged("1", 1)).toBe(true); // String vs number
      expect(hasValueChanged(1, "1")).toBe(true);
      expect(hasValueChanged(true, 1)).toBe(true);
      expect(hasValueChanged(null, 0)).toBe(true);
    });
  });
});

