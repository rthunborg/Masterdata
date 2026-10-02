/* eslint-disable @typescript-eslint/no-explicit-any */
/** Historical Story 14.1 recipient lookup retained by Story 22.14. */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getHrAdminEmailLookup,
  getHrAdminEmails,
} from '@/lib/services/omc-masterdata-reminder';
import * as supabaseServer from '@/lib/supabase/server';

vi.mock('@/lib/supabase/server');

describe('ÖMC reminder recipient lookup compatibility', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it('retains active HR-admin/recruiter lookup and per-recipient addresses', async () => {
    const activeFilter = vi.fn().mockResolvedValue({
      data: [{ email: 'admin@example.test' }, { email: 'recruiter@example.test' }],
      error: null,
    });
    const emailFilter = vi.fn(() => ({ eq: activeFilter }));
    const roleFilter = vi.fn(() => ({
      not: emailFilter,
    }));
    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({ in: roleFilter })),
      })),
    };
    vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as any);

    await expect(getHrAdminEmails()).resolves.toEqual([
      'admin@example.test',
      'recruiter@example.test',
    ]);
    expect(mockSupabase.from).toHaveBeenCalledWith('users');
    expect(roleFilter).toHaveBeenCalledWith('role', ['hr_admin', 'recruiter']);
    expect(emailFilter).toHaveBeenCalledWith('email', 'is', null);
    expect(activeFilter).toHaveBeenCalledWith('is_active', true);
  });

  it('retains safe empty-recipient behavior for lookup failures', async () => {
    const privateDatabaseError = 'failed while reading hr.private@example.test';
    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          in: vi.fn(() => ({
            not: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({
                data: null,
                error: { message: privateDatabaseError },
              }),
            })),
          })),
        })),
      })),
    };
    vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as any);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(getHrAdminEmailLookup()).resolves.toEqual({ status: 'error', emails: [] });
    await expect(getHrAdminEmails()).resolves.toEqual([]);
    expect(errorSpy).toHaveBeenCalledWith('[Notifications] Recipient lookup failed');
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(privateDatabaseError);
  });

  it('distinguishes a valid empty recipient configuration from a query failure', async () => {
    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          in: vi.fn(() => ({
            not: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
          })),
        })),
      })),
    };
    vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as any);

    await expect(getHrAdminEmailLookup()).resolves.toEqual({ status: 'success', emails: [] });
  });
});
