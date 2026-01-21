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

    // Story 19.14: repayment fields now store UUIDs, not booleans
    // Tests verify clearing sets to null instead of false
    describe('Repayment Tracking Clearing', () => {
      it('should clear ÖMC repayment tracking when UUID is set', async () => {
        const employeeId = 'emp-123';
        const omcDateId = 'omc-date-uuid-1';
        
        const mockEmployeeSingle = vi.fn().mockResolvedValue({
          data: {
            id: employeeId,
            first_name: 'John',
            surname: 'Doe',
            repayment_needed_omc: omcDateId, // UUID instead of boolean
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
        // Story 19.14: Clears with null, not false
        expect(mockUpdate).toHaveBeenCalledWith({ repayment_needed_omc: null });
        expect(result.restored.omc).toBe(true);
        expect(result.warnings).toEqual([]);
      });

      it('should clear PE3 repayment tracking when UUID is set', async () => {
        const employeeId = 'emp-123';
        const pe3DateId = 'pe3-date-uuid-1';
        
        const mockEmployeeSingle = vi.fn().mockResolvedValue({
          data: {
            id: employeeId,
            first_name: 'John',
            surname: 'Doe',
            repayment_needed_omc: null,
            repayment_needed_pe3: pe3DateId, // UUID instead of boolean
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

        const result = await restoreRepaymentDates(employeeId);

        expect(assignEmployeeToDate).not.toHaveBeenCalled();
        // Story 19.14: Clears with null, not false
        expect(mockUpdate).toHaveBeenCalledWith({ repayment_needed_pe3: null });
        expect(result.restored.pe3).toBe(true);
        expect(result.warnings).toEqual([]);
      });

      it('should clear both repayment UUIDs when set', async () => {
        const employeeId = 'emp-123';
        const omcDateId = 'omc-date-uuid-1';
        const pe3DateId = 'pe3-date-uuid-1';
        
        const mockEmployeeSingle = vi.fn().mockResolvedValue({
          data: {
            id: employeeId,
            first_name: 'John',
            surname: 'Doe',
            repayment_needed_omc: omcDateId,
            repayment_needed_pe3: pe3DateId,
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

        const result = await restoreRepaymentDates(employeeId);

        // Story 19.14: Clears with null, not false
        expect(mockUpdate).toHaveBeenCalledWith({ repayment_needed_omc: null });
        expect(mockUpdate).toHaveBeenCalledWith({ repayment_needed_pe3: null });
        expect(result.restored.omc).toBe(true);
        expect(result.restored.pe3).toBe(true);
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
  });


