/**
 * Unit Tests: Reactivation Workflow Service
 * Story 11.3: Comprehensive Test Coverage for Reactivation Workflows
 * 
 * Tests all reactivation workflow logic paths including:
 * - Spot availability checks (available/unavailable)
 * - Date existence checks (deleted dates)
 * - Date restoration (ÖMC and PE3)
 * - Spot decrement on restoration
 * - assigned_employees array updates (via assignEmployeeToDate)
 * - Termination date clearing (handled by repository)
 * - Edge cases and warning scenarios
 * 
 * Note: Reactivation logic is implemented in termination-workflow.ts
 * as restoreRepaymentDates() function. This test file provides focused
 * coverage of reactivation-specific scenarios.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { restoreRepaymentDates } from '@/lib/services/termination-workflow';
import { createClient } from '@/lib/supabase/server';
import { assignEmployeeToDate } from '@/lib/services/date-capacity';

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// Mock date-capacity service
vi.mock('@/lib/services/date-capacity', () => ({
  assignEmployeeToDate: vi.fn(),
}));

describe('Reactivation Workflow Service', () => {
  let mockSupabaseFrom: ReturnType<typeof vi.fn>;
  let mockSupabaseRpc: ReturnType<typeof vi.fn>;
  let mockSupabaseClient: {
    from: ReturnType<typeof vi.fn>;
    rpc: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabaseFrom = vi.fn((table: string) => {
      const chainMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
        update: vi.fn().mockReturnThis(),
      };
      return chainMock;
    });

    mockSupabaseRpc = vi.fn().mockResolvedValue({ data: null, error: null });

    mockSupabaseClient = {
      from: mockSupabaseFrom,
      rpc: mockSupabaseRpc,
    };

    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabaseClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Spot Availability Check', () => {
    it('should restore ÖMC date when spots are available', async () => {
      const employeeId = 'emp-123';
      const omcDateValue = '2025-03-08';
      const omcDateId = 'omc-date-1';
      
      const mockEmployeeSingle = vi.fn().mockResolvedValue({
        data: {
          id: employeeId,
          first_name: 'John',
          surname: 'Doe',
          repayment_needed_omc: omcDateValue,
          repayment_needed_pe3: null,
        },
        error: null,
      });

      const mockEmployeeEq = vi.fn().mockReturnValue({
        single: mockEmployeeSingle,
      });

      const mockEmployeeSelect = vi.fn().mockReturnValue({
        eq: mockEmployeeEq,
      });

      const mockDateSingle = vi.fn().mockResolvedValue({
        data: {
          id: omcDateId,
          date_description: 'ÖMC Training 8-9 mars',
          remaining_spots: 5, // Spots available
        },
        error: null,
      });

      // Support chained .eq() calls - second eq returns object with single()
      const mockDateEq2 = vi.fn().mockReturnValue({
        single: mockDateSingle,
      });

      const mockDateEq1 = vi.fn().mockReturnValue({
        eq: mockDateEq2,
      });

      const mockDateSelect = vi.fn().mockReturnValue({
        eq: mockDateEq1,
      });

      vi.mocked(assignEmployeeToDate).mockResolvedValue({
        success: true,
        message: 'Assigned',
      });

      const mockUpdateEq = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: mockUpdateEq,
      });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'employees') {
          return {
            select: mockEmployeeSelect,
            update: mockUpdate,
          };
        }
        if (table === 'important_dates') {
          return {
            select: mockDateSelect,
          };
        }
        return {};
      });

      const result = await restoreRepaymentDates(employeeId);

      expect(mockDateSelect).toHaveBeenCalledWith('id, date_description, remaining_spots');
      expect(mockDateEq1).toHaveBeenCalledWith('date_value', omcDateValue);
      expect(mockDateEq2).toHaveBeenCalledWith('category', 'ÖMC Dates');
      expect(assignEmployeeToDate).toHaveBeenCalledWith(employeeId, omcDateId, null, 'omc_date', expect.anything());
      expect(mockUpdate).toHaveBeenCalledWith({ repayment_needed_omc: null });
      expect(result.restored.omc).toBe(true);
      expect(result.warnings).toEqual([]);
    });

    it('should warn when ÖMC date spots are unavailable (fully booked)', async () => {
      const employeeId = 'emp-123';
      const omcDateValue = '2025-03-08';
      const omcDateId = 'omc-date-1';
      
      const mockEmployeeSingle = vi.fn().mockResolvedValue({
        data: {
          id: employeeId,
          first_name: 'John',
          surname: 'Doe',
          repayment_needed_omc: omcDateValue,
          repayment_needed_pe3: null,
        },
        error: null,
      });

      const mockEmployeeEq = vi.fn().mockReturnValue({
        single: mockEmployeeSingle,
      });

      const mockEmployeeSelect = vi.fn().mockReturnValue({
        eq: mockEmployeeEq,
      });

      const mockDateSingle = vi.fn().mockResolvedValue({
        data: {
          id: omcDateId,
          date_description: 'ÖMC Training 8-9 mars',
          remaining_spots: 0, // Fully booked
        },
        error: null,
      });

      // Support chained .eq() calls
      const mockDateEq2 = vi.fn().mockReturnValue({
        single: mockDateSingle,
      });

      const mockDateEq1 = vi.fn().mockReturnValue({
        eq: mockDateEq2,
      });

      const mockDateSelect = vi.fn().mockReturnValue({
        eq: mockDateEq1,
      });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'employees') {
          return {
            select: mockEmployeeSelect,
          };
        }
        if (table === 'important_dates') {
          return {
            select: mockDateSelect,
          };
        }
        return {};
      });

      const result = await restoreRepaymentDates(employeeId);

      expect(assignEmployeeToDate).not.toHaveBeenCalled();
      expect(result.restored.omc).toBe(false);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('Cannot restore ÖMC Date');
      expect(result.warnings[0]).toContain('fully booked');
    });

    it('should restore PE3 date when spots are available', async () => {
      const employeeId = 'emp-123';
      const pe3DateValue = '2025-04-20';
      const pe3DateId = 'pe3-date-1';
      
      const mockEmployeeSingle = vi.fn().mockResolvedValue({
        data: {
          id: employeeId,
          first_name: 'John',
          surname: 'Doe',
          repayment_needed_omc: null,
          repayment_needed_pe3: pe3DateValue,
        },
        error: null,
      });

      const mockEmployeeEq = vi.fn().mockReturnValue({
        single: mockEmployeeSingle,
      });

      const mockEmployeeSelect = vi.fn().mockReturnValue({
        eq: mockEmployeeEq,
      });

      const mockDateSingle = vi.fn().mockResolvedValue({
        data: {
          id: pe3DateId,
          date_description: 'PE3 Training',
          remaining_spots: 3,
        },
        error: null,
      });

      // Support chained .eq() calls
      const mockDateEq2 = vi.fn().mockReturnValue({
        single: mockDateSingle,
      });

      const mockDateEq1 = vi.fn().mockReturnValue({
        eq: mockDateEq2,
      });

      const mockDateSelect = vi.fn().mockReturnValue({
        eq: mockDateEq1,
      });

      vi.mocked(assignEmployeeToDate).mockResolvedValue({
        success: true,
        message: 'Assigned',
      });

      const mockUpdateEq = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: mockUpdateEq,
      });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'employees') {
          return {
            select: mockEmployeeSelect,
            update: mockUpdate,
          };
        }
        if (table === 'important_dates') {
          return {
            select: mockDateSelect,
          };
        }
        return {};
      });

      const result = await restoreRepaymentDates(employeeId);

      expect(assignEmployeeToDate).toHaveBeenCalledWith(employeeId, pe3DateId, null, 'pe3_date', expect.anything());
      expect(mockUpdate).toHaveBeenCalledWith({ repayment_needed_pe3: null });
      expect(result.restored.pe3).toBe(true);
      expect(result.warnings).toEqual([]);
    });

    it('should warn when PE3 date spots are unavailable', async () => {
      const employeeId = 'emp-123';
      const pe3DateValue = '2025-04-20';
      const pe3DateId = 'pe3-date-1';
      
      const mockEmployeeSingle = vi.fn().mockResolvedValue({
        data: {
          id: employeeId,
          first_name: 'John',
          surname: 'Doe',
          repayment_needed_omc: null,
          repayment_needed_pe3: pe3DateValue,
        },
        error: null,
      });

      const mockEmployeeEq = vi.fn().mockReturnValue({
        single: mockEmployeeSingle,
      });

      const mockEmployeeSelect = vi.fn().mockReturnValue({
        eq: mockEmployeeEq,
      });

      const mockDateSingle = vi.fn().mockResolvedValue({
        data: {
          id: pe3DateId,
          date_description: 'PE3 Training',
          remaining_spots: 0,
        },
        error: null,
      });

      // Support chained .eq() calls
      const mockDateEq2 = vi.fn().mockReturnValue({
        single: mockDateSingle,
      });

      const mockDateEq1 = vi.fn().mockReturnValue({
        eq: mockDateEq2,
      });

      const mockDateSelect = vi.fn().mockReturnValue({
        eq: mockDateEq1,
      });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'employees') {
          return {
            select: mockEmployeeSelect,
          };
        }
        if (table === 'important_dates') {
          return {
            select: mockDateSelect,
          };
        }
        return {};
      });

      const result = await restoreRepaymentDates(employeeId);

      expect(assignEmployeeToDate).not.toHaveBeenCalled();
      expect(result.restored.pe3).toBe(false);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('PE3');
      expect(result.warnings[0]).toContain('fully booked');
    });
  });

  describe('Date Existence Check', () => {
    it('should warn when ÖMC date is deleted (no longer exists)', async () => {
      const employeeId = 'emp-123';
      const omcDateValue = '2025-03-08';
      
      const mockEmployeeSingle = vi.fn().mockResolvedValue({
        data: {
          id: employeeId,
          first_name: 'John',
          surname: 'Doe',
          repayment_needed_omc: omcDateValue,
          repayment_needed_pe3: null,
        },
        error: null,
      });

      const mockEmployeeEq = vi.fn().mockReturnValue({
        single: mockEmployeeSingle,
      });

      const mockEmployeeSelect = vi.fn().mockReturnValue({
        eq: mockEmployeeEq,
      });

      const mockDateSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      // Support chained .eq() calls
      const mockDateEq2 = vi.fn().mockReturnValue({
        single: mockDateSingle,
      });

      const mockDateEq1 = vi.fn().mockReturnValue({
        eq: mockDateEq2,
      });

      const mockDateSelect = vi.fn().mockReturnValue({
        eq: mockDateEq1,
      });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'employees') {
          return {
            select: mockEmployeeSelect,
          };
        }
        if (table === 'important_dates') {
          return {
            select: mockDateSelect,
          };
        }
        return {};
      });

      const result = await restoreRepaymentDates(employeeId);

      expect(assignEmployeeToDate).not.toHaveBeenCalled();
      expect(result.restored.omc).toBe(false);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('ÖMC Date');
      expect(result.warnings[0]).toContain('no longer exists');
    });

    it('should warn when PE3 date is deleted', async () => {
      const employeeId = 'emp-123';
      const pe3DateValue = '2025-04-20';
      
      const mockEmployeeSingle = vi.fn().mockResolvedValue({
        data: {
          id: employeeId,
          first_name: 'John',
          surname: 'Doe',
          repayment_needed_omc: null,
          repayment_needed_pe3: pe3DateValue,
        },
        error: null,
      });

      const mockEmployeeEq = vi.fn().mockReturnValue({
        single: mockEmployeeSingle,
      });

      const mockEmployeeSelect = vi.fn().mockReturnValue({
        eq: mockEmployeeEq,
      });

      const mockDateSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      // Support chained .eq() calls
      const mockDateEq2 = vi.fn().mockReturnValue({
        single: mockDateSingle,
      });

      const mockDateEq1 = vi.fn().mockReturnValue({
        eq: mockDateEq2,
      });

      const mockDateSelect = vi.fn().mockReturnValue({
        eq: mockDateEq1,
      });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'employees') {
          return {
            select: mockEmployeeSelect,
          };
        }
        if (table === 'important_dates') {
          return {
            select: mockDateSelect,
          };
        }
        return {};
      });

      const result = await restoreRepaymentDates(employeeId);

      expect(assignEmployeeToDate).not.toHaveBeenCalled();
      expect(result.restored.pe3).toBe(false);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('PE3 Date');
      expect(result.warnings[0]).toContain('no longer exists');
    });
  });

  describe('Date Restoration', () => {
    it('should restore ÖMC date and clear repayment field', async () => {
      const employeeId = 'emp-123';
      const omcDateValue = '2025-03-08';
      const omcDateId = 'omc-date-1';
      
      const mockEmployeeSingle = vi.fn().mockResolvedValue({
        data: {
          id: employeeId,
          first_name: 'John',
          surname: 'Doe',
          repayment_needed_omc: omcDateValue,
          repayment_needed_pe3: null,
        },
        error: null,
      });

      const mockEmployeeEq = vi.fn().mockReturnValue({
        single: mockEmployeeSingle,
      });

      const mockEmployeeSelect = vi.fn().mockReturnValue({
        eq: mockEmployeeEq,
      });

      const mockDateSingle = vi.fn().mockResolvedValue({
        data: {
          id: omcDateId,
          date_description: 'ÖMC Training',
          remaining_spots: 5,
        },
        error: null,
      });

      // Support chained .eq() calls
      const mockDateEq2 = vi.fn().mockReturnValue({
        single: mockDateSingle,
      });

      const mockDateEq1 = vi.fn().mockReturnValue({
        eq: mockDateEq2,
      });

      const mockDateSelect = vi.fn().mockReturnValue({
        eq: mockDateEq1,
      });

      vi.mocked(assignEmployeeToDate).mockResolvedValue({
        success: true,
        message: 'Assigned',
      });

      const mockUpdateEq = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: mockUpdateEq,
      });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'employees') {
          return {
            select: mockEmployeeSelect,
            update: mockUpdate,
          };
        }
        if (table === 'important_dates') {
          return {
            select: mockDateSelect,
          };
        }
        return {};
      });

      const result = await restoreRepaymentDates(employeeId);

      expect(assignEmployeeToDate).toHaveBeenCalledWith(employeeId, omcDateId, null, 'omc_date', expect.anything());
      expect(mockUpdate).toHaveBeenCalledWith({ repayment_needed_omc: null });
      expect(result.restored.omc).toBe(true);
    });

    it('should restore PE3 date and clear repayment field', async () => {
      const employeeId = 'emp-123';
      const pe3DateValue = '2025-04-20';
      const pe3DateId = 'pe3-date-1';
      
      const mockEmployeeSingle = vi.fn().mockResolvedValue({
        data: {
          id: employeeId,
          first_name: 'John',
          surname: 'Doe',
          repayment_needed_omc: null,
          repayment_needed_pe3: pe3DateValue,
        },
        error: null,
      });

      const mockEmployeeEq = vi.fn().mockReturnValue({
        single: mockEmployeeSingle,
      });

      const mockEmployeeSelect = vi.fn().mockReturnValue({
        eq: mockEmployeeEq,
      });

      const mockDateSingle = vi.fn().mockResolvedValue({
        data: {
          id: pe3DateId,
          date_description: 'PE3 Training',
          remaining_spots: 3,
        },
        error: null,
      });

      // Support chained .eq() calls
      const mockDateEq2 = vi.fn().mockReturnValue({
        single: mockDateSingle,
      });

      const mockDateEq1 = vi.fn().mockReturnValue({
        eq: mockDateEq2,
      });

      const mockDateSelect = vi.fn().mockReturnValue({
        eq: mockDateEq1,
      });

      vi.mocked(assignEmployeeToDate).mockResolvedValue({
        success: true,
        message: 'Assigned',
      });

      const mockUpdateEq = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: mockUpdateEq,
      });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'employees') {
          return {
            select: mockEmployeeSelect,
            update: mockUpdate,
          };
        }
        if (table === 'important_dates') {
          return {
            select: mockDateSelect,
          };
        }
        return {};
      });

      const result = await restoreRepaymentDates(employeeId);

      expect(assignEmployeeToDate).toHaveBeenCalledWith(employeeId, pe3DateId, null, 'pe3_date', expect.anything());
      expect(mockUpdate).toHaveBeenCalledWith({ repayment_needed_pe3: null });
      expect(result.restored.pe3).toBe(true);
    });
  });

  describe('Spot Decrement on Restoration', () => {
    it('should call assignEmployeeToDate which handles spot decrement', async () => {
      const employeeId = 'emp-123';
      const omcDateValue = '2025-03-08';
      const omcDateId = 'omc-date-1';
      
      const mockEmployeeSingle = vi.fn().mockResolvedValue({
        data: {
          id: employeeId,
          first_name: 'John',
          surname: 'Doe',
          repayment_needed_omc: omcDateValue,
          repayment_needed_pe3: null,
        },
        error: null,
      });

      const mockEmployeeEq = vi.fn().mockReturnValue({
        single: mockEmployeeSingle,
      });

      const mockEmployeeSelect = vi.fn().mockReturnValue({
        eq: mockEmployeeEq,
      });

      const mockDateSingle = vi.fn().mockResolvedValue({
        data: {
          id: omcDateId,
          date_description: 'ÖMC Training',
          remaining_spots: 5,
        },
        error: null,
      });

      // Support chained .eq() calls
      const mockDateEq2 = vi.fn().mockReturnValue({
        single: mockDateSingle,
      });

      const mockDateEq1 = vi.fn().mockReturnValue({
        eq: mockDateEq2,
      });

      const mockDateSelect = vi.fn().mockReturnValue({
        eq: mockDateEq1,
      });

      vi.mocked(assignEmployeeToDate).mockResolvedValue({
        success: true,
        message: 'Assigned',
      });

      const mockUpdateEq = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: mockUpdateEq,
      });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'employees') {
          return {
            select: mockEmployeeSelect,
            update: mockUpdate,
          };
        }
        if (table === 'important_dates') {
          return {
            select: mockDateSelect,
          };
        }
        return {};
      });

      await restoreRepaymentDates(employeeId);

      // assignEmployeeToDate handles spot decrement internally via RPC
      expect(assignEmployeeToDate).toHaveBeenCalledWith(employeeId, omcDateId, null, 'omc_date', expect.anything());
    });
  });

  describe('assigned_employees Array Updates', () => {
    it('should update assigned_employees array via assignEmployeeToDate', async () => {
      const employeeId = 'emp-123';
      const omcDateValue = '2025-03-08';
      const omcDateId = 'omc-date-1';
      
      const mockEmployeeSingle = vi.fn().mockResolvedValue({
        data: {
          id: employeeId,
          first_name: 'John',
          surname: 'Doe',
          repayment_needed_omc: omcDateValue,
          repayment_needed_pe3: null,
        },
        error: null,
      });

      const mockEmployeeEq = vi.fn().mockReturnValue({
        single: mockEmployeeSingle,
      });

      const mockEmployeeSelect = vi.fn().mockReturnValue({
        eq: mockEmployeeEq,
      });

      const mockDateSingle = vi.fn().mockResolvedValue({
        data: {
          id: omcDateId,
          date_description: 'ÖMC Training',
          remaining_spots: 5,
        },
        error: null,
      });

      // Support chained .eq() calls
      const mockDateEq2 = vi.fn().mockReturnValue({
        single: mockDateSingle,
      });

      const mockDateEq1 = vi.fn().mockReturnValue({
        eq: mockDateEq2,
      });

      const mockDateSelect = vi.fn().mockReturnValue({
        eq: mockDateEq1,
      });

      vi.mocked(assignEmployeeToDate).mockResolvedValue({
        success: true,
        message: 'Assigned',
      });

      const mockUpdateEq = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: mockUpdateEq,
      });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'employees') {
          return {
            select: mockEmployeeSelect,
            update: mockUpdate,
          };
        }
        if (table === 'important_dates') {
          return {
            select: mockDateSelect,
          };
        }
        return {};
      });

      await restoreRepaymentDates(employeeId);

      // assignEmployeeToDate handles assigned_employees array update via RPC
      expect(assignEmployeeToDate).toHaveBeenCalledWith(employeeId, omcDateId, null, 'omc_date', expect.anything());
    });
  });

  describe('Edge Cases', () => {
    it('should handle employee with no repayment dates (clean reactivation)', async () => {
      const employeeId = 'emp-123';
      
      const mockEmployeeSingle = vi.fn().mockResolvedValue({
        data: {
          id: employeeId,
          first_name: 'John',
          surname: 'Doe',
          repayment_needed_omc: null,
          repayment_needed_pe3: null,
        },
        error: null,
      });

      const mockEmployeeEq = vi.fn().mockReturnValue({
        single: mockEmployeeSingle,
      });

      const mockEmployeeSelect = vi.fn().mockReturnValue({
        eq: mockEmployeeEq,
      });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'employees') {
          return {
            select: mockEmployeeSelect,
          };
        }
        return {};
      });

      const result = await restoreRepaymentDates(employeeId);

      expect(assignEmployeeToDate).not.toHaveBeenCalled();
      expect(result.restored.omc).toBe(false);
      expect(result.restored.pe3).toBe(false);
      expect(result.warnings).toEqual([]);
    });
  });

  describe('Warning Scenarios', () => {
    it('should return warnings when both dates unavailable', async () => {
      const employeeId = 'emp-123';
      const omcDateValue = '2025-03-08';
      const pe3DateValue = '2025-04-20';
      
      const mockEmployeeSingle = vi.fn().mockResolvedValue({
        data: {
          id: employeeId,
          first_name: 'John',
          surname: 'Doe',
          repayment_needed_omc: omcDateValue,
          repayment_needed_pe3: pe3DateValue,
        },
        error: null,
      });

      const mockEmployeeEq = vi.fn().mockReturnValue({
        single: mockEmployeeSingle,
      });

      const mockEmployeeSelect = vi.fn().mockReturnValue({
        eq: mockEmployeeEq,
      });

      const mockDateSingle = vi.fn()
        .mockResolvedValueOnce({
          data: { id: 'omc-1', date_description: 'ÖMC Training', remaining_spots: 0 },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 'pe3-1', date_description: 'PE3 Training', remaining_spots: 0 },
          error: null,
        });

      // Support chained .eq() calls
      const mockDateEq2 = vi.fn().mockReturnValue({
        single: mockDateSingle,
      });

      const mockDateEq1 = vi.fn().mockReturnValue({
        eq: mockDateEq2,
      });

      const mockDateSelect = vi.fn().mockReturnValue({
        eq: mockDateEq1,
      });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'employees') {
          return {
            select: mockEmployeeSelect,
          };
        }
        if (table === 'important_dates') {
          return {
            select: mockDateSelect,
          };
        }
        return {};
      });

      const result = await restoreRepaymentDates(employeeId);

      expect(assignEmployeeToDate).not.toHaveBeenCalled();
      expect(result.restored.omc).toBe(false);
      expect(result.restored.pe3).toBe(false);
      expect(result.warnings).toHaveLength(2);
      expect(result.warnings[0]).toContain('ÖMC');
      expect(result.warnings[1]).toContain('PE3');
    });

    it('should return warnings when both dates deleted', async () => {
      const employeeId = 'emp-123';
      const omcDateValue = '2025-03-08';
      const pe3DateValue = '2025-04-20';
      
      const mockEmployeeSingle = vi.fn().mockResolvedValue({
        data: {
          id: employeeId,
          first_name: 'John',
          surname: 'Doe',
          repayment_needed_omc: omcDateValue,
          repayment_needed_pe3: pe3DateValue,
        },
        error: null,
      });

      const mockEmployeeEq = vi.fn().mockReturnValue({
        single: mockEmployeeSingle,
      });

      const mockEmployeeSelect = vi.fn().mockReturnValue({
        eq: mockEmployeeEq,
      });

      const mockDateSingle = vi.fn()
        .mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116', message: 'No rows found' },
        })
        .mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116', message: 'No rows found' },
        });

      // Support chained .eq() calls
      const mockDateEq2 = vi.fn().mockReturnValue({
        single: mockDateSingle,
      });

      const mockDateEq1 = vi.fn().mockReturnValue({
        eq: mockDateEq2,
      });

      const mockDateSelect = vi.fn().mockReturnValue({
        eq: mockDateEq1,
      });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'employees') {
          return {
            select: mockEmployeeSelect,
          };
        }
        if (table === 'important_dates') {
          return {
            select: mockDateSelect,
          };
        }
        return {};
      });

      const result = await restoreRepaymentDates(employeeId);

      expect(assignEmployeeToDate).not.toHaveBeenCalled();
      expect(result.restored.omc).toBe(false);
      expect(result.restored.pe3).toBe(false);
      expect(result.warnings).toHaveLength(2);
      expect(result.warnings[0]).toContain('ÖMC Date');
      expect(result.warnings[0]).toContain('no longer exists');
      expect(result.warnings[1]).toContain('PE3 Date');
      expect(result.warnings[1]).toContain('no longer exists');
    });

    it('should return mixed warnings (one unavailable, one deleted)', async () => {
      const employeeId = 'emp-123';
      const omcDateValue = '2025-03-08';
      const pe3DateValue = '2025-04-20';
      
      const mockEmployeeSingle = vi.fn().mockResolvedValue({
        data: {
          id: employeeId,
          first_name: 'John',
          surname: 'Doe',
          repayment_needed_omc: omcDateValue,
          repayment_needed_pe3: pe3DateValue,
        },
        error: null,
      });

      const mockEmployeeEq = vi.fn().mockReturnValue({
        single: mockEmployeeSingle,
      });

      const mockEmployeeSelect = vi.fn().mockReturnValue({
        eq: mockEmployeeEq,
      });

      const mockDateSingle = vi.fn()
        .mockResolvedValueOnce({
          data: { id: 'omc-1', date_description: 'ÖMC Training', remaining_spots: 0 },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116', message: 'No rows found' },
        });

      // Support chained .eq() calls
      const mockDateEq2 = vi.fn().mockReturnValue({
        single: mockDateSingle,
      });

      const mockDateEq1 = vi.fn().mockReturnValue({
        eq: mockDateEq2,
      });

      const mockDateSelect = vi.fn().mockReturnValue({
        eq: mockDateEq1,
      });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'employees') {
          return {
            select: mockEmployeeSelect,
          };
        }
        if (table === 'important_dates') {
          return {
            select: mockDateSelect,
          };
        }
        return {};
      });

      const result = await restoreRepaymentDates(employeeId);

      expect(assignEmployeeToDate).not.toHaveBeenCalled();
      expect(result.restored.omc).toBe(false);
      expect(result.restored.pe3).toBe(false);
      expect(result.warnings).toHaveLength(2);
      expect(result.warnings[0]).toContain('ÖMC');
      expect(result.warnings[0]).toContain('fully booked');
      expect(result.warnings[1]).toContain('PE3 Date');
      expect(result.warnings[1]).toContain('no longer exists');
    });
  });
});

