/**
 * Test Helper Utilities for ÖMC Date Tests
 * Story 11.5: Date Format & Parsing Tests
 */

import { expect } from 'vitest';
import { parseOMCDateInput } from '@/lib/utils/omc-date-formatter';

/**
 * Swedish month names for testing
 */
export const swedishMonths = [
  'januari',   // January
  'februari',  // February
  'mars',      // March
  'april',     // April
  'maj',       // May
  'juni',      // June
  'juli',      // July
  'augusti',   // August
  'september', // September
  'oktober',   // October
  'november',  // November
  'december'   // December
];

/**
 * Create an ÖMC date (start date) for testing
 * @param day - Day of month (1-31)
 * @param month - Month number (1-12)
 * @param year - Year (e.g., 2025)
 * @returns Date object for the start date
 */
export function createOMCDate(day: number, month: number, year: number): Date {
  return new Date(year, month - 1, day); // month is 0-indexed in Date constructor
}

/**
 * Validate that two dates are consecutive days
 * @param date1 - First date
 * @param date2 - Second date
 */
export function expectConsecutiveDays(date1: Date, date2: Date): void {
  const diff = Math.abs(date2.getTime() - date1.getTime());
  const daysDiff = diff / (1000 * 60 * 60 * 24);
  expect(daysDiff).toBe(1);
}

/**
 * Generate all valid ÖMC date format variants for a given date
 * @param date - Start date
 * @returns Array of format strings that should parse to this date
 */
export function parseOMCDateVariants(date: Date): string[] {
  const day1 = date.getDate();
  const day2 = day1 + 1;
  const month = date.getMonth() + 1; // 1-indexed
  const year = date.getFullYear();
  const monthName = swedishMonths[date.getMonth()];
  
  return [
    `${day1}-${day2}/${month}`, // Short format: "8-9/3"
    `${day1}-${day2} ${monthName}`, // Medium format: "8-9 mars"
    `${day1}-${day2} ${monthName} ${year}`, // Full format: "8-9 mars 2025"
    date.toISOString().split('T')[0] // ISO format: "2025-03-08"
  ];
}

/**
 * Test that all format variants parse to the expected date
 * @param inputFormats - Array of input format strings
 * @param expectedDate - Expected ISO date string (YYYY-MM-DD)
 */
export function testAllOMCDateFormats(inputFormats: string[], expectedDate: string): void {
  inputFormats.forEach(format => {
    const parsed = parseOMCDateInput(format);
    expect(parsed).not.toBeNull();
    expect(parsed?.startDate.toISOString().split('T')[0]).toBe(expectedDate);
  });
}

