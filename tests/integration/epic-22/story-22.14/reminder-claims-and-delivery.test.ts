/* eslint-disable @typescript-eslint/no-explicit-any */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  claimOmcMasterdataReminder,
  releaseOmcMasterdataReminderClaims,
  sendOmcMasterdataReminderDigest,
  type ClaimedOmcReminderCandidate,
  type OmcReminderCandidate,
  type OmcReminderEmployee,
} from '@/lib/services/omc-masterdata-reminder';
import * as supabaseServer from '@/lib/supabase/server';
import * as notificationHelpers from '@/lib/services/notification-helpers';
import * as emailService from '@/lib/services/email-service';

vi.mock('@/lib/supabase/server');
vi.mock('@/lib/services/notification-helpers');
vi.mock('@/lib/services/email-service');

function employee(id = 'employee-1'): OmcReminderEmployee {
  return {
    id,
    first_name: `Anna-${id}`,
    surname: 'Andersson',
    omc_date: `omc-${id}`,
    is_terminated: false,
    is_archived: false,
    omc_masterdata_reminder_sent_at: null,
    one: false,
    talmundo: true,
    isps: true,
    photo: true,
    origo: true,
    mail_lon: true,
    bankuppgifter: true,
    li: true,
    passport: true,
    kvitto_c17_18: null,
    c17: true,
    loneiva: 2,
  };
}

function candidate(id = 'employee-1'): OmcReminderCandidate {
  return {
    employee: employee(id),
    omcDateValue: '2026-08-20',
    elapsedDays: 7,
    missingFields: ['one'],
  };
}

function patchBuilder(result: { data: unknown; error: unknown }) {
  const chain: Record<string, any> = {};
  chain.update = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.is = vi.fn(() => chain);
  chain.lt = vi.fn(() => chain);
  chain.or = vi.fn(() => chain);
  chain.select = vi.fn().mockResolvedValue(result);
  return chain;
}

function mockPatchSequence(...builders: ReturnType<typeof patchBuilder>[]) {
  const from = vi.fn();
  for (const builder of builders) from.mockReturnValueOnce(builder);
  vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue({ from } as any);
  return from;
}

describe('Story 22.14 PostgREST-compatible reminder claims', () => {
  const claimTimestamp = '2026-08-27T07:00:00.000Z';

  beforeEach(() => vi.clearAllMocks());

  it('claims through the marker-IS-NULL PATCH and never builds a mutation .or()', async () => {
    const first = patchBuilder({
      data: [{
        id: 'employee-1',
        omc_date: 'omc-employee-1',
        omc_masterdata_reminder_sent_at: claimTimestamp,
      }],
      error: null,
    });
    const from = mockPatchSequence(first);

    await expect(claimOmcMasterdataReminder(candidate(), claimTimestamp)).resolves.toEqual({
      status: 'claimed',
      claimTimestamp,
    });

    expect(from).toHaveBeenCalledTimes(1);
    expect(first.update).toHaveBeenCalledWith({
      omc_masterdata_reminder_sent_at: claimTimestamp,
    });
    expect(first.eq).toHaveBeenCalledWith('id', 'employee-1');
    expect(first.eq).toHaveBeenCalledWith('omc_date', 'omc-employee-1');
    expect(first.eq).toHaveBeenCalledWith('is_terminated', false);
    expect(first.eq).toHaveBeenCalledWith('is_archived', false);
    expect(first.eq).toHaveBeenCalledWith('one', false);
    for (const field of [
      'talmundo',
      'isps',
      'photo',
      'origo',
      'mail_lon',
      'bankuppgifter',
      'li',
      'passport',
      'c17',
    ]) {
      expect(first.eq).toHaveBeenCalledWith(field, true);
    }
    expect(first.eq).toHaveBeenCalledWith('loneiva', 2);
    expect(first.eq).not.toHaveBeenCalledWith('kvitto_c17_18', expect.anything());
    expect(first.is).not.toHaveBeenCalledWith('kvitto_c17_18', null);
    expect(first.is).toHaveBeenCalledWith('omc_masterdata_reminder_sent_at', null);
    expect(first.select).toHaveBeenCalledWith(
      'id,omc_date,omc_masterdata_reminder_sent_at'
    );
    expect(first.or).not.toHaveBeenCalled();
  });

  it('stops after a first-PATCH error', async () => {
    const first = patchBuilder({ data: null, error: { message: 'failed' } });
    const second = patchBuilder({ data: [{ id: 'unexpected' }], error: null });
    const from = mockPatchSequence(first, second);

    await expect(claimOmcMasterdataReminder(candidate(), claimTimestamp)).resolves.toEqual({
      status: 'error',
      claimTimestamp: null,
    });
    expect(from).toHaveBeenCalledTimes(1);
    expect(second.update).not.toHaveBeenCalled();
  });

  it('uses the stale-marker PATCH only after an error-free zero-row result', async () => {
    const first = patchBuilder({ data: [], error: null });
    const second = patchBuilder({
      data: [{
        id: 'employee-1',
        omc_date: 'omc-employee-1',
        omc_masterdata_reminder_sent_at: claimTimestamp,
      }],
      error: null,
    });
    const from = mockPatchSequence(first, second);

    await expect(claimOmcMasterdataReminder(candidate(), claimTimestamp)).resolves.toEqual({
      status: 'claimed',
      claimTimestamp,
    });

    expect(from).toHaveBeenCalledTimes(2);
    expect(second.eq).toHaveBeenCalledWith('id', 'employee-1');
    expect(second.eq).toHaveBeenCalledWith('omc_date', 'omc-employee-1');
    expect(second.eq).toHaveBeenCalledWith('is_terminated', false);
    expect(second.eq).toHaveBeenCalledWith('is_archived', false);
    expect(second.eq).toHaveBeenCalledWith('one', false);
    for (const field of [
      'talmundo',
      'isps',
      'photo',
      'origo',
      'mail_lon',
      'bankuppgifter',
      'li',
      'passport',
      'c17',
    ]) {
      expect(second.eq).toHaveBeenCalledWith(field, true);
    }
    expect(second.eq).toHaveBeenCalledWith('loneiva', 2);
    expect(second.lt).toHaveBeenCalledWith(
      'omc_masterdata_reminder_sent_at',
      '2026-08-19T22:00:00.000Z'
    );
    expect(second.or).not.toHaveBeenCalled();
  });

  it('uses IS NULL snapshot guards and suppresses a claim after mid-flight masterdata changes', async () => {
    const guardedCandidate = candidate();
    guardedCandidate.employee.one = null;
    guardedCandidate.employee.loneiva = null;
    guardedCandidate.missingFields = ['one', 'loneiva'];
    const first = patchBuilder({ data: [], error: null });
    const second = patchBuilder({ data: [], error: null });
    mockPatchSequence(first, second);

    await expect(
      claimOmcMasterdataReminder(guardedCandidate, claimTimestamp)
    ).resolves.toEqual({
      status: 'suppressed',
      claimTimestamp: null,
    });

    for (const patch of [first, second]) {
      expect(patch.is).toHaveBeenCalledWith('one', null);
      expect(patch.is).toHaveBeenCalledWith('loneiva', null);
      expect(patch.is).not.toHaveBeenCalledWith('kvitto_c17_18', null);
    }
  });

  it('distinguishes zero-row contention from an operational error', async () => {
    const first = patchBuilder({ data: [], error: null });
    const second = patchBuilder({ data: [], error: null });
    mockPatchSequence(first, second);

    await expect(claimOmcMasterdataReminder(candidate(), claimTimestamp)).resolves.toEqual({
      status: 'suppressed',
      claimTimestamp: null,
    });
  });

  it('reports an error from the stale-marker PATCH', async () => {
    const first = patchBuilder({ data: [], error: null });
    const second = patchBuilder({ data: null, error: { message: 'failed' } });
    mockPatchSequence(first, second);

    await expect(claimOmcMasterdataReminder(candidate(), claimTimestamp)).resolves.toEqual({
      status: 'error',
      claimTimestamp: null,
    });
  });

  it('rejects a mismatched row returned by the stale-marker PATCH', async () => {
    const first = patchBuilder({ data: [], error: null });
    const second = patchBuilder({
      data: [{
        id: 'employee-1',
        omc_date: 'another-omc-assignment',
        omc_masterdata_reminder_sent_at: claimTimestamp,
      }],
      error: null,
    });
    mockPatchSequence(first, second);

    await expect(claimOmcMasterdataReminder(candidate(), claimTimestamp)).resolves.toEqual({
      status: 'error',
      claimTimestamp: null,
    });
  });

  it.each([
    ['an object payload', {}],
    ['a mismatched row', [{
      id: 'another-employee',
      omc_date: 'omc-employee-1',
      omc_masterdata_reminder_sent_at: claimTimestamp,
    }]],
    ['multiple rows', [
      {
        id: 'employee-1',
        omc_date: 'omc-employee-1',
        omc_masterdata_reminder_sent_at: claimTimestamp,
      },
      {
        id: 'employee-1',
        omc_date: 'omc-employee-1',
        omc_masterdata_reminder_sent_at: claimTimestamp,
      },
    ]],
    ['a mismatched marker', [{
      id: 'employee-1',
      omc_date: 'omc-employee-1',
      omc_masterdata_reminder_sent_at: '2026-08-27T07:00:01.000Z',
    }]],
  ])('rejects %s returned by a claim PATCH', async (_label, data) => {
    const first = patchBuilder({ data, error: null });
    const second = patchBuilder({ data: [], error: null });
    const from = mockPatchSequence(first, second);

    await expect(claimOmcMasterdataReminder(candidate(), claimTimestamp)).resolves.toEqual({
      status: 'error',
      claimTimestamp: null,
    });
    expect(from).toHaveBeenCalledTimes(1);
  });

  it('accepts an equivalent Postgres timestamp representation for the exact claim instant', async () => {
    const first = patchBuilder({
      data: [{
        id: 'employee-1',
        omc_date: 'omc-employee-1',
        omc_masterdata_reminder_sent_at: '2026-08-27T09:00:00+02:00',
      }],
      error: null,
    });
    mockPatchSequence(first);

    await expect(claimOmcMasterdataReminder(candidate(), claimTimestamp)).resolves.toEqual({
      status: 'claimed',
      claimTimestamp,
    });
  });
});

describe('Story 22.14 digest fan-out and exact cleanup', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends one digest batch for N candidates and reports R recipient deliveries', async () => {
    const candidates = [candidate('employee-1'), candidate('employee-2')];
    const configuredRecipients = [
      'one@example.test',
      'two@example.test',
      'three@example.test',
    ];
    vi.mocked(notificationHelpers.getHrAdminEmailLookup).mockResolvedValue({
      status: 'success',
      emails: configuredRecipients,
    });
    vi.mocked(emailService.sendEmailToMultiple).mockResolvedValue([
      { success: true, messageId: '1' },
      { success: true, messageId: '2' },
      { success: true, messageId: '3' },
    ]);

    await expect(sendOmcMasterdataReminderDigest(candidates)).resolves.toEqual({
      recipientCount: 3,
      successfulRecipientDeliveries: 3,
      failedRecipientDeliveries: 0,
      outcome: 'success',
    });

    expect(emailService.sendEmailToMultiple).toHaveBeenCalledTimes(1);
    const [recipients, subject, text, html] = vi.mocked(
      emailService.sendEmailToMultiple
    ).mock.calls[0];
    expect(recipients).toEqual(configuredRecipients);
    expect(subject).toContain('för 2 medarbetare');
    expect(text.match(/Anna-employee-1 Andersson/g)).toHaveLength(1);
    expect(text.match(/Anna-employee-2 Andersson/g)).toHaveLength(1);
    expect(html?.match(/Anna-employee-1 Andersson/g)).toHaveLength(1);
    expect(html?.match(/Anna-employee-2 Andersson/g)).toHaveLength(1);
  });

  it('reports partial delivery without converting it to total failure', async () => {
    vi.mocked(notificationHelpers.getHrAdminEmailLookup).mockResolvedValue({
      status: 'success',
      emails: ['one@example.test', 'two@example.test'],
    });
    vi.mocked(emailService.sendEmailToMultiple).mockResolvedValue([
      { success: true, messageId: '1' },
      { success: false, error: 'failed' },
    ]);

    await expect(sendOmcMasterdataReminderDigest([candidate()])).resolves.toMatchObject({
      successfulRecipientDeliveries: 1,
      failedRecipientDeliveries: 1,
      outcome: 'partial-failure',
    });
  });

  it('reports a thrown mailer failure as total failure for every recipient', async () => {
    vi.mocked(notificationHelpers.getHrAdminEmailLookup).mockResolvedValue({
      status: 'success',
      emails: ['one@example.test', 'two@example.test'],
    });
    vi.mocked(emailService.sendEmailToMultiple).mockRejectedValue(new Error('mailer failed'));

    await expect(sendOmcMasterdataReminderDigest([candidate()])).resolves.toMatchObject({
      successfulRecipientDeliveries: 0,
      failedRecipientDeliveries: 2,
      outcome: 'total-failure',
    });
  });

  it('classifies resolved all-recipient failures as total failure', async () => {
    vi.mocked(notificationHelpers.getHrAdminEmailLookup).mockResolvedValue({
      status: 'success',
      emails: ['one@example.test', 'two@example.test'],
    });
    vi.mocked(emailService.sendEmailToMultiple).mockResolvedValue([
      { success: false, error: 'failed' },
      { success: false, error: 'failed' },
    ]);

    await expect(sendOmcMasterdataReminderDigest([candidate()])).resolves.toEqual({
      recipientCount: 2,
      successfulRecipientDeliveries: 0,
      failedRecipientDeliveries: 2,
      outcome: 'total-failure',
    });
  });

  it('keeps SMTP failure logs aggregate-only when the error contains recipient and candidate PII', async () => {
    const recipientEmail = 'hr.secret@example.test';
    const candidateName = 'Anna-employee-1 Andersson';
    const employeeId = 'employee-1';
    const privateSubject = 'Stena Season: confidential candidate reminder';
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    vi.mocked(notificationHelpers.getHrAdminEmailLookup).mockResolvedValue({
      status: 'success',
      emails: [recipientEmail],
    });
    vi.mocked(emailService.sendEmailToMultiple).mockRejectedValue(
      new Error(
        `SMTP 550 rejected ${recipientEmail} for subject "${privateSubject}" while sending ${candidateName} (${employeeId})`
      )
    );

    const result = await sendOmcMasterdataReminderDigest([candidate()]);
    const serializedLogs = JSON.stringify(errorSpy.mock.calls);

    expect(result).toEqual({
      recipientCount: 1,
      successfulRecipientDeliveries: 0,
      failedRecipientDeliveries: 1,
      outcome: 'total-failure',
    });
    expect(errorSpy).toHaveBeenCalledWith(
      '[ÖMC Reminder] Digest delivery failed',
      { recipientCount: 1 }
    );
    for (const privateValue of [recipientEmail, candidateName, employeeId, privateSubject]) {
      expect(serializedLogs).not.toContain(privateValue);
      expect(JSON.stringify(result)).not.toContain(privateValue);
    }

    errorSpy.mockRestore();
  });

  it('reports missing recipients without attempting a digest send', async () => {
    vi.mocked(notificationHelpers.getHrAdminEmailLookup).mockResolvedValue({
      status: 'success',
      emails: [],
    });

    await expect(sendOmcMasterdataReminderDigest([candidate()])).resolves.toEqual({
      recipientCount: 0,
      successfulRecipientDeliveries: 0,
      failedRecipientDeliveries: 0,
      outcome: 'no-recipients',
    });
    expect(emailService.sendEmailToMultiple).not.toHaveBeenCalled();
  });

  it('distinguishes a recipient query failure from a valid empty configuration', async () => {
    vi.mocked(notificationHelpers.getHrAdminEmailLookup).mockResolvedValue({
      status: 'error',
      emails: [],
    });

    await expect(sendOmcMasterdataReminderDigest([candidate()])).resolves.toEqual({
      recipientCount: 0,
      successfulRecipientDeliveries: 0,
      failedRecipientDeliveries: 0,
      outcome: 'recipient-lookup-failure',
    });
    expect(emailService.sendEmailToMultiple).not.toHaveBeenCalled();
  });

  it('does not look up recipients or send an empty digest', async () => {
    await expect(sendOmcMasterdataReminderDigest([])).resolves.toMatchObject({ outcome: 'success' });
    expect(notificationHelpers.getHrAdminEmailLookup).not.toHaveBeenCalled();
    expect(emailService.sendEmailToMultiple).not.toHaveBeenCalled();
  });

  it('clears only the exact invocation timestamp on the exact assignment', async () => {
    const release = patchBuilder({
      data: [{
        id: 'employee-1',
        omc_date: 'omc-employee-1',
        omc_masterdata_reminder_sent_at: null,
      }],
      error: null,
    });
    mockPatchSequence(release);
    const claimed: ClaimedOmcReminderCandidate = {
      ...candidate(),
      claimTimestamp: '2026-08-27T07:00:00.000Z',
    };

    await expect(releaseOmcMasterdataReminderClaims([claimed])).resolves.toEqual({
      releasedClaims: 1,
      releaseErrors: 0,
    });

    expect(release.update).toHaveBeenCalledWith({ omc_masterdata_reminder_sent_at: null });
    expect(release.eq).toHaveBeenCalledWith('id', 'employee-1');
    expect(release.eq).toHaveBeenCalledWith('omc_date', 'omc-employee-1');
    expect(release.eq).toHaveBeenCalledWith(
      'omc_masterdata_reminder_sent_at',
      '2026-08-27T07:00:00.000Z'
    );
  });

  it('continues exact cleanup and aggregates release failures', async () => {
    const failed = patchBuilder({ data: null, error: { message: 'failed' } });
    const released = patchBuilder({
      data: [{
        id: 'employee-2',
        omc_date: 'omc-employee-2',
        omc_masterdata_reminder_sent_at: null,
      }],
      error: null,
    });
    const firstClient = { from: vi.fn(() => failed) };
    const secondClient = { from: vi.fn(() => released) };
    vi.mocked(supabaseServer.createServiceRoleClient)
      .mockReturnValueOnce(firstClient as any)
      .mockReturnValueOnce(secondClient as any);

    await expect(releaseOmcMasterdataReminderClaims([
      { ...candidate('employee-1'), claimTimestamp: '2026-08-27T07:00:00.000Z' },
      { ...candidate('employee-2'), claimTimestamp: '2026-08-27T07:00:00.000Z' },
    ])).resolves.toEqual({ releasedClaims: 1, releaseErrors: 1 });
  });

  it.each([
    ['an object payload', {}],
    ['a mismatched assignment', [{
      id: 'employee-1',
      omc_date: 'another-omc-assignment',
      omc_masterdata_reminder_sent_at: null,
    }]],
    ['a non-null returned marker', [{
      id: 'employee-1',
      omc_date: 'omc-employee-1',
      omc_masterdata_reminder_sent_at: '2026-08-27T07:00:00.000Z',
    }]],
  ])('counts %s as a release error', async (_label, data) => {
    const release = patchBuilder({ data, error: null });
    mockPatchSequence(release);

    await expect(releaseOmcMasterdataReminderClaims([{
      ...candidate(),
      claimTimestamp: '2026-08-27T07:00:00.000Z',
    }])).resolves.toEqual({ releasedClaims: 0, releaseErrors: 1 });
  });

  it('treats an empty conditional release result as safely not released', async () => {
    const release = patchBuilder({ data: [], error: null });
    mockPatchSequence(release);

    await expect(releaseOmcMasterdataReminderClaims([{
      ...candidate(),
      claimTimestamp: '2026-08-27T07:00:00.000Z',
    }])).resolves.toEqual({ releasedClaims: 0, releaseErrors: 0 });
  });
});
