import { describe, it, expect } from 'vitest';
import { canEditStaffingNeeds } from '@/lib/utils/role-utils';
import { UserRole } from '@/lib/types/user';

describe('canEditStaffingNeeds', () => {
  it('returns true for hr_admin', () => {
    expect(canEditStaffingNeeds(UserRole.HR_ADMIN)).toBe(true);
  });

  it('returns true for crewing', () => {
    expect(canEditStaffingNeeds(UserRole.CREWING)).toBe(true);
  });

  it.each([
    UserRole.RECRUITER,
    UserRole.ADMIN_LIMITED,
    UserRole.SODEXO,
    UserRole.OMC,
    UserRole.PAYROLL,
    UserRole.TOPLUX,
  ])('returns false for %s', (role) => {
    expect(canEditStaffingNeeds(role)).toBe(false);
  });
});
