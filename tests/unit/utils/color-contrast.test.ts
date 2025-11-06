/**
 * Tests for Color Contrast Utilities
 * Story 9.1: Category Color Coding for Column Headers
 */

import { describe, it, expect } from 'vitest';
import {
  hexToRgb,
  getContrastRatio,
  getReadableTextColor,
  meetsContrastRequirement,
  isValidHexColor,
  adjustColorBrightness,
  CATEGORY_COLOR_PALETTE,
} from '@/lib/utils/color-contrast';

describe('Color Contrast Utilities', () => {
  describe('hexToRgb', () => {
    it('should convert 6-digit hex to RGB', () => {
      expect(hexToRgb('#3B82F6')).toEqual({ r: 59, g: 130, b: 246 });
      expect(hexToRgb('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('should convert 3-digit hex to RGB', () => {
      expect(hexToRgb('#FFF')).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb('#000')).toEqual({ r: 0, g: 0, b: 0 });
      expect(hexToRgb('#F00')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('should handle hex without # prefix', () => {
      expect(hexToRgb('3B82F6')).toEqual({ r: 59, g: 130, b: 246 });
      expect(hexToRgb('FFF')).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('should return null for invalid hex', () => {
      expect(hexToRgb('invalid')).toBeNull();
      expect(hexToRgb('#GGGGGG')).toBeNull();
      expect(hexToRgb('')).toBeNull();
    });
  });

  describe('getContrastRatio', () => {
    it('should calculate correct contrast ratio for black and white', () => {
      const ratio = getContrastRatio('#000000', '#FFFFFF');
      expect(ratio).toBeCloseTo(21, 1); // Maximum contrast ratio
    });

    it('should calculate contrast ratio for same colors', () => {
      const ratio = getContrastRatio('#3B82F6', '#3B82F6');
      expect(ratio).toBeCloseTo(1, 1); // Same color = 1:1 ratio
    });

    it('should be symmetric', () => {
      const ratio1 = getContrastRatio('#3B82F6', '#FFFFFF');
      const ratio2 = getContrastRatio('#FFFFFF', '#3B82F6');
      expect(ratio1).toBeCloseTo(ratio2, 2);
    });

    it('should return 0 for invalid colors', () => {
      expect(getContrastRatio('invalid', '#FFFFFF')).toBe(0);
      expect(getContrastRatio('#FFFFFF', 'invalid')).toBe(0);
    });
  });

  describe('getReadableTextColor', () => {
    it('should return white for dark backgrounds', () => {
      expect(getReadableTextColor('#000000')).toBe('white');
      expect(getReadableTextColor('#1a1a1a')).toBe('white');
      expect(getReadableTextColor('#2a2a2a')).toBe('white');
    });

    it('should return black for light backgrounds', () => {
      expect(getReadableTextColor('#FFFFFF')).toBe('black');
      expect(getReadableTextColor('#F0F0F0')).toBe('black');
      expect(getReadableTextColor('#F59E0B')).toBe('black'); // Yellow
    });

    it('should handle all palette colors', () => {
      CATEGORY_COLOR_PALETTE.forEach((color) => {
        const result = getReadableTextColor(color.value);
        expect(['white', 'black']).toContain(result);
        // Verify it matches the predefined textColor in palette
        expect(result).toBe(color.textColor);
      });
    });
  });

  describe('meetsContrastRequirement', () => {
    it('should pass WCAG AA for good contrast', () => {
      expect(meetsContrastRequirement('#FFFFFF', '#000000', 'AA')).toBe(true);
      expect(meetsContrastRequirement('#000000', '#FFFFFF', 'AA')).toBe(true);
    });

    it('should fail WCAG AA for poor contrast', () => {
      expect(meetsContrastRequirement('#FFFFFF', '#F0F0F0', 'AA')).toBe(false);
      expect(meetsContrastRequirement('#000000', '#1a1a1a', 'AA')).toBe(false);
    });

    it('should have higher threshold for AAA', () => {
      // A contrast that passes AA but not AAA
      const textColor = '#767676';
      const bgColor = '#FFFFFF';
      expect(meetsContrastRequirement(textColor, bgColor, 'AA')).toBe(true);
      expect(meetsContrastRequirement(textColor, bgColor, 'AAA')).toBe(false);
    });
  });

  describe('isValidHexColor', () => {
    it('should validate 6-digit hex colors', () => {
      expect(isValidHexColor('#3B82F6')).toBe(true);
      expect(isValidHexColor('#FFFFFF')).toBe(true);
      expect(isValidHexColor('#000000')).toBe(true);
      expect(isValidHexColor('#abc123')).toBe(true);
    });

    it('should validate 3-digit hex colors', () => {
      expect(isValidHexColor('#FFF')).toBe(true);
      expect(isValidHexColor('#000')).toBe(true);
      expect(isValidHexColor('#F0A')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(isValidHexColor('3B82F6')).toBe(false); // Missing #
      expect(isValidHexColor('#GGGGGG')).toBe(false); // Invalid chars
      expect(isValidHexColor('#12345')).toBe(false); // Wrong length
      expect(isValidHexColor('')).toBe(false);
      expect(isValidHexColor('blue')).toBe(false);
    });
  });

  describe('adjustColorBrightness', () => {
    it('should lighten colors with positive percentage', () => {
      const original = '#3B82F6';
      const lighter = adjustColorBrightness(original, 20);
      expect(lighter).not.toBe(original);
      expect(isValidHexColor(lighter)).toBe(true);
    });

    it('should darken colors with negative percentage', () => {
      const original = '#3B82F6';
      const darker = adjustColorBrightness(original, -20);
      expect(darker).not.toBe(original);
      expect(isValidHexColor(darker)).toBe(true);
    });

    it('should return original for invalid color', () => {
      const invalid = 'invalid';
      expect(adjustColorBrightness(invalid, 20)).toBe(invalid);
    });

    it('should clamp values to valid RGB range', () => {
      const white = '#FFFFFF';
      const lighterWhite = adjustColorBrightness(white, 50);
      expect(lighterWhite).toBe('#ffffff'); // Already max brightness
      
      const black = '#000000';
      const darkerBlack = adjustColorBrightness(black, -50);
      expect(darkerBlack).toBe('#000000'); // Already min brightness
    });
  });

  describe('CATEGORY_COLOR_PALETTE', () => {
    it('should have at least 8 colors', () => {
      expect(CATEGORY_COLOR_PALETTE.length).toBeGreaterThanOrEqual(8);
    });

    it('should have all valid hex colors', () => {
      CATEGORY_COLOR_PALETTE.forEach((color) => {
        expect(isValidHexColor(color.value)).toBe(true);
      });
    });

    it('should have unique color values', () => {
      const values = CATEGORY_COLOR_PALETTE.map((c) => c.value);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });

    it('should have name and textColor for each entry', () => {
      CATEGORY_COLOR_PALETTE.forEach((color) => {
        expect(color.name).toBeTruthy();
        expect(['white', 'black']).toContain(color.textColor);
      });
    });

    it('should meet WCAG AA contrast requirements', () => {
      CATEGORY_COLOR_PALETTE.forEach((color) => {
        // All palette colors use black text
        const textColor = '#000000';
        const passes = meetsContrastRequirement(textColor, color.value, 'AA');
        expect(passes).toBe(true);
      });
    });
  });
});
