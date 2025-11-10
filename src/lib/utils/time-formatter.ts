/**
 * Time Formatting and Validation Utilities
 * 
 * Handles time formatting for PE3 date appointments
 * All times use 24-hour format (HH:MM)
 * 
 * Story: 8.10 PE3 Date Time Selection
 */

/**
 * Validate time format (HH:MM or HH:MM:SS)
 * 
 * @param time - Time string to validate
 * @returns Object with valid boolean and optional error message
 * 
 * @example
 * validateTimeFormat("14:30") // { valid: true }
 * validateTimeFormat("25:00") // { valid: false, error: "Invalid hour: must be 00-23" }
 */
export function validateTimeFormat(time: string): {
  valid: boolean;
  error?: string;
} {
  if (!time || time.trim() === '') {
    return { valid: false, error: 'Tid får inte vara tom' };
  }

  // Match HH:MM or HH:MM:SS format
  const timeRegex = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
  const match = time.trim().match(timeRegex);

  if (!match) {
    return {
      valid: false,
      error: 'Tid måste vara i format HH:MM (t.ex. 14:30)',
    };
  }

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = match[3] ? parseInt(match[3], 10) : 0;

  // Validate hour range (0-23)
  if (hours < 0 || hours > 23) {
    return {
      valid: false,
      error: 'Ogiltig timme: måste vara 00-23',
    };
  }

  // Validate minute range (0-59)
  if (minutes < 0 || minutes > 59) {
    return {
      valid: false,
      error: 'Ogiltig minut: måste vara 00-59',
    };
  }

  // Validate second range (0-59) if provided
  if (seconds < 0 || seconds > 59) {
    return {
      valid: false,
      error: 'Ogiltig sekund: måste vara 00-59',
    };
  }

  return { valid: true };
}

/**
 * Format time for display (HH:MM format, 24-hour clock)
 * 
 * @param time - Time string to format (can be HH:MM or HH:MM:SS)
 * @returns Formatted time string in HH:MM format, or empty string if null/invalid
 * 
 * @example
 * formatTimeDisplay("14:30:00") // "14:30"
 * formatTimeDisplay("09:05") // "09:05"
 * formatTimeDisplay(null) // ""
 */
export function formatTimeDisplay(time: string | null): string {
  if (!time) {
    return '';
  }

  const trimmed = time.trim();
  if (trimmed === '') {
    return '';
  }

  // Validate format first
  const validation = validateTimeFormat(trimmed);
  if (!validation.valid) {
    return '';
  }

  // Extract HH:MM from HH:MM or HH:MM:SS
  const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (!match) {
    return '';
  }

  const hours = match[1].padStart(2, '0');
  const minutes = match[2];

  return `${hours}:${minutes}`;
}

/**
 * Parse time input from various formats to HH:MM
 * 
 * Supports:
 * - "14:30" (HH:MM)
 * - "14:30:00" (HH:MM:SS)
 * - "2:30" (H:MM) - pads hour
 * - "2:30 PM" / "2:30 AM" (12-hour format) - converts to 24-hour
 * 
 * @param input - Time string to parse
 * @returns Normalized time in HH:MM format, or null if invalid
 * 
 * @example
 * parseTimeInput("14:30") // "14:30"
 * parseTimeInput("2:30 PM") // "14:30"
 * parseTimeInput("9:05") // "09:05"
 * parseTimeInput("invalid") // null
 */
export function parseTimeInput(input: string): string | null {
  if (!input || input.trim() === '') {
    return null;
  }

  const trimmed = input.trim();

  // Check for 12-hour format with AM/PM
  const ampmRegex = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i;
  const ampmMatch = trimmed.match(ampmRegex);

  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = parseInt(ampmMatch[2], 10);
    const period = ampmMatch[4].toUpperCase();

    // Validate 12-hour format hours (1-12)
    if (hours < 1 || hours > 12) {
      return null;
    }

    // Validate minutes
    if (minutes < 0 || minutes > 59) {
      return null;
    }

    // Convert to 24-hour format
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }

    // Validate converted hours (should always be valid after above logic)
    if (hours < 0 || hours > 23) {
      return null;
    }

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  // Try standard 24-hour format validation
  const validation = validateTimeFormat(trimmed);
  if (!validation.valid) {
    return null;
  }

  // Format to HH:MM
  return formatTimeDisplay(trimmed);
}
