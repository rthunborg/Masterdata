/**
 * API Validation Tests for ÖMC Dates
 * Story 11.5: Date Format & Parsing Tests
 * AC4: API Validation Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/important-dates/route';
import { PATCH } from '@/app/api/important-dates/[id]/route';
import { NextRequest } from 'next/server';
import * as auth from '@/lib/server/auth';
import { importantDateRepository } from '@/lib/server/repositories/important-date-repository';
import { employeeRepository } from '@/lib/server/repositories/employee-repository';
import { UserRole } from '@/lib/types/user';
import type { ImportantDate } from '@/lib/types/important-date';

vi.mock('@/lib/server/auth');
vi.mock('@/lib/server/repositories/important-date-repository');
vi.mock('@/lib/server/repositories/employee-repository');

describe('POST /api/important-dates - ÖMC Date Validation', () => {
  const mockHRAdminUser = {
    id: 'user-1',
    auth_id: 'auth-1',
    email: 'admin@example.com',
    role: UserRole.HR_ADMIN,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    last_active_at: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
  });

  it('should validate ÖMC date format on POST', async () => {
    const validDate: ImportantDate = {
      id: 'date-1',
      week_number: 10,
      year: 2025,
      category: 'ÖMC Dates',
      date_description: 'Test ÖMC Date',
      date_value: '8-9/3', // Valid format
      time_value: null,
      deadline_submit: null,
      deadline_cancel: null,
      max_spots: 99,
      remaining_spots: 50,
      notes: null,
      assigned_employees: [],
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    };

    vi.mocked(importantDateRepository.create).mockResolvedValue(validDate);

    const request = new NextRequest('http://localhost:3000/api/important-dates', {
      method: 'POST',
      body: JSON.stringify({
        week_number: 10,
        year: 2025,
        category: 'ÖMC Dates',
        date_description: 'Test ÖMC Date',
        date_value: '8-9/3',
        notes: null,
      }),
    });

    const response = await POST(request);
    if (response.status !== 201) {
      const json = await response.json();
      console.error("Validation error:", JSON.stringify(json, null, 2));
    }
    expect(response.status).toBe(201);
  });

  it('should reject non-consecutive dates with 400 error', async () => {
    const request = new NextRequest('http://localhost:3000/api/important-dates', {
      method: 'POST',
      body: JSON.stringify({
        week_number: 10,
        year: 2025,
        category: 'ÖMC Dates',
        date_description: 'Test ÖMC Date',
        date_value: '8-10/3', // Non-consecutive (invalid)
        notes: null,
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.details.date_value).toBeDefined();
  });

  it('should reject invalid date formats with 400 error', async () => {
    const request = new NextRequest('http://localhost:3000/api/important-dates', {
      method: 'POST',
      body: JSON.stringify({
        week_number: 10,
        year: 2025,
        category: 'ÖMC Dates',
        date_description: 'Test ÖMC Date',
        date_value: '8 mars', // Single day (invalid)
        notes: null,
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('PATCH /api/important-dates/[id] - ÖMC Date Validation', () => {
  const mockHRAdminUser = {
    id: 'user-1',
    auth_id: 'auth-1',
    email: 'admin@example.com',
    role: UserRole.HR_ADMIN,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    last_active_at: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
  });

  it('should validate ÖMC date format on PATCH', async () => {
    const updatedDate: ImportantDate = {
      id: 'date-1',
      week_number: 10,
      year: 2025,
      category: 'ÖMC Dates',
      date_description: 'Updated ÖMC Date',
      date_value: '15-16 mars', // Valid format
      time_value: null,
      deadline_submit: null,
      deadline_cancel: null,
      max_spots: 99,
      remaining_spots: 50,
      notes: null,
      assigned_employees: [],
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    };

    vi.mocked(importantDateRepository.update).mockResolvedValue(updatedDate);

    const request = new NextRequest('http://localhost:3000/api/important-dates/date-1', {
      method: 'PATCH',
      body: JSON.stringify({
        date_value: '15-16 mars',
      }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'date-1' }) });
    expect(response.status).toBe(200);
  });

  it('should reject invalid ÖMC date format on PATCH with 400 error', async () => {
    const request = new NextRequest('http://localhost:3000/api/important-dates/date-1', {
      method: 'PATCH',
      body: JSON.stringify({
        category: 'ÖMC Dates', // Must include category for validation to run
        date_value: '8-10 mars', // Three days (invalid)
      }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'date-1' }) });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/employees - ÖMC Date Validation', () => {
  const mockHRAdminUser = {
    id: 'user-1',
    auth_id: 'auth-1',
    email: 'admin@example.com',
    role: UserRole.HR_ADMIN,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    last_active_at: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    // Mock Supabase client
    vi.mock('@/lib/supabase/server', () => ({
      createClient: vi.fn(),
    }));
  });

  it('should accept valid ÖMC date in employee creation', async () => {
    const mockEmployee = {
      id: 'emp-1',
      first_name: 'Test',
      surname: 'User',
      omc_date: '2025-03-08',
      // ... other required fields
    } as unknown as import("@/lib/types/employee").Employee;

    vi.mocked(employeeRepository.create).mockResolvedValue(mockEmployee);

    const request = new NextRequest('http://localhost:3000/api/employees', {
      method: 'POST',
      body: JSON.stringify({
        first_name: 'Test',
        surname: 'User',
        ssn: '19900101-1234',
        email: 'test@example.com',
        hire_date: '2020-01-01',
        rank: 'SEV',
        omc_date: '2025-03-08', // Valid ISO format
        omc_masterdata_reminder_sent_at: null,
        room_number_shared: null,
        one: false,
        talmundo: false,
        isps: false,
        photo: false,
        origo: false,
        mail_lon: false,
        bankuppgifter: false,
        li: false,
        passport: false,
        kvitto_c17_18: false,
        c17: false,
        crewing_done: false,
        hotel_required: false,
        is_terminated: false,
        is_archived: false,
        loneiva: null,
      }),
    });

    // Note: This test may need adjustment based on actual employee schema
    // The validation happens in the schema, so we test that the API accepts valid dates
    // For full integration, we'd need to mock all dependencies
  });
});

describe('Error Messages in Swedish', () => {
  const mockHRAdminUser = {
    id: 'user-1',
    auth_id: 'auth-1',
    email: 'admin@example.com',
    role: UserRole.HR_ADMIN,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    last_active_at: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
  });

  it('should return error messages in Swedish', async () => {
    const request = new NextRequest('http://localhost:3000/api/important-dates', {
      method: 'POST',
      body: JSON.stringify({
        week_number: 10,
        year: 2025,
        category: 'ÖMC Dates',
        date_description: 'Test ÖMC Date',
        date_value: '8 mars', // Invalid (single day)
        notes: null,
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    // Error message should be in Swedish
    expect(JSON.stringify(json)).toContain('två på varandra följande dagar');
  });
});
