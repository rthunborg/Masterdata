import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/services/notification-helpers', () => ({
  getHrAdminEmails: vi.fn(),
}));

vi.mock('@/lib/services/email-service', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('date-fns-tz', () => ({
  toZonedTime: vi.fn().mockReturnValue(new Date('2026-03-13T10:30:00')),
  format: vi.fn().mockReturnValue('2026-03-13 10:30'),
}));

import { sendStaffingNeedsUpdateEmail } from '@/lib/services/staffing-needs-notification';
import { getHrAdminEmails } from '@/lib/services/notification-helpers';
import { sendEmail } from '@/lib/services/email-service';

const mockGetHrAdminEmails = vi.mocked(getHrAdminEmails);
const mockSendEmail = vi.mocked(sendEmail);

describe('sendStaffingNeedsUpdateEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetHrAdminEmails.mockResolvedValue([
      'hr1@example.com',
      'hr2@example.com',
      'editor@example.com',
    ]);
  });

  it('sends email with correct subject and body to HR users excluding editor', async () => {
    await sendStaffingNeedsUpdateEmail('Trelleborg', 10, 15, 'editor@example.com');

    expect(mockSendEmail).toHaveBeenCalledOnce();
    const call = mockSendEmail.mock.calls[0][0];

    // Correct recipients (editor excluded)
    expect(call.to).toEqual(['hr1@example.com', 'hr2@example.com']);

    // Correct subject
    expect(call.subject).toBe('Bemanningsbehov uppdaterat — Trelleborg');

    // Body contains required info
    expect(call.text).toContain('Trelleborg');
    expect(call.text).toContain('10');
    expect(call.text).toContain('15');
    expect(call.text).toContain('editor@example.com');
    expect(call.text).toContain('2026-03-13 10:30');

    // HTML body exists
    expect(call.html).toContain('Trelleborg');
    expect(call.html).toContain('Tidigare värde:');
  });

  it('excludes editor case-insensitively', async () => {
    await sendStaffingNeedsUpdateEmail('Göteborg', 5, 8, 'EDITOR@example.com');

    const call = mockSendEmail.mock.calls[0][0];
    expect(call.to).toEqual(['hr1@example.com', 'hr2@example.com']);
  });

  it('does not send email when oldValue === newValue', async () => {
    await sendStaffingNeedsUpdateEmail('Trelleborg', 10, 10, 'editor@example.com');

    expect(mockGetHrAdminEmails).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('does not send email when no recipients remain after filtering', async () => {
    mockGetHrAdminEmails.mockResolvedValue(['editor@example.com']);

    await sendStaffingNeedsUpdateEmail('Trelleborg', 10, 15, 'editor@example.com');

    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('catches and logs errors without throwing', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGetHrAdminEmails.mockRejectedValue(new Error('DB connection failed'));

    // Should not throw
    await expect(
      sendStaffingNeedsUpdateEmail('Trelleborg', 10, 15, 'editor@example.com')
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Staffing Notification]'),
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  it('catches sendEmail errors without throwing', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSendEmail.mockRejectedValue(new Error('SMTP down'));

    await expect(
      sendStaffingNeedsUpdateEmail('Trelleborg', 10, 15, 'editor@example.com')
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
