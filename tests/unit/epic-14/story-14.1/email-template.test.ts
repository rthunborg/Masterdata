/** Story 14.1 template tests superseded by Story 22.14's digest. */

import { describe, expect, it } from 'vitest';
import {
  calculateOmcReminderTiming,
  generateOmcReminderDigest,
  generateOmcReminderEmailBody,
  generateOmcReminderEmailHtml,
  generateOmcReminderEmailSubject,
  type OmcReminderCandidate,
  type OmcReminderEmployee,
} from '@/lib/services/omc-masterdata-reminder';

function employee(
  id: string,
  firstName: string,
  surname: string
): OmcReminderEmployee {
  return {
    id,
    first_name: firstName,
    surname,
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

function candidate(
  id: string,
  firstName: string,
  surname: string,
  omcDateValue: string,
  elapsedDays: number,
  missingFields: string[]
): OmcReminderCandidate {
  return {
    employee: employee(id, firstName, surname),
    omcDateValue,
    elapsedDays,
    missingFields,
  };
}

describe('Story 22.14 ÖMC reminder digest', () => {
  const candidates = [
    candidate('1', 'Anna', 'Andersson', '2026-08-20', 7, ['one', 'loneiva']),
    candidate('2', 'Bo', 'Berg', '2026-08-06', 21, ['isps']),
  ];

  it('uses durable candidate-count wording in the subject', () => {
    expect(generateOmcReminderEmailSubject(7)).toBe(
      'Stena Season: ÖMC genomförd – ofullständig masterdata för 7 medarbetare'
    );
    expect(generateOmcReminderEmailSubject(7)).not.toContain('för 3 dagar sedan');
  });

  it('includes each candidate exactly once with D, missing fields, and independent elapsed days', () => {
    const digest = generateOmcReminderDigest(candidates);

    for (const content of [digest.text, digest.html]) {
      expect(content.match(/Anna Andersson/g)).toHaveLength(1);
      expect(content.match(/Bo Berg/g)).toHaveLength(1);
      expect(content).toContain('ÖMC 2026-08-20, 7 dagar sedan');
      expect(content).toContain('ÖMC 2026-08-06, 21 dagar sedan');
      expect(content).toContain('One (saknas)');
      expect(content).toContain('Lönenivå (tom)');
      expect(content).toContain('ISPS (saknas)');
      expect(content).not.toContain('Det har gått 3 dagar');
    }
  });

  it('uses correct Swedish singular and plural day wording', () => {
    const singular = candidate('1', 'Anna', 'Andersson', '2026-08-20', 1, ['one']);
    const plural = candidate('2', 'Bo', 'Berg', '2026-08-19', 2, ['isps']);

    expect(generateOmcReminderEmailBody([singular, plural])).toContain('1 dag sedan');
    expect(generateOmcReminderEmailBody([singular, plural])).toContain('2 dagar sedan');
  });

  it('carries truthful weekend and retry elapsed days into both digest formats', () => {
    const scenarios = [
      {
        id: 'sunday-roll',
        firstName: 'Siv',
        surname: 'Sondag',
        omcDateValue: '2026-08-20',
        todayStockholm: '2026-08-24',
        expectedElapsedDays: 4,
      },
      {
        id: 'saturday-roll',
        firstName: 'Lars',
        surname: 'Lordag',
        omcDateValue: '2026-08-19',
        todayStockholm: '2026-08-24',
        expectedElapsedDays: 5,
      },
      {
        id: 'retry',
        firstName: 'Rita',
        surname: 'Retry',
        omcDateValue: '2026-08-17',
        todayStockholm: '2026-08-27',
        expectedElapsedDays: 10,
      },
    ];

    const truthfulCandidates = scenarios.map((scenario) => {
      const timing = calculateOmcReminderTiming(
        scenario.omcDateValue,
        scenario.todayStockholm
      );
      expect(timing).toMatchObject({
        eligible: true,
        elapsedDays: scenario.expectedElapsedDays,
      });

      return candidate(
        scenario.id,
        scenario.firstName,
        scenario.surname,
        scenario.omcDateValue,
        timing.elapsedDays,
        ['one']
      );
    });
    const digest = generateOmcReminderDigest(truthfulCandidates);

    for (const content of [digest.text, digest.html]) {
      expect(content).toContain('ÖMC 2026-08-20, 4 dagar sedan');
      expect(content).toContain('ÖMC 2026-08-19, 5 dagar sedan');
      expect(content).toContain('ÖMC 2026-08-17, 10 dagar sedan');
    }
    for (const content of [digest.subject, digest.text, digest.html]) {
      expect(content).not.toMatch(/(?:3|tre)\s+dagar\s+sedan/i);
    }
  });

  it('escapes candidate-controlled values in HTML while keeping text readable', () => {
    const unsafe = candidate('1', '<Anna>', 'A&B', '2026-08-20', 7, ['one']);

    expect(generateOmcReminderEmailHtml([unsafe])).toContain('&lt;Anna&gt; A&amp;B');
    expect(generateOmcReminderEmailHtml([unsafe])).not.toContain('<Anna>');
    expect(generateOmcReminderEmailBody([unsafe])).toContain('<Anna> A&B');
  });

  it('normalizes database-sourced control characters so names cannot inject text rows', () => {
    const unsafe = candidate(
      '1',
      'Anna\r\nBCC:intruder@example.test',
      'A\u0000ndersson',
      '2026-08-20',
      7,
      ['one']
    );
    const digest = generateOmcReminderDigest([unsafe]);

    expect(digest.text).toContain('Anna BCC:intruder@example.test A ndersson');
    expect(digest.text).not.toContain('Anna\r\n');
    expect(digest.text).not.toContain('\u0000');
    expect(digest.html).toContain('Anna BCC:intruder@example.test A ndersson');
  });

  it('rejects an empty digest so clean runs cannot send mail', () => {
    expect(() => generateOmcReminderDigest([])).toThrow('empty ÖMC reminder digest');
  });
});
