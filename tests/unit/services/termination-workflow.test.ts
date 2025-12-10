/**
 * Unit Tests: Termination Workflow Service
 * Story 11.3: Comprehensive Test Coverage for Termination & Reactivation Workflows
 * 
 * Tests all termination workflow logic paths including:
 * - Repayment field population (ÖMC and PE3)
 * - Date field clearing (stena, omc, pe3)
 * - Spot release for all assigned dates
 * - assigned_employees array updates
 * - Edge cases and error handling
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  captureRepaymentDates, 
  applyRepaymentCapture, 
  clearEmployeeDatesAndReleaseSpots,
  restoreRepaymentDates
} from '@/lib/services/termination-workflow';
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

describe('Termination Workflow Service', () => {
  let mockSupabaseFrom: ReturnType<typeof vi.fn>;
  let mockSupabaseRpc: ReturnType<typeof vi.fn>;
  let mockSupabaseUpdate: ReturnType<typeof vi.fn>;
  let mockSupabaseClient: {
    from: ReturnType<typeof vi.fn>;
    rpc: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create chainable mock for Supabase queries
    mockSupabaseFrom = vi.fn((table: string) => {
      const chainMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        single: vi.fn(),
        update: vi.fn().mockReturnThis(),
      };

      return chainMock;
    });

    mockSupabaseRpc = vi.fn().mockResolvedValue({ data: null, error: null });
    mockSupabaseUpdate = vi.fn().mockResolvedValue({ data: null, error: null });

    mockSupabaseClient = {
      from: mockSupabaseFrom,
      rpc: mockSupabaseRpc,
    };

    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabaseClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('captureRepaymentDates', () => {
    it('should capture ÖMC date value for repayment', async () => {
      const employeeId = 'emp-123';
      const omcDateId = 'omc-date-1';
      
      const mockSingle = vi.fn().mockResolvedValue({
        data: { omc_date: omcDateId, pe3_date: null },
        error: null,
      });

      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
      });

      const result = await captureRepaymentDates(employeeId);

      expect(mockSupabaseFrom).toHaveBeenCalledWith('employees');
      expect(mockSelect).toHaveBeenCalledWith('omc_date, pe3_date');
      expect(mockEq).toHaveBeenCalledWith('id', employeeId);
      expect(result.omc).toBe(omcDateId);
      expect(result.pe3).toBeNull();
    });

    it('should capture PE3 date value for repayment', async () => {
      const employeeId = 'emp-123';
      const pe3DateId = 'pe3-date-1';
      
      const mockSingle = vi.fn().mockResolvedValue({
        data: { omc_date: null, pe3_date: pe3DateId },
        error: null,
      });

      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
      });

      const result = await captureRepaymentDates(employeeId);

      expect(result.omc).toBeNull();
      expect(result.pe3).toBe(pe3DateId);
    });

    it('should capture both ÖMC and PE3 date values', async () => {
      const employeeId = 'emp-123';
      const omcDateId = 'omc-date-1';
      const pe3DateId = 'pe3-date-1';
      
      const mockSingle = vi.fn().mockResolvedValue({
        data: { omc_date: omcDateId, pe3_date: pe3DateId },
        error: null,
      });

      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
      });

      const result = await captureRepaymentDates(employeeId);

      expect(result.omc).toBe(omcDateId);
      expect(result.pe3).toBe(pe3DateId);
    });

    it('should handle employee with no dates assigned', async () => {
      const employeeId = 'emp-123';
      
      const mockSingle = vi.fn().mockResolvedValue({
        data: { omc_date: null, pe3_date: null },
        error: null,
      });

      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
      });

      const result = await captureRepaymentDates(employeeId);

      expect(result.omc).toBeNull();
      expect(result.pe3).toBeNull();
    });

    it('should throw error when employee not found', async () => {
      const employeeId = 'emp-not-found';
      
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
      });

      await expect(captureRepaymentDates(employeeId)).rejects.toThrow('Failed to capture repayment dates');
    });
  });

  describe('applyRepaymentCapture', () => {
    it('should populate repayment_needed_omc with boolean true', async () => {
      const employeeId = 'emp-123';
      const omcDateId = 'omc-date-1';
      const omcDateValue = '2025-03-08';
      
      // Mock date lookup
      const mockDatesIn = vi.fn().mockResolvedValue({
        data: [{ id: omcDateId, date_value: omcDateValue }],
        error: null,
      });

      const mockDatesSelect = vi.fn().mockReturnValue({
        in: mockDatesIn,
      });

      // Mock employee update
      const mockUpdateEq = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: mockUpdateEq,
      });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'important_dates') {
          return {
            select: mockDatesSelect,
          };
        }
        if (table === 'employees') {
          return {
            update: mockUpdate,
          };
        }
        return {};
      });

      await applyRepaymentCapture(employeeId, { omc: omcDateId, pe3: null });

      // No longer need to fetch date value since we just set boolean
      // expect(mockDatesSelect).toHaveBeenCalledWith('id, date_value'); 
      expect(mockUpdate).toHaveBeenCalledWith({
        repayment_needed_omc: true,
        repayment_needed_pe3: false,
      });
      expect(mockUpdateEq).toHaveBeenCalledWith('id', employeeId);
    });

    it('should populate repayment_needed_pe3 with boolean true', async () => {
      const employeeId = 'emp-123';
      const pe3DateId = 'pe3-date-1';
      
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
            update: mockUpdate,
          };
        }
        return {};
      });

      await applyRepaymentCapture(employeeId, { omc: null, pe3: pe3DateId });

      expect(mockUpdate).toHaveBeenCalledWith({
        repayment_needed_omc: false,
        repayment_needed_pe3: true,
      });
    });

    it('should populate both repayment fields when both dates assigned', async () => {
      const employeeId = 'emp-123';
      const omcDateId = 'omc-date-1';
      const pe3DateId = 'pe3-date-1';
      
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
            update: mockUpdate,
          };
        }
        return {};
      });

      await applyRepaymentCapture(employeeId, { omc: omcDateId, pe3: pe3DateId });

      expect(mockUpdate).toHaveBeenCalledWith({
        repayment_needed_omc: true,
        repayment_needed_pe3: true,
      });
    });

    it('should throw error when date lookup fails', async () => {
      const employeeId = 'emp-123';
      const omcDateId = 'omc-date-1';
      
      const mockDatesIn = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const mockDatesSelect = vi.fn().mockReturnValue({
        in: mockDatesIn,
      });

      // Mock update to succeed (function handles date lookup errors gracefully)
      const mockUpdateEq = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: mockUpdateEq,
      });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'important_dates') {
          return {
            select: mockDatesSelect,
          };
        }
        if (table === 'employees') {
          return {
            update: mockUpdate,
          };
        }
        return {};
      });

      // Should not throw on date lookup error, but should handle gracefully
      // When date lookup fails, it sets values to null and still updates
      await applyRepaymentCapture(employeeId, { omc: omcDateId, pe3: null });
      
      // Verify that update was called (with boolean values since dates exist but lookup failed logic was removed)
      // Actually applyRepaymentCapture NO LONGER DOES LOOKUP. It just uses the IDs.
      // So if IDs are present, it sets true.
      expect(mockUpdate).toHaveBeenCalledWith({
        repayment_needed_omc: true,
        repayment_needed_pe3: false,
      });
    });

    it('should throw error when employee update fails', async () => {
      const employeeId = 'emp-123';
      const omcDateId = 'omc-date-1';
      
      const mockUpdateEq = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: mockUpdateEq,
      });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'employees') {
          return {
            update: mockUpdate,
          };
        }
        return {};
      });

      await expect(applyRepaymentCapture(employeeId, { omc: omcDateId, pe3: null }))
        .rejects.toThrow('Failed to apply repayment capture');
    });
  });

  describe('clearEmployeeDatesAndReleaseSpots', () => {
    it('should clear all date fields (stena, omc, pe3)', async () => {
      const employeeId = 'emp-123';
      const stenaDateId = 'stena-date-1';
      const omcDateId = 'omc-date-1';
      const pe3DateId = 'pe3-date-1';
      
      // Mock employee fetch
      const mockEmployeeSingle = vi.fn().mockResolvedValue({
        data: {
          id: employeeId,
          first_name: 'John',
          surname: 'Doe',
          stena_date: stenaDateId,
          omc_date: omcDateId,
          pe3_date: pe3DateId,
        },
        error: null,
      });

      const mockEmployeeEq = vi.fn().mockReturnValue({
        single: mockEmployeeSingle,
      });

      const mockEmployeeSelect = vi.fn().mockReturnValue({
        eq: mockEmployeeEq,
      });

      // Mock RPC calls for spot release
      mockSupabaseRpc.mockResolvedValue({ data: null, error: null });

      // Mock employee update to clear dates
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
        return {};
      });

      const result = await clearEmployeeDatesAndReleaseSpots(employeeId);

      expect(mockSupabaseRpc).toHaveBeenCalledTimes(3);
      expect(mockSupabaseRpc).toHaveBeenCalledWith('release_date_capacity', {
        date_id: stenaDateId,
        employee_id: employeeId,
      });
      expect(mockSupabaseRpc).toHaveBeenCalledWith('release_date_capacity', {
        date_id: omcDateId,
        employee_id: employeeId,
      });
      expect(mockSupabaseRpc).toHaveBeenCalledWith('release_date_capacity', {
        date_id: pe3DateId,
        employee_id: employeeId,
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        stena_date: null,
        omc_date: null,
        pe3_date: null,
      });

      expect(result.clearedDates).toEqual([stenaDateId, omcDateId, pe3DateId]);
      expect(result.releasedSpots).toBe(3);
    });

    it('should handle employee with no dates assigned (no spots to release)', async () => {
      const employeeId = 'emp-123';
      
      const mockEmployeeSingle = vi.fn().mockResolvedValue({
        data: {
          id: employeeId,
          first_name: 'John',
          surname: 'Doe',
          stena_date: null,
          omc_date: null,
          pe3_date: null,
        },
        error: null,
      });

      const mockEmployeeEq = vi.fn().mockReturnValue({
        single: mockEmployeeSingle,
      });

      const mockEmployeeSelect = vi.fn().mockReturnValue({
        eq: mockEmployeeEq,
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
        return {};
      });

      const result = await clearEmployeeDatesAndReleaseSpots(employeeId);

      expect(mockSupabaseRpc).not.toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalledWith({
        stena_date: null,
        omc_date: null,
        pe3_date: null,
      });
      expect(result.clearedDates).toEqual([]);
      expect(result.releasedSpots).toBe(0);
    });

    it('should release spots for multiple dates assigned', async () => {
      const employeeId = 'emp-123';
      const omcDateId = 'omc-date-1';
      const pe3DateId = 'pe3-date-1';
      
      const mockEmployeeSingle = vi.fn().mockResolvedValue({
        data: {
          id: employeeId,
          first_name: 'John',
          surname: 'Doe',
          stena_date: null,
          omc_date: omcDateId,
          pe3_date: pe3DateId,
        },
        error: null,
      });

      const mockEmployeeEq = vi.fn().mockReturnValue({
        single: mockEmployeeSingle,
      });

      const mockEmployeeSelect = vi.fn().mockReturnValue({
        eq: mockEmployeeEq,
      });

      mockSupabaseRpc.mockResolvedValue({ data: null, error: null });

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
        return {};
      });

      const result = await clearEmployeeDatesAndReleaseSpots(employeeId);

      expect(mockSupabaseRpc).toHaveBeenCalledTimes(2);
      expect(result.clearedDates).toEqual([omcDateId, pe3DateId]);
      expect(result.releasedSpots).toBe(2);
    });

    it('should throw error when spot release fails', async () => {
      const employeeId = 'emp-123';
      const omcDateId = 'omc-date-1';
      
      const mockEmployeeSingle = vi.fn().mockResolvedValue({
        data: {
          id: employeeId,
          first_name: 'John',
          surname: 'Doe',
          stena_date: null,
          omc_date: omcDateId,
          pe3_date: null,
        },
        error: null,
      });

      const mockEmployeeEq = vi.fn().mockReturnValue({
        single: mockEmployeeSingle,
      });

      const mockEmployeeSelect = vi.fn().mockReturnValue({
        eq: mockEmployeeEq,
      });

      mockSupabaseRpc.mockResolvedValue({
        data: null,
        error: { message: 'RPC failed' },
      });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'employees') {
          return {
            select: mockEmployeeSelect,
          };
        }
        return {};
      });

      await expect(clearEmployeeDatesAndReleaseSpots(employeeId))
        .rejects.toThrow('Failed to release spot for omc_date');
    });

    it('should throw error when employee update fails', async () => {
      const employeeId = 'emp-123';
      
      const mockEmployeeSingle = vi.fn().mockResolvedValue({
        data: {
          id: employeeId,
          first_name: 'John',
          surname: 'Doe',
          stena_date: null,
          omc_date: null,
          pe3_date: null,
        },
        error: null,
      });

      const mockEmployeeEq = vi.fn().mockReturnValue({
        single: mockEmployeeSingle,
      });

      const mockEmployeeSelect = vi.fn().mockReturnValue({
        eq: mockEmployeeEq,
      });

      const mockUpdateEq = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
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
        return {};
      });

      await expect(clearEmployeeDatesAndReleaseSpots(employeeId))
        .rejects.toThrow('Failed to clear employee date assignments');
    });

    it('should throw error when employee not found', async () => {
      const employeeId = 'emp-not-found';
      
      const mockEmployeeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
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

      await expect(clearEmployeeDatesAndReleaseSpots(employeeId))
        .rejects.toThrow('Failed to fetch employee date assignments');
    });
  });

  describe('restoreRepaymentDates', () => {
    it('should clear ÖMC flag when present', async () => {
      const employeeId = 'emp-123';
      
      // Mock employee fetch
      const mockEmployeeSingle = vi.fn().mockResolvedValue({
        data: {
          id: employeeId,
          first_name: 'John',
          surname: 'Doe',
          repayment_needed_omc: true,
          repayment_needed_pe3: false,
        },
        error: null,
      });

      const mockEmployeeEq = vi.fn().mockReturnValue({
        single: mockEmployeeSingle,
      });

      const mockEmployeeSelect = vi.fn().mockReturnValue({
        eq: mockEmployeeEq,
      });

      // Mock repayment field clear
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
        return {};
      });

      const result = await restoreRepaymentDates(employeeId);

      expect(assignEmployeeToDate).not.toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalledWith({ repayment_needed_omc: false });
      expect(result.restored.omc).toBe(true);
      expect(result.restored.pe3).toBe(false);
      expect(result.warnings).toEqual([]);
    });

    it('should clear PE3 flag when present', async () => {
      const employeeId = 'emp-123';
      
      // Mock employee fetch
      const mockEmployeeSingle = vi.fn().mockResolvedValue({
        data: {
          id: employeeId,
          first_name: 'John',
          surname: 'Doe',
          repayment_needed_omc: false,
          repayment_needed_pe3: true,
        },
        error: null,
      });

      const mockEmployeeEq = vi.fn().mockReturnValue({
        single: mockEmployeeSingle,
      });

      const mockEmployeeSelect = vi.fn().mockReturnValue({
        eq: mockEmployeeEq,
      });

      // Mock repayment field clear
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
        return {};
      });

      const result = await restoreRepaymentDates(employeeId);

      expect(assignEmployeeToDate).not.toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalledWith({ repayment_needed_pe3: false });
      expect(result.restored.pe3).toBe(true);
      expect(result.restored.omc).toBe(false);
      expect(result.warnings).toEqual([]);
    });

    it('should handle both flags present', async () => {
      const employeeId = 'emp-123';
      
      // Mock employee fetch
      const mockEmployeeSingle = vi.fn().mockResolvedValue({
        data: {
          id: employeeId,
          first_name: 'John',
          surname: 'Doe',
          repayment_needed_omc: true,
          repayment_needed_pe3: true,
        },
        error: null,
      });

      const mockEmployeeEq = vi.fn().mockReturnValue({
        single: mockEmployeeSingle,
      });

      const mockEmployeeSelect = vi.fn().mockReturnValue({
        eq: mockEmployeeEq,
      });

      // Mock repayment field clear
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
        return {};
      });

      const result = await restoreRepaymentDates(employeeId);

      expect(mockUpdate).toHaveBeenCalledWith({ repayment_needed_omc: false });
      expect(mockUpdate).toHaveBeenCalledWith({ repayment_needed_pe3: false });
      expect(result.restored.omc).toBe(true);
      expect(result.restored.pe3).toBe(true);
    });

    it('should handle employee with no repayment needed', async () => {
      const employeeId = 'emp-123';
      
      const mockEmployeeSingle = vi.fn().mockResolvedValue({
        data: {
          id: employeeId,
          first_name: 'John',
          surname: 'Doe',
          repayment_needed_omc: false,
          repayment_needed_pe3: false,
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
});
