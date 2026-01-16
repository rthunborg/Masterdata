/**
 * Integration Tests: Termination & Reactivation API Routes
 * Story 11.3: Comprehensive Test Coverage for Termination & Reactivation Workflows
 * 
 * Tests all API scenarios for:
 * - POST /api/employees/[id]/terminate (all scenarios)
 * - POST /api/employees/[id]/reactivate (all scenarios)
 * - Error responses (404, 400)
 * - Response payloads (repayment data, warnings)
 * - Database state validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as TERMINATE } from '@/app/api/employees/[id]/terminate/route';
import { POST as REACTIVATE } from '@/app/api/employees/[id]/reactivate/route';
import * as auth from '@/lib/server/auth';
import { employeeRepository } from '@/lib/server/repositories/employee-repository';
import type { Employee } from '@/lib/types/employee';
import { UserRole } from '@/lib/types/user';

vi.mock('@/lib/server/auth');
vi.mock('@/lib/server/repositories/employee-repository');

describe('POST /api/employees/[id]/terminate', () => {
  const mockHRAdminUser = {
    id: 'user-1',
    auth_id: 'auth-1',
    email: 'admin@example.com',
    role: UserRole.HR_ADMIN,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    last_active_at: null,
  };

  const createMockEmployee = (overrides: Partial<Employee> = {}): Employee => ({
    id: 'emp-123',
    first_name: 'John',
    surname: 'Doe',
    ssn: '123456-7890',
    email: 'john@example.com',
    mobile: '+46701234567',
    rank: 'SEV',
    gender: 'Man',
    town_district: 'Göteborg',
    hire_date: '2025-01-15',
    stena_date: null,
    omc_date: null,
    pe3_date: null,
    termination_date: null,
    termination_reason: null,
    is_terminated: false,
    is_archived: false,
    repayment_needed_omc: null,
    repayment_needed_pe3: null,
    one: null,
    one_marked_at: null,
    talmundo: null,
    isps: null,
    photo: null,
    origo: null,
    loneiva: null,
    mail_lon: null,
    bankuppgifter: null,
    li: null,
    passport: null,
    kvitto_c17_18: null,
    c17: null,
    crewing_done: null,
    comments: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully terminate employee', async () => {
    const mockEmployee = createMockEmployee({
      termination_date: '2025-11-13',
      termination_reason: 'Voluntary resignation',
      is_terminated: true,
      stena_date: null,
      omc_date: null,
      pe3_date: null,
    });

    vi.mocked(auth.requireEmployeeManagerAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.terminate).mockResolvedValue({
      employee: mockEmployee,
      clearedDates: [],
      releasedSpots: 0,
    });

    const request = new NextRequest('http://localhost:3000/api/employees/emp-123/terminate', {
      method: 'POST',
      body: JSON.stringify({
        termination_date: '2025-11-13',
        termination_reason: 'Voluntary resignation',
      }),
    });

    const response = await TERMINATE(request, { params: Promise.resolve({ id: 'emp-123' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.employee.is_terminated).toBe(true);
    expect(json.data.employee.termination_date).toBe('2025-11-13');
    expect(json.data.employee.termination_reason).toBe('Voluntary resignation');
    expect(json.data.clearedDates).toEqual([]);
    expect(json.data.releasedSpots).toBe(0);
    expect(employeeRepository.terminate).toHaveBeenCalledWith(
      'emp-123',
      '2025-11-13',
      'Voluntary resignation'
    );
  });

  it('should terminate employee with ÖMC date (repayment captured)', async () => {
    const omcDateId = 'omc-date-1';
    const mockEmployee = createMockEmployee({
      omc_date: null,
      termination_date: '2025-11-13',
      termination_reason: 'End of contract',
      is_terminated: true,
      repayment_needed_omc: true,
      stena_date: null,
      pe3_date: null,
    });

    vi.mocked(auth.requireEmployeeManagerAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.terminate).mockResolvedValue({
      employee: mockEmployee,
      clearedDates: [omcDateId],
      releasedSpots: 1,
    });

    const request = new NextRequest('http://localhost:3000/api/employees/emp-123/terminate', {
      method: 'POST',
      body: JSON.stringify({
        termination_date: '2025-11-13',
        termination_reason: 'End of contract',
      }),
    });

    const response = await TERMINATE(request, { params: Promise.resolve({ id: 'emp-123' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.employee.repayment_needed_omc).toBe(true);
    expect(json.data.employee.omc_date).toBeNull();
    expect(json.data.clearedDates).toContain(omcDateId);
    expect(json.data.releasedSpots).toBe(1);
  });

  it('should terminate employee with PE3 date (repayment captured)', async () => {
    const pe3DateId = 'pe3-date-1';
    const mockEmployee = createMockEmployee({
      pe3_date: null,
      termination_date: '2025-11-13',
      termination_reason: 'Retirement',
      is_terminated: true,
      repayment_needed_pe3: true,
      stena_date: null,
      omc_date: null,
    });

    vi.mocked(auth.requireEmployeeManagerAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.terminate).mockResolvedValue({
      employee: mockEmployee,
      clearedDates: [pe3DateId],
      releasedSpots: 1,
    });

    const request = new NextRequest('http://localhost:3000/api/employees/emp-123/terminate', {
      method: 'POST',
      body: JSON.stringify({
        termination_date: '2025-11-13',
        termination_reason: 'Retirement',
      }),
    });

    const response = await TERMINATE(request, { params: Promise.resolve({ id: 'emp-123' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.employee.repayment_needed_pe3).toBe(true);
    expect(json.data.employee.pe3_date).toBeNull();
    expect(json.data.clearedDates).toContain(pe3DateId);
  });

  it('should terminate employee with both ÖMC and PE3 dates', async () => {
    const omcDateId = 'omc-date-1';
    const pe3DateId = 'pe3-date-1';
    const mockEmployee = createMockEmployee({
      omc_date: null,
      pe3_date: null,
      termination_date: '2025-11-13',
      termination_reason: 'End of contract',
      is_terminated: true,
      repayment_needed_omc: true,
      repayment_needed_pe3: true,
      stena_date: null,
    });

    vi.mocked(auth.requireEmployeeManagerAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.terminate).mockResolvedValue({
      employee: mockEmployee,
      clearedDates: [omcDateId, pe3DateId],
      releasedSpots: 2,
    });

    const request = new NextRequest('http://localhost:3000/api/employees/emp-123/terminate', {
      method: 'POST',
      body: JSON.stringify({
        termination_date: '2025-11-13',
        termination_reason: 'End of contract',
      }),
    });

    const response = await TERMINATE(request, { params: Promise.resolve({ id: 'emp-123' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.employee.repayment_needed_omc).toBe(true);
    expect(json.data.employee.repayment_needed_pe3).toBe(true);
    expect(json.data.clearedDates).toHaveLength(2);
    expect(json.data.releasedSpots).toBe(2);
  });

  it('should terminate employee with no dates assigned', async () => {
    const mockEmployee = createMockEmployee({
      stena_date: null,
      omc_date: null,
      pe3_date: null,
      termination_date: '2025-11-13',
      termination_reason: 'Voluntary resignation',
      is_terminated: true,
    });

    vi.mocked(auth.requireEmployeeManagerAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.terminate).mockResolvedValue({
      employee: mockEmployee,
      clearedDates: [],
      releasedSpots: 0,
    });

    const request = new NextRequest('http://localhost:3000/api/employees/emp-123/terminate', {
      method: 'POST',
      body: JSON.stringify({
        termination_date: '2025-11-13',
        termination_reason: 'Voluntary resignation',
      }),
    });

    const response = await TERMINATE(request, { params: Promise.resolve({ id: 'emp-123' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.clearedDates).toEqual([]);
    expect(json.data.releasedSpots).toBe(0);
  });

  it('should return 404 when employee not found', async () => {
    vi.mocked(auth.requireEmployeeManagerAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.terminate).mockRejectedValue(
      new Error('Employee with ID emp-not-found not found')
    );

    const request = new NextRequest('http://localhost:3000/api/employees/emp-not-found/terminate', {
      method: 'POST',
      body: JSON.stringify({
        termination_date: '2025-11-13',
        termination_reason: 'Test reason',
      }),
    });

    const response = await TERMINATE(request, { params: Promise.resolve({ id: 'emp-not-found' }) });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error.code).toBe('NOT_FOUND');
    expect(json.error.message).toContain('not found');
  });

  it('should return 400 when already terminated', async () => {
    vi.mocked(auth.requireEmployeeManagerAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.terminate).mockRejectedValue(
      new Error('Employee is already terminated')
    );
    vi.mocked(auth.createErrorResponse).mockReturnValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'BAD_REQUEST',
            message: 'Employee is already terminated',
          },
        }),
        { status: 400 }
      ) as never
    );

    const request = new NextRequest('http://localhost:3000/api/employees/emp-123/terminate', {
      method: 'POST',
      body: JSON.stringify({
        termination_date: '2025-11-13',
        termination_reason: 'Test reason',
      }),
    });

    const response = await TERMINATE(request, { params: Promise.resolve({ id: 'emp-123' }) });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe('BAD_REQUEST');
  });
});

describe('POST /api/employees/[id]/reactivate', () => {
  const mockHRAdminUser = {
    id: 'user-1',
    auth_id: 'auth-1',
    email: 'admin@example.com',
    role: UserRole.HR_ADMIN,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    last_active_at: null,
  };

  const createMockEmployee = (overrides: Partial<Employee> = {}): Employee => ({
    id: 'emp-123',
    first_name: 'John',
    surname: 'Doe',
    ssn: '123456-7890',
    email: 'john@example.com',
    mobile: '+46701234567',
    rank: 'SEV',
    gender: 'Man',
    town_district: 'Göteborg',
    hire_date: '2025-01-15',
    stena_date: null,
    omc_date: null,
    pe3_date: null,
    termination_date: null,
    termination_reason: null,
    is_terminated: false,
    is_archived: false,
    repayment_needed_omc: null,
    repayment_needed_pe3: null,
    one: null,
    one_marked_at: null,
    talmundo: null,
    isps: null,
    photo: null,
    origo: null,
    loneiva: null,
    mail_lon: null,
    bankuppgifter: null,
    li: null,
    passport: null,
    kvitto_c17_18: null,
    c17: null,
    crewing_done: null,
    comments: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully reactivate employee', async () => {
    const mockEmployee = createMockEmployee({
      is_terminated: false,
      termination_date: null,
      termination_reason: null,
    });

    vi.mocked(auth.requireEmployeeManagerAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.reactivate).mockResolvedValue({
      employee: mockEmployee,
      warnings: [],
    });

    const request = new NextRequest('http://localhost:3000/api/employees/emp-123/reactivate', {
      method: 'POST',
    });

    const response = await REACTIVATE(request, { params: Promise.resolve({ id: 'emp-123' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.is_terminated).toBe(false);
    expect(json.data.termination_date).toBeNull();
    expect(json.data.termination_reason).toBeNull();
    expect(json.warnings).toEqual([]);
    expect(employeeRepository.reactivate).toHaveBeenCalledWith('emp-123');
  });

  it('should reactivate employee with available spots (dates restored)', async () => {
    const omcDateId = 'omc-date-1';
    const mockEmployee = createMockEmployee({
      is_terminated: false,
      termination_date: null,
      omc_date: omcDateId,
      repayment_needed_omc: null,
    });

    vi.mocked(auth.requireEmployeeManagerAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.reactivate).mockResolvedValue({
      employee: mockEmployee,
      warnings: [],
    });

    const request = new NextRequest('http://localhost:3000/api/employees/emp-123/reactivate', {
      method: 'POST',
    });

    const response = await REACTIVATE(request, { params: Promise.resolve({ id: 'emp-123' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.omc_date).toBe(omcDateId);
    expect(json.data.repayment_needed_omc).toBeNull();
    expect(json.warnings).toEqual([]);
  });

  it('should reactivate employee with unavailable spots (warnings returned)', async () => {
    const mockEmployee = createMockEmployee({
      is_terminated: false,
      termination_date: null,
      omc_date: null,
      repayment_needed_omc: true,
    });

    vi.mocked(auth.requireEmployeeManagerAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.reactivate).mockResolvedValue({
      employee: mockEmployee,
      warnings: [
        'Cannot restore ÖMC Date ÖMC Training 8-9 mars 2025 - currently fully booked (0 spots remaining)',
      ],
    });

    const request = new NextRequest('http://localhost:3000/api/employees/emp-123/reactivate', {
      method: 'POST',
    });

    const response = await REACTIVATE(request, { params: Promise.resolve({ id: 'emp-123' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.omc_date).toBeNull();
    expect(json.data.repayment_needed_omc).toBe(true);
    expect(json.warnings).toHaveLength(1);
    expect(json.warnings[0]).toContain('fully booked');
  });

  it('should reactivate employee with deleted dates (warnings returned)', async () => {
    const mockEmployee = createMockEmployee({
      is_terminated: false,
      termination_date: null,
      omc_date: null,
      repayment_needed_omc: true,
    });

    vi.mocked(auth.requireEmployeeManagerAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.reactivate).mockResolvedValue({
      employee: mockEmployee,
      warnings: [
        'ÖMC Date 2025-03-08 no longer exists, could not restore',
      ],
    });

    const request = new NextRequest('http://localhost:3000/api/employees/emp-123/reactivate', {
      method: 'POST',
    });

    const response = await REACTIVATE(request, { params: Promise.resolve({ id: 'emp-123' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.warnings).toHaveLength(1);
    expect(json.warnings[0]).toContain('no longer exists');
  });

  it('should return 404 when employee not found', async () => {
    vi.mocked(auth.requireEmployeeManagerAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.reactivate).mockRejectedValue(
      new Error('Employee with ID emp-not-found not found')
    );

    const request = new NextRequest('http://localhost:3000/api/employees/emp-not-found/reactivate', {
      method: 'POST',
    });

    const response = await REACTIVATE(request, { params: Promise.resolve({ id: 'emp-not-found' }) });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error.code).toBe('NOT_FOUND');
    expect(json.error.message).toContain('not found');
  });

  it('should return 400 when already active', async () => {
    vi.mocked(auth.requireEmployeeManagerAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.reactivate).mockRejectedValue(
      new Error('Employee is already active')
    );
    vi.mocked(auth.createErrorResponse).mockReturnValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'BAD_REQUEST',
            message: 'Employee is already active',
          },
        }),
        { status: 400 }
      ) as never
    );

    const request = new NextRequest('http://localhost:3000/api/employees/emp-123/reactivate', {
      method: 'POST',
    });

    const response = await REACTIVATE(request, { params: Promise.resolve({ id: 'emp-123' }) });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe('BAD_REQUEST');
  });
});

