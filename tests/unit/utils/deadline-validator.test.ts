/**
 * Tests for Deadline Validator Utilities
 * Story 8.11: Important Dates Deadline Columns
 */

import { describe, it, expect } from 'vitest';
import {
  validateDeadlines,
  isSubmissionOpen,
  isCancellationOpen,
  getDeadlineStatus,
  getDeadlineWarning,
  getDeadlineBadgeLabel,
} from '@/lib/utils/deadline-validator';

function toLocalDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

describe('validateDeadlines', () => {
  it('should validate when both deadlines are null', () => {
    const result = validateDeadlines(null, null, '2025-12-31');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should validate when submit date is before cancel date', () => {
    const result = validateDeadlines('2025-12-01', '2025-12-15', '2025-12-31');
    expect(result.valid).toBe(true);
  });

  it('should validate when submit date equals cancel date', () => {
    const result = validateDeadlines('2025-12-15', '2025-12-15', '2025-12-31');
    expect(result.valid).toBe(true);
  });

  it('should fail when submit date is after cancel date', () => {
    const result = validateDeadlines('2025-12-20', '2025-12-15', '2025-12-31');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Inlämningsdeadline måste vara före');
  });

  it('should fail when cancel date is after event date', () => {
    const result = validateDeadlines('2025-12-01', '2026-01-15', '2025-12-31');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Avbokningsdeadline måste vara före');
  });

  it('should validate when only submit deadline is provided', () => {
    const result = validateDeadlines('2025-12-01', null, '2025-12-31');
    expect(result.valid).toBe(true);
  });
});

describe('isSubmissionOpen', () => {
  it('should return true when no deadline is set', () => {
    expect(isSubmissionOpen(null)).toBe(true);
  });

  it('should return true for future deadline', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const dateString = toLocalDateOnly(futureDate);
    expect(isSubmissionOpen(dateString)).toBe(true);
  });

  it('should return false for past deadline', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 7);
    const dateString = toLocalDateOnly(pastDate);
    expect(isSubmissionOpen(dateString)).toBe(false);
  });

  it('should return false for invalid date', () => {
    expect(isSubmissionOpen('invalid-date')).toBe(false);
  });
});

describe('isCancellationOpen', () => {
  it('should return true when no deadline is set', () => {
    expect(isCancellationOpen(null)).toBe(true);
  });

  it('should return true for future deadline', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const dateString = toLocalDateOnly(futureDate);
    expect(isCancellationOpen(dateString)).toBe(true);
  });

  it('should return false for past deadline', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 7);
    const dateString = toLocalDateOnly(pastDate);
    expect(isCancellationOpen(dateString)).toBe(false);
  });
});

describe('getDeadlineStatus', () => {
  it('should return "open" when both deadlines are in the future', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const dateString = toLocalDateOnly(futureDate);
    expect(getDeadlineStatus(dateString, dateString)).toBe('open');
  });

  it('should return "submit_closed" when submit deadline has passed but cancel is open', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 7);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    expect(getDeadlineStatus(toLocalDateOnly(pastDate), toLocalDateOnly(futureDate))).toBe('submit_closed');
  });

  it('should return "cancel_closed" when cancel deadline has passed', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 7);
    expect(getDeadlineStatus(toLocalDateOnly(pastDate), toLocalDateOnly(pastDate))).toBe('cancel_closed');
  });

  it('should return "open" when no deadlines are set', () => {
    expect(getDeadlineStatus(null, null)).toBe('open');
  });
});

describe('getDeadlineWarning', () => {
  it('should return null when no deadlines are set', () => {
    expect(getDeadlineWarning(null, null)).toBeNull();
  });

  it('should return warning when deadline is approaching (within 7 days)', () => {
    const approachingDate = new Date();
    approachingDate.setDate(approachingDate.getDate() + 3);
    const dateString = toLocalDateOnly(approachingDate);
    const warning = getDeadlineWarning(dateString, null);
    expect(warning).toContain('OBS: Inlämningsdeadline');
    expect(warning).toContain('3 dagar kvar');
  });

  it('should return error message when deadline has passed', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    const dateString = toLocalDateOnly(pastDate);
    const warning = getDeadlineWarning(dateString, null);
    expect(warning).toContain('Inlämningsdeadline har passerat');
  });

  it('should return null for distant future deadlines', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const dateString = toLocalDateOnly(futureDate);
    expect(getDeadlineWarning(dateString, null)).toBeNull();
  });
});

describe('getDeadlineBadgeLabel', () => {
  it('should return correct label for submit_closed status', () => {
    expect(getDeadlineBadgeLabel('submit_closed')).toBe('Inlämning Stängd');
  });

  it('should return correct label for cancel_closed status', () => {
    expect(getDeadlineBadgeLabel('cancel_closed')).toBe('Avbokning Stängd');
  });

  it('should return correct label for open status', () => {
    expect(getDeadlineBadgeLabel('open')).toBe('Öppen');
  });
});
