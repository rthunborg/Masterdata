/**
 * Unit Tests for Export Selected Employees API Endpoint
 * Story 13.4: Export Only Selected Employees
 * 
 * Tests verify:
 * - Export crew ready with selected IDs
 * - Empty selection returns 400 error
 * - Invalid IDs are handled gracefully
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/employees/export-crew-ready/route';
import { NextRequest } from 'next/server';
import * as auth from '@/lib/server/auth';
import { employeeRepository } from '@/lib/server/repositories/employee-repository';
import type { Employee } from '@/lib/types/employee';
import { UserRole } from '@/lib/types/user';
import { canEditCrewingDone } from '@/lib/services/crewing-validation';

vi.mock('@/lib/server/auth');
vi.mock('@/lib/server/repositories/employee-repository');
vi.mock('@/lib/services/crewing-validation');

describe('Story 13.4: Export Selected Employees API', () => {
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
    id: 'emp-1',
    first_name: 'John',
    surname: 'Doe',
    ssn: '123456-7890',
    email: 'john@example.com',
    mobile: '+46701234567',
    rank: 'SEV',
    gender: 'Man',
    town_district: 'Stockholm',
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
    isps: true,
    photo: true,
    origo: true,
    loneiva: 1,
    mail_lon: true,
    bankuppgifter: true,
    li: true,
    passport: true,
    kvitto_c17_18: true,
    c17: true,
    crewing_done: false,
    comments: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/employees/export-crew-ready with selectedEmployeeIds', () => {
    it('should export crew ready with selected IDs', async () => {
      const selectedIds = ['emp-1', 'emp-2'];
      const eligible1 = createMockEmployee({
        id: 'emp-1',
        crewing_done: false,
      });
      const eligible2 = createMockEmployee({
        id: 'emp-2',
        crewing_done: false,
      });
      const notSelected = createMockEmployee({
        id: 'emp-3',
        crewing_done: false,
      });

      const allEmployees = [eligible1, eligible2, notSelected];

      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
      vi.mocked(employeeRepository.findAll).mockResolvedValue(allEmployees);
      vi.mocked(canEditCrewingDone).mockImplementation((emp) => {
        return emp.id === 'emp-1' || emp.id === 'emp-2';
      });
      vi.mocked(employeeRepository.update).mockResolvedValue(eligible1);

      const request = new NextRequest('http://localhost:3000/api/employees/export-crew-ready', {
        method: 'POST',
        body: JSON.stringify({ selectedEmployeeIds: selectedIds }),
      });

      const response = await POST(request);
      const csvText = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get('X-Employees-Exported')).toBe('2');
      expect(csvText).toContain('emp-1');
      expect(csvText).toContain('emp-2');
      expect(csvText).not.toContain('emp-3'); // Not selected

      // Verify only selected employees were marked as crewing_done
      expect(employeeRepository.update).toHaveBeenCalledWith('emp-1', { crewing_done: true });
      expect(employeeRepository.update).toHaveBeenCalledWith('emp-2', { crewing_done: true });
      expect(employeeRepository.update).not.toHaveBeenCalledWith('emp-3', expect.anything());
    });

    it('should return 400 error when empty selection is provided', async () => {
      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);

      const request = new NextRequest('http://localhost:3000/api/employees/export-crew-ready', {
        method: 'POST',
        body: JSON.stringify({ selectedEmployeeIds: [] }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error.code).toBe('NO_EMPLOYEES_SELECTED');
      expect(json.error.message).toBe('No employees selected. Please select employees to export.');
    });

    it('should return 400 error when selectedEmployeeIds is missing', async () => {
      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);

      const request = new NextRequest('http://localhost:3000/api/employees/export-crew-ready', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error.code).toBe('NO_EMPLOYEES_SELECTED');
    });

    it('should return 400 error when selectedEmployeeIds is not an array', async () => {
      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);

      const request = new NextRequest('http://localhost:3000/api/employees/export-crew-ready', {
        method: 'POST',
        body: JSON.stringify({ selectedEmployeeIds: 'not-an-array' }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error.code).toBe('NO_EMPLOYEES_SELECTED');
    });

    it('should handle invalid IDs gracefully (IDs not in database)', async () => {
      const selectedIds = ['emp-999', 'emp-998']; // Non-existent IDs
      const allEmployees: Employee[] = []; // No employees in database

      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
      vi.mocked(employeeRepository.findAll).mockResolvedValue(allEmployees);

      const request = new NextRequest('http://localhost:3000/api/employees/export-crew-ready', {
        method: 'POST',
        body: JSON.stringify({ selectedEmployeeIds: selectedIds }),
      });

      const response = await POST(request);
      const json = await response.json();

      // Should return 404 when no eligible employees found
      expect(response.status).toBe(404);
      expect(json.error.code).toBe('NO_ELIGIBLE_EMPLOYEES');
    });

    it('should only export selected employees that meet eligibility criteria', async () => {
      const selectedIds = ['emp-1', 'emp-2', 'emp-3'];
      const eligible1 = createMockEmployee({
        id: 'emp-1',
        crewing_done: false,
      });
      const eligible2 = createMockEmployee({
        id: 'emp-2',
        crewing_done: false,
      });
      const ineligible = createMockEmployee({
        id: 'emp-3',
        crewing_done: false,
        isps: false, // Missing prerequisite
      });

      const allEmployees = [eligible1, eligible2, ineligible];

      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
      vi.mocked(employeeRepository.findAll).mockResolvedValue(allEmployees);
      vi.mocked(canEditCrewingDone).mockImplementation((emp) => {
        return emp.id !== 'emp-3'; // emp-3 doesn't meet prerequisites
      });
      vi.mocked(employeeRepository.update).mockResolvedValue(eligible1);

      const request = new NextRequest('http://localhost:3000/api/employees/export-crew-ready', {
        method: 'POST',
        body: JSON.stringify({ selectedEmployeeIds: selectedIds }),
      });

      const response = await POST(request);
      const csvText = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get('X-Employees-Exported')).toBe('2'); // Only eligible1 and eligible2
      expect(csvText).toContain('emp-1');
      expect(csvText).toContain('emp-2');
      expect(csvText).not.toContain('emp-3'); // Ineligible

      // Verify only eligible selected employees were marked
      expect(employeeRepository.update).toHaveBeenCalledWith('emp-1', { crewing_done: true });
      expect(employeeRepository.update).toHaveBeenCalledWith('emp-2', { crewing_done: true });
      expect(employeeRepository.update).not.toHaveBeenCalledWith('emp-3', expect.anything());
    });

    it('should exclude employees already marked as crewing_done', async () => {
      const selectedIds = ['emp-1', 'emp-2'];
      const alreadyDone = createMockEmployee({
        id: 'emp-1',
        crewing_done: true, // Already marked
      });
      const eligible = createMockEmployee({
        id: 'emp-2',
        crewing_done: false,
      });

      const allEmployees = [alreadyDone, eligible];

      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
      vi.mocked(employeeRepository.findAll).mockResolvedValue(allEmployees);
      vi.mocked(canEditCrewingDone).mockReturnValue(true);
      vi.mocked(employeeRepository.update).mockResolvedValue(eligible);

      const request = new NextRequest('http://localhost:3000/api/employees/export-crew-ready', {
        method: 'POST',
        body: JSON.stringify({ selectedEmployeeIds: selectedIds }),
      });

      const response = await POST(request);
      const csvText = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get('X-Employees-Exported')).toBe('1'); // Only emp-2
      expect(csvText).not.toContain('emp-1'); // Already done, excluded
      expect(csvText).toContain('emp-2'); // Eligible

      // Verify only eligible employee was marked
      expect(employeeRepository.update).toHaveBeenCalledWith('emp-2', { crewing_done: true });
      expect(employeeRepository.update).not.toHaveBeenCalledWith('emp-1', expect.anything());
    });
  });
});

