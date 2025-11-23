/**
 * Unit Tests: PE3 Deadline Email Template Generation
 * Story: 14.2 - PE3 Deadline Notifications (Submit / Cancel)
 */

import { describe, it, expect } from 'vitest';
import {
  generatePe3SubmitDeadlineEmailSubject,
  generatePe3SubmitDeadlineEmailBody,
  generatePe3SubmitDeadlineEmailHtml,
  generatePe3CancelDeadlineEmailSubject,
  generatePe3CancelDeadlineEmailBody,
  generatePe3CancelDeadlineEmailHtml,
  formatPe3DateIdentifier,
  getEmployeeNameForPe3Entry,
} from '@/lib/services/pe3-deadline-notifications';
import { Pe3EntryWithEmployee } from '@/lib/services/pe3-deadline-notifications';

function createMockPe3Entry(overrides: Partial<Pe3EntryWithEmployee> = {}): Pe3EntryWithEmployee {
  return {
    id: 'pe3-123',
    date_description: 'Fredag 14/2',
    date_value: '2025-02-14',
    time_value: '14:30',
    deadline_submit: '2025-02-10',
    deadline_cancel: '2025-02-12',
    assigned_employees: [
      { id: 'emp-1', name: 'John Doe' },
    ],
    ...overrides,
  };
}

describe('generatePe3SubmitDeadlineEmailSubject', () => {
  it('should generate correct subject for submit deadline', () => {
    const subject = generatePe3SubmitDeadlineEmailSubject();
    expect(subject).toBe('PE3 deadline today – last date to submit spots');
  });
});

describe('generatePe3SubmitDeadlineEmailBody', () => {
  it('should include all PE3 entries in email body', () => {
    const entries = [
      createMockPe3Entry({ id: 'pe3-1' }),
      createMockPe3Entry({ id: 'pe3-2', date_description: 'Lördag 15/2' }),
    ];
    const today = '2025-02-10';

    const body = generatePe3SubmitDeadlineEmailBody(entries, today);

    expect(body).toContain('2025-02-10');
    expect(body).toContain('Fredag 14/2');
    expect(body).toContain('Lördag 15/2');
  });

  it('should clearly label as submit deadline', () => {
    const entries = [createMockPe3Entry()];
    const today = '2025-02-10';

    const body = generatePe3SubmitDeadlineEmailBody(entries, today);

    expect(body).toContain('submit');
    expect(body).toContain('last date to submit PE3 spots');
  });

  it('should include employee names when assigned', () => {
    const entries = [
      createMockPe3Entry({
        assigned_employees: [{ id: 'emp-1', name: 'John Doe' }],
      }),
    ];
    const today = '2025-02-10';

    const body = generatePe3SubmitDeadlineEmailBody(entries, today);

    expect(body).toContain('John Doe');
    expect(body).toContain('Assigned:');
  });

  it('should include "Unassigned" when no employee assigned', () => {
    const entries = [
      createMockPe3Entry({
        assigned_employees: [],
      }),
    ];
    const today = '2025-02-10';

    const body = generatePe3SubmitDeadlineEmailBody(entries, today);

    expect(body).toContain('Unassigned');
  });
});

describe('generatePe3SubmitDeadlineEmailHtml', () => {
  it('should include all PE3 entries in HTML email', () => {
    const entries = [
      createMockPe3Entry({ id: 'pe3-1' }),
      createMockPe3Entry({ id: 'pe3-2' }),
    ];
    const today = '2025-02-10';

    const html = generatePe3SubmitDeadlineEmailHtml(entries, today);

    expect(html).toContain('2025-02-10');
    expect(html).toContain('Fredag 14/2');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>');
  });

  it('should clearly label as submit deadline in HTML', () => {
    const entries = [createMockPe3Entry()];
    const today = '2025-02-10';

    const html = generatePe3SubmitDeadlineEmailHtml(entries, today);

    expect(html).toContain('submit');
    expect(html).toContain('last date to submit PE3 spots');
  });

  it('should include employee names in HTML', () => {
    const entries = [
      createMockPe3Entry({
        assigned_employees: [{ id: 'emp-1', name: 'John Doe' }],
      }),
    ];
    const today = '2025-02-10';

    const html = generatePe3SubmitDeadlineEmailHtml(entries, today);

    expect(html).toContain('John Doe');
  });
});

describe('generatePe3CancelDeadlineEmailSubject', () => {
  it('should generate correct subject for cancel deadline', () => {
    const subject = generatePe3CancelDeadlineEmailSubject();
    expect(subject).toBe('PE3 deadline today – last date to cancel spots');
  });
});

describe('generatePe3CancelDeadlineEmailBody', () => {
  it('should include all PE3 entries in email body', () => {
    const entries = [
      createMockPe3Entry({ id: 'pe3-1' }),
      createMockPe3Entry({ id: 'pe3-2' }),
    ];
    const today = '2025-02-12';

    const body = generatePe3CancelDeadlineEmailBody(entries, today);

    expect(body).toContain('2025-02-12');
    expect(body).toContain('Fredag 14/2');
  });

  it('should clearly label as cancel deadline', () => {
    const entries = [createMockPe3Entry()];
    const today = '2025-02-12';

    const body = generatePe3CancelDeadlineEmailBody(entries, today);

    expect(body).toContain('cancel');
    expect(body).toContain('last date to cancel PE3 spots');
  });

  it('should include employee names when assigned', () => {
    const entries = [
      createMockPe3Entry({
        assigned_employees: [{ id: 'emp-1', name: 'Jane Smith' }],
      }),
    ];
    const today = '2025-02-12';

    const body = generatePe3CancelDeadlineEmailBody(entries, today);

    expect(body).toContain('Jane Smith');
  });

  it('should include "Unassigned" when no employee assigned', () => {
    const entries = [
      createMockPe3Entry({
        assigned_employees: [],
      }),
    ];
    const today = '2025-02-12';

    const body = generatePe3CancelDeadlineEmailBody(entries, today);

    expect(body).toContain('Unassigned');
  });
});

describe('generatePe3CancelDeadlineEmailHtml', () => {
  it('should include all PE3 entries in HTML email', () => {
    const entries = [
      createMockPe3Entry({ id: 'pe3-1' }),
      createMockPe3Entry({ id: 'pe3-2' }),
    ];
    const today = '2025-02-12';

    const html = generatePe3CancelDeadlineEmailHtml(entries, today);

    expect(html).toContain('2025-02-12');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>');
  });

  it('should clearly label as cancel deadline in HTML', () => {
    const entries = [createMockPe3Entry()];
    const today = '2025-02-12';

    const html = generatePe3CancelDeadlineEmailHtml(entries, today);

    expect(html).toContain('cancel');
    expect(html).toContain('last date to cancel PE3 spots');
  });
});

describe('formatPe3DateIdentifier', () => {
  it('should format PE3 date with description, date value, and time', () => {
    const entry = createMockPe3Entry({
      date_description: 'Fredag 14/2',
      date_value: '2025-02-14',
      time_value: '14:30',
    });

    const formatted = formatPe3DateIdentifier(entry);

    expect(formatted).toContain('Fredag 14/2');
    expect(formatted).toContain('2025-02-14');
    expect(formatted).toContain('14:30');
  });

  it('should format PE3 date without time if time_value is null', () => {
    const entry = createMockPe3Entry({
      date_description: 'Fredag 14/2',
      date_value: '2025-02-14',
      time_value: null,
    });

    const formatted = formatPe3DateIdentifier(entry);

    expect(formatted).toContain('Fredag 14/2');
    expect(formatted).toContain('2025-02-14');
    expect(formatted).not.toContain('14:30');
  });

  it('should use entry id as fallback if no date info', () => {
    const entry = createMockPe3Entry({
      date_description: null,
      date_value: null,
      time_value: null,
    });

    const formatted = formatPe3DateIdentifier(entry);

    expect(formatted).toBe('pe3-123');
  });
});

describe('getEmployeeNameForPe3Entry', () => {
  it('should return employee name when assigned', () => {
    const entry = createMockPe3Entry({
      assigned_employees: [{ id: 'emp-1', name: 'John Doe' }],
    });

    const name = getEmployeeNameForPe3Entry(entry);

    expect(name).toBe('John Doe');
  });

  it('should return multiple employee names when multiple assigned', () => {
    const entry = createMockPe3Entry({
      assigned_employees: [
        { id: 'emp-1', name: 'John Doe' },
        { id: 'emp-2', name: 'Jane Smith' },
      ],
    });

    const name = getEmployeeNameForPe3Entry(entry);

    expect(name).toBe('John Doe, Jane Smith');
  });

  it('should return "Unassigned" when no employee assigned', () => {
    const entry = createMockPe3Entry({
      assigned_employees: [],
    });

    const name = getEmployeeNameForPe3Entry(entry);

    expect(name).toBe('Unassigned');
  });

  it('should return "Unassigned" when assigned_employees is null', () => {
    const entry = createMockPe3Entry({
      assigned_employees: null as any,
    });

    const name = getEmployeeNameForPe3Entry(entry);

    expect(name).toBe('Unassigned');
  });

  it('should handle employees with missing names', () => {
    const entry = createMockPe3Entry({
      assigned_employees: [
        { id: 'emp-1', name: 'John Doe' },
        { id: 'emp-2', name: null as any },
      ],
    });

    const name = getEmployeeNameForPe3Entry(entry);

    // Function returns "Unknown" for employees with missing names
    expect(name).toBe('John Doe, Unknown');
  });
});

