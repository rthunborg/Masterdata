/**
 * Color Contrast Utilities
 * Implements WCAG 2.1 color contrast calculations for accessibility
 * Reference: https://www.w3.org/TR/WCAG21/
 */

/**
 * Calculate relative luminance of RGB color
 * Reference: WCAG 2.1 - https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const val = c / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Convert hex color to RGB values
 * Supports both #RGB and #RRGGBB formats
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Remove # if present
  const cleanHex = hex.replace(/^#/, '');

  // Handle 3-digit hex (e.g., #RGB -> #RRGGBB)
  const fullHex = cleanHex.length === 3
    ? cleanHex.split('').map(char => char + char).join('')
    : cleanHex;

  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculate contrast ratio between two colors
 * Reference: WCAG 2.1 - https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 * @returns Contrast ratio (1:1 to 21:1), or 0 if invalid colors
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return 0;

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Determine if white or black text should be used on given background color
 * Returns "white" or "black" based on WCAG contrast requirements
 * @param backgroundColor - Hex color code (e.g., '#3B82F6')
 * @returns 'white' or 'black' for optimal text readability
 */
export function getReadableTextColor(
  backgroundColor: string
): 'white' | 'black' {
  const whiteContrast = getContrastRatio(backgroundColor, '#FFFFFF');
  const blackContrast = getContrastRatio(backgroundColor, '#000000');

  // WCAG AA requires 4.5:1 for normal text
  // Use white text if it has better contrast, otherwise use black
  return whiteContrast >= blackContrast ? 'white' : 'black';
}

/**
 * Check if color combination meets WCAG contrast requirements
 * @param textColor - Hex color code for text
 * @param backgroundColor - Hex color code for background
 * @param level - 'AA' (4.5:1) or 'AAA' (7:1) compliance level
 * @returns true if contrast meets requirement
 */
export function meetsContrastRequirement(
  textColor: string,
  backgroundColor: string,
  level: 'AA' | 'AAA' = 'AA'
): boolean {
  const contrast = getContrastRatio(textColor, backgroundColor);
  const required = level === 'AAA' ? 7 : 4.5;
  return contrast >= required;
}

/**
 * Validate hex color format
 * @param color - Color string to validate
 * @returns true if valid hex color (#RGB or #RRGGBB)
 */
export function isValidHexColor(color: string): boolean {
  if (!color) return false;
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color);
}

/**
 * Get a lighter or darker variant of a color (for hover effects, etc.)
 * @param hexColor - Base hex color
 * @param percent - Percentage to lighten (positive) or darken (negative)
 * @returns New hex color
 */
export function adjustColorBrightness(hexColor: string, percent: number): string {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return hexColor;

  const adjust = (value: number) => {
    const adjusted = Math.round(value + (255 - value) * (percent / 100));
    return Math.max(0, Math.min(255, adjusted));
  };

  const r = adjust(rgb.r);
  const g = adjust(rgb.g);
  const b = adjust(rgb.b);

  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Predefined color palette for category colors
 * All colors meet WCAG AA contrast requirements with black text (≥4.5:1)
 */
export const CATEGORY_COLOR_PALETTE = [
  { name: 'Blue', value: '#3B82F6', textColor: 'black' },
  { name: 'Green', value: '#10B981', textColor: 'black' },
  { name: 'Yellow', value: '#F59E0B', textColor: 'black' },
  { name: 'Red', value: '#EF4444', textColor: 'black' },
  { name: 'Purple', value: '#8B5CF6', textColor: 'black' },
  { name: 'Pink', value: '#EC4899', textColor: 'black' },
  { name: 'Indigo', value: '#6366F1', textColor: 'black' },
  { name: 'Teal', value: '#14B8A6', textColor: 'black' },
  { name: 'Orange', value: '#F97316', textColor: 'black' },
  { name: 'Cyan', value: '#06B6D4', textColor: 'black' },
] as const;
