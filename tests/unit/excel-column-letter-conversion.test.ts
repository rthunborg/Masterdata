/**
 * Unit Tests for Excel Column Letter Conversion
 * 
 * Tests the getExcelColumnLetter function to ensure it correctly handles
 * column indices beyond 26 (A-Z), generating proper multi-letter column references.
 */

import { describe, it, expect } from "vitest";

/**
 * Convert column number to Excel column letter(s)
 * This is the same function used in the export route
 */
function getExcelColumnLetter(columnNumber: number): string {
  let columnLetter = '';
  let temp = columnNumber;
  
  while (temp > 0) {
    const remainder = (temp - 1) % 26;
    columnLetter = String.fromCharCode(65 + remainder) + columnLetter;
    temp = Math.floor((temp - 1) / 26);
  }
  
  return columnLetter;
}

describe("Excel Column Letter Conversion", () => {
  describe("Single letter columns (1-26)", () => {
    it("should convert 1 to A", () => {
      expect(getExcelColumnLetter(1)).toBe("A");
    });

    it("should convert 26 to Z", () => {
      expect(getExcelColumnLetter(26)).toBe("Z");
    });

    it("should handle middle single letters", () => {
      expect(getExcelColumnLetter(5)).toBe("E");
      expect(getExcelColumnLetter(10)).toBe("J");
      expect(getExcelColumnLetter(20)).toBe("T");
    });
  });

  describe("Double letter columns (27-702)", () => {
    it("should convert 27 to AA", () => {
      expect(getExcelColumnLetter(27)).toBe("AA");
    });

    it("should convert 28 to AB", () => {
      expect(getExcelColumnLetter(28)).toBe("AB");
    });

    it("should convert 52 to AZ", () => {
      expect(getExcelColumnLetter(52)).toBe("AZ");
    });

    it("should convert 53 to BA", () => {
      expect(getExcelColumnLetter(53)).toBe("BA");
    });

    it("should convert 702 to ZZ", () => {
      expect(getExcelColumnLetter(702)).toBe("ZZ");
    });
  });

  describe("Triple letter columns (703+)", () => {
    it("should convert 703 to AAA", () => {
      expect(getExcelColumnLetter(703)).toBe("AAA");
    });

    it("should convert 704 to AAB", () => {
      expect(getExcelColumnLetter(704)).toBe("AAB");
    });
  });

  describe("Realistic employee export scenarios", () => {
    it("should handle 40 columns (typical full employee export)", () => {
      // 40 columns would be column AN
      expect(getExcelColumnLetter(40)).toBe("AN");
    });

    it("should handle 50 columns (employee + many custom fields)", () => {
      // 50 columns would be column AX
      expect(getExcelColumnLetter(50)).toBe("AX");
    });

    it("should handle 100 columns (extreme case)", () => {
      // 100 columns would be column CV
      expect(getExcelColumnLetter(100)).toBe("CV");
    });
  });

  describe("Edge cases", () => {
    it("should handle boundaries correctly", () => {
      // Test the boundary between single and double letters
      expect(getExcelColumnLetter(25)).toBe("Y");
      expect(getExcelColumnLetter(26)).toBe("Z");
      expect(getExcelColumnLetter(27)).toBe("AA");
      
      // Test the boundary between double and triple letters
      expect(getExcelColumnLetter(701)).toBe("ZY");
      expect(getExcelColumnLetter(702)).toBe("ZZ");
      expect(getExcelColumnLetter(703)).toBe("AAA");
    });
  });
});
