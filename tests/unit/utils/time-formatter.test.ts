/**
 * Time Formatter Utility Unit Tests
 * Story: 8.10 PE3 Date Time Selection
 */

import { describe, it, expect } from "vitest";
import {
  validateTimeFormat,
  formatTimeDisplay,
  parseTimeInput,
} from "@/lib/utils/time-formatter";

describe("validateTimeFormat", () => {
  describe("Valid Inputs", () => {
    it("validates HH:MM format", () => {
      expect(validateTimeFormat("14:30")).toEqual({ valid: true });
      expect(validateTimeFormat("09:05")).toEqual({ valid: true });
      expect(validateTimeFormat("00:00")).toEqual({ valid: true });
      expect(validateTimeFormat("23:59")).toEqual({ valid: true });
    });

    it("validates HH:MM:SS format", () => {
      expect(validateTimeFormat("14:30:00")).toEqual({ valid: true });
      expect(validateTimeFormat("09:05:30")).toEqual({ valid: true });
      expect(validateTimeFormat("23:59:59")).toEqual({ valid: true });
    });

    it("validates single-digit hours", () => {
      expect(validateTimeFormat("9:30")).toEqual({ valid: true });
      expect(validateTimeFormat("0:00")).toEqual({ valid: true });
    });
  });

  describe("Invalid Inputs", () => {
    it("rejects empty string", () => {
      const result = validateTimeFormat("");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Tid får inte vara tom");
    });

    it("rejects whitespace only", () => {
      const result = validateTimeFormat("   ");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Tid får inte vara tom");
    });

    it("rejects invalid format", () => {
      const result = validateTimeFormat("14-30");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("format HH:MM");
    });

    it("rejects text input", () => {
      const result = validateTimeFormat("afternoon");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("format HH:MM");
    });

    it("rejects hours > 23", () => {
      const result = validateTimeFormat("24:00");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Ogiltig timme");
    });

    it("rejects hours > 23 (extreme case)", () => {
      const result = validateTimeFormat("99:00");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Ogiltig timme");
    });

    it("rejects negative hours", () => {
      const result = validateTimeFormat("-1:00");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("format HH:MM");
    });

    it("rejects minutes > 59", () => {
      const result = validateTimeFormat("14:60");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Ogiltig minut");
    });

    it("rejects minutes > 59 (extreme case)", () => {
      const result = validateTimeFormat("14:99");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Ogiltig minut");
    });

    it("rejects negative minutes", () => {
      const result = validateTimeFormat("14:-5");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("format HH:MM");
    });

    it("rejects seconds > 59", () => {
      const result = validateTimeFormat("14:30:60");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Ogiltig sekund");
    });

    it("rejects incomplete format (hour only)", () => {
      const result = validateTimeFormat("14");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("format HH:MM");
    });

    it("rejects incomplete format (missing minutes)", () => {
      const result = validateTimeFormat("14:");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("format HH:MM");
    });
  });
});

describe("formatTimeDisplay", () => {
  describe("Valid Inputs", () => {
    it("formats HH:MM correctly", () => {
      expect(formatTimeDisplay("14:30")).toBe("14:30");
      expect(formatTimeDisplay("09:05")).toBe("09:05");
    });

    it("formats HH:MM:SS to HH:MM (strips seconds)", () => {
      expect(formatTimeDisplay("14:30:00")).toBe("14:30");
      expect(formatTimeDisplay("09:05:30")).toBe("09:05");
      expect(formatTimeDisplay("23:59:59")).toBe("23:59");
    });

    it("pads single-digit hours with leading zero", () => {
      expect(formatTimeDisplay("9:30")).toBe("09:30");
      expect(formatTimeDisplay("0:00")).toBe("00:00");
      expect(formatTimeDisplay("5:45")).toBe("05:45");
    });

    it("handles edge cases (midnight and end of day)", () => {
      expect(formatTimeDisplay("00:00")).toBe("00:00");
      expect(formatTimeDisplay("23:59")).toBe("23:59");
    });
  });

  describe("Null and Invalid Inputs", () => {
    it("returns empty string for null", () => {
      expect(formatTimeDisplay(null)).toBe("");
    });

    it("returns empty string for empty string", () => {
      expect(formatTimeDisplay("")).toBe("");
    });

    it("returns empty string for whitespace", () => {
      expect(formatTimeDisplay("   ")).toBe("");
    });

    it("returns empty string for invalid format", () => {
      expect(formatTimeDisplay("invalid")).toBe("");
      expect(formatTimeDisplay("25:00")).toBe("");
      expect(formatTimeDisplay("14:60")).toBe("");
    });
  });
});

describe("parseTimeInput", () => {
  describe("24-hour Format", () => {
    it("parses HH:MM format", () => {
      expect(parseTimeInput("14:30")).toBe("14:30");
      expect(parseTimeInput("09:05")).toBe("09:05");
      expect(parseTimeInput("00:00")).toBe("00:00");
      expect(parseTimeInput("23:59")).toBe("23:59");
    });

    it("parses HH:MM:SS format and strips seconds", () => {
      expect(parseTimeInput("14:30:00")).toBe("14:30");
      expect(parseTimeInput("09:05:30")).toBe("09:05");
    });

    it("pads single-digit hours", () => {
      expect(parseTimeInput("9:30")).toBe("09:30");
      expect(parseTimeInput("0:00")).toBe("00:00");
      expect(parseTimeInput("5:45")).toBe("05:45");
    });

    it("handles whitespace", () => {
      expect(parseTimeInput("  14:30  ")).toBe("14:30");
      expect(parseTimeInput("\t09:05\n")).toBe("09:05");
    });
  });

  describe("12-hour Format (AM/PM)", () => {
    it("converts PM times correctly", () => {
      expect(parseTimeInput("2:30 PM")).toBe("14:30");
      expect(parseTimeInput("1:00 PM")).toBe("13:00");
      expect(parseTimeInput("11:45 PM")).toBe("23:45");
    });

    it("converts AM times correctly", () => {
      expect(parseTimeInput("9:30 AM")).toBe("09:30");
      expect(parseTimeInput("1:00 AM")).toBe("01:00");
      expect(parseTimeInput("11:45 AM")).toBe("11:45");
    });

    it("handles 12:00 PM (noon) correctly", () => {
      expect(parseTimeInput("12:00 PM")).toBe("12:00");
      expect(parseTimeInput("12:30 PM")).toBe("12:30");
    });

    it("handles 12:00 AM (midnight) correctly", () => {
      expect(parseTimeInput("12:00 AM")).toBe("00:00");
      expect(parseTimeInput("12:30 AM")).toBe("00:30");
    });

    it("is case-insensitive for AM/PM", () => {
      expect(parseTimeInput("2:30 pm")).toBe("14:30");
      expect(parseTimeInput("2:30 PM")).toBe("14:30");
      expect(parseTimeInput("9:30 am")).toBe("09:30");
      expect(parseTimeInput("9:30 AM")).toBe("09:30");
    });

    it("handles whitespace around AM/PM", () => {
      expect(parseTimeInput("2:30  PM")).toBe("14:30");
      expect(parseTimeInput("  9:30 AM  ")).toBe("09:30");
    });

    it("handles HH:MM:SS with AM/PM", () => {
      expect(parseTimeInput("2:30:00 PM")).toBe("14:30");
      expect(parseTimeInput("9:05:30 AM")).toBe("09:05");
    });
  });

  describe("Null and Invalid Inputs", () => {
    it("returns null for empty string", () => {
      expect(parseTimeInput("")).toBe(null);
    });

    it("returns null for whitespace", () => {
      expect(parseTimeInput("   ")).toBe(null);
    });

    it("returns null for invalid format", () => {
      expect(parseTimeInput("invalid")).toBe(null);
      expect(parseTimeInput("14-30")).toBe(null);
      expect(parseTimeInput("afternoon")).toBe(null);
    });

    it("returns null for out-of-range hours", () => {
      expect(parseTimeInput("24:00")).toBe(null);
      expect(parseTimeInput("25:30")).toBe(null);
    });

    it("returns null for out-of-range minutes", () => {
      expect(parseTimeInput("14:60")).toBe(null);
      expect(parseTimeInput("14:99")).toBe(null);
    });

    it("returns null for invalid AM/PM times", () => {
      expect(parseTimeInput("13:00 PM")).toBe(null); // 13 is not valid in 12-hour
      expect(parseTimeInput("14:30 AM")).toBe(null); // 14 is not valid in 12-hour
    });
  });

  describe("Edge Cases", () => {
    it("handles midnight variations", () => {
      expect(parseTimeInput("00:00")).toBe("00:00");
      expect(parseTimeInput("12:00 AM")).toBe("00:00");
      expect(parseTimeInput("0:00")).toBe("00:00");
    });

    it("handles noon variations", () => {
      expect(parseTimeInput("12:00")).toBe("12:00");
      expect(parseTimeInput("12:00 PM")).toBe("12:00");
    });

    it("handles end of day", () => {
      expect(parseTimeInput("23:59")).toBe("23:59");
      expect(parseTimeInput("11:59 PM")).toBe("23:59");
    });
  });
});
