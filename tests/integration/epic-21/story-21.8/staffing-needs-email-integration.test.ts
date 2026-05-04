import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock auth
vi.mock('@/lib/server/auth', () => ({
  requireAuthAPI: vi.fn(),
  requireRoleAPI: vi.fn().mockResolvedValue({
    id: 'user-1',
    email: 'crewing@example.com',
    role: 'crewing',
  }),
  createErrorResponse: vi.fn().mockImplementation((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }),
}));

// Mock repository
vi.mock('@/lib/server/repositories/staffing-needs-repository', () => ({
  staffingNeedsRepository: {
    updateNeed: vi.fn(),
  },
}));

// Mock notification service
vi.mock('@/lib/services/staffing-needs-notification', () => ({
  sendStaffingNeedsUpdateEmail: vi.fn().mockResolvedValue(undefined),
}));

// Mock validation
vi.mock('@/lib/validation/staffing-needs', () => ({
  updateStaffingNeedSchema: {
    parse: vi.fn().mockImplementation((data: unknown) => data),
    safeParse: vi.fn().mockImplementation((data: unknown) => ({ success: true, data })),
  },
}));

vi.mock('@/lib/server/api-helpers', () => ({
  parseOrError: vi.fn().mockImplementation((_schema: unknown, body: unknown) => body),
}));

import { PUT } from '@/app/api/staffing-needs/route';
import { staffingNeedsRepository } from '@/lib/server/repositories/staffing-needs-repository';
import { sendStaffingNeedsUpdateEmail } from '@/lib/services/staffing-needs-notification';

const mockUpdateNeed = vi.mocked(staffingNeedsRepository.updateNeed);
const mockSendEmail = vi.mocked(sendStaffingNeedsUpdateEmail);

function createPutRequest(body: object) {
  return new NextRequest('http://localhost/api/staffing-needs', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

describe('PUT /api/staffing-needs — email integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateNeed.mockResolvedValue({ oldValue: 10, newValue: 15 });
  });

  it('fires notification when value changes', async () => {
    const request = createPutRequest({ location: 'Trelleborg', headcount_need: 15 });
    const response = await PUT(request);

    expect(response.status).toBe(200);
    expect(mockSendEmail).toHaveBeenCalledWith(
      'Trelleborg',
      10,
      15,
      'crewing@example.com'
    );
  });

  it('does not fire notification when value is unchanged', async () => {
    mockUpdateNeed.mockResolvedValue({ oldValue: 10, newValue: 10 });

    const request = createPutRequest({ location: 'Trelleborg', headcount_need: 10 });
    const response = await PUT(request);

    expect(response.status).toBe(200);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('returns 200 even when notification throws', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSendEmail.mockRejectedValue(new Error('SMTP failure'));

    const request = createPutRequest({ location: 'Göteborg', headcount_need: 20 });
    const response = await PUT(request);

    // API still succeeds
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data.old_value).toBe(10);
    expect(json.data.new_value).toBe(15);

    consoleSpy.mockRestore();
  });
});
