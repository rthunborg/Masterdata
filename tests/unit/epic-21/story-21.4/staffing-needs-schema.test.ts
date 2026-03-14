import { describe, it, expect } from 'vitest';
import { updateStaffingNeedSchema } from '@/lib/validation/staffing-needs';

describe('updateStaffingNeedSchema', () => {
  it('accepts valid input with Trelleborg', () => {
    const result = updateStaffingNeedSchema.safeParse({
      location: 'Trelleborg',
      headcount_need: 5,
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid input with Göteborg and zero headcount', () => {
    const result = updateStaffingNeedSchema.safeParse({
      location: 'Göteborg',
      headcount_need: 0,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid location', () => {
    const result = updateStaffingNeedSchema.safeParse({
      location: 'Stockholm',
      headcount_need: 5,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative headcount', () => {
    const result = updateStaffingNeedSchema.safeParse({
      location: 'Trelleborg',
      headcount_need: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer headcount', () => {
    const result = updateStaffingNeedSchema.safeParse({
      location: 'Trelleborg',
      headcount_need: 2.5,
    });
    expect(result.success).toBe(false);
  });

  it('rejects headcount exceeding 9999', () => {
    const result = updateStaffingNeedSchema.safeParse({
      location: 'Trelleborg',
      headcount_need: 10000,
    });
    expect(result.success).toBe(false);
  });

  it('accepts headcount at upper bound of 9999', () => {
    const result = updateStaffingNeedSchema.safeParse({
      location: 'Trelleborg',
      headcount_need: 9999,
    });
    expect(result.success).toBe(true);
  });
});
