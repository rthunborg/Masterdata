/**
 * Normalizes Swedish personal number (personnummer) to standard format YYMMDD-XXXX
 *
 * Accepts:
 * - YYMMDDXXXX (10 digits) → YYMMDD-XXXX
 * - YYYYMMDDXXXX (12 digits) → YYMMDD-XXXX (strips century)
 * - YYMMDD-XXXX (already normalized) → YYMMDD-XXXX
 * - YYYYMMDD-XXXX (with century) → YYMMDD-XXXX (strips century)
 *
 * @param ssn - Swedish personal number in any accepted format
 * @returns Normalized SSN in format YYMMDD-XXXX
 * @throws Error if SSN format is invalid
 *
 * @example
 * normalizeSSN('8503151234') // Returns '850315-1234'
 * normalizeSSN('850315-1234') // Returns '850315-1234'
 * normalizeSSN('19850315-1234') // Returns '850315-1234'
 * normalizeSSN('198503151234') // Returns '850315-1234'
 */
export function normalizeSSN(ssn: string): string {
  // Remove all non-digit characters
  const digitsOnly = ssn.replace(/\D/g, '');

  // Validate length
  if (digitsOnly.length === 10) {
    // YYMMDDXXXX → YYMMDD-XXXX
    return `${digitsOnly.slice(0, 6)}-${digitsOnly.slice(6)}`;
  } else if (digitsOnly.length === 12) {
    // YYYYMMDDXXXX → YYMMDD-XXXX (strip first 2 digits)
    return `${digitsOnly.slice(2, 8)}-${digitsOnly.slice(8)}`;
  } else {
    throw new Error(
      `Invalid SSN length: expected 10 or 12 digits, got ${digitsOnly.length}`
    );
  }
}
