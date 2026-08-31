/**
 * Safe E2E contract for the ÖMC reminder cron.
 *
 * Story 22.14 intentionally does not invoke an authorized cron over shared
 * employee data. The full orchestration contract is covered hermetically in
 * Vitest; this browser-stack check proves a missing Authorization header is
 * rejected before query, claim, or recipient delivery can begin. Omitting the
 * header also prevents a configured test secret from accidentally authorizing
 * the request.
 */

import { expect, test } from '@playwright/test';

test.describe('ÖMC reminder cron authorization boundary', () => {
  test('rejects a missing authorization header without executing the reminder job', async ({ request }) => {
    const response = await request.get('/api/cron/omc-masterdata-reminder');

    expect(response.status()).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
  });
});
