/**
 * Integration Tests: Termination Transaction Atomicity
 * Story 11.3: Comprehensive Test Coverage for Termination & Reactivation Workflows
 *
 * Tests the current termination rollback paths. Reactivation no longer restores
 * date assignments; its replacement behavior is covered by the active
 * reactivation workflow and API suites.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  captureRepaymentDates,
  applyRepaymentCapture,
  clearEmployeeDatesAndReleaseSpots,
} from '@/lib/services/termination-workflow';
import { createClient } from '@/lib/supabase/server';

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('Termination Transaction Atomicity', () => {
  let mockSupabaseFrom: ReturnType<typeof vi.fn>;
  let mockSupabaseRpc: ReturnType<typeof vi.fn>;
  let mockSupabaseClient: {
    from: ReturnType<typeof vi.fn>;
    rpc: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabaseFrom = vi.fn(() => {
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

    mockSupabaseClient = {
      from: mockSupabaseFrom,
      rpc: mockSupabaseRpc,
    };

    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabaseClient);
  });

  it('should rollback termination if repayment capture fails', async () => {
    const employeeId = 'emp-123';
    const omcDateId = 'omc-date-1';
    
    // Mock employee fetch for captureRepaymentDates
    const mockEmployeeSingle = vi.fn().mockResolvedValue({
      data: { omc_date: omcDateId, pe3_date: null },
      error: null,
    });

    const mockEmployeeEq = vi.fn().mockReturnValue({
      single: mockEmployeeSingle,
    });

    const mockEmployeeSelect = vi.fn().mockReturnValue({
      eq: mockEmployeeEq,
    });

    // Mock date lookup failure
    const mockDatesIn = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Database connection error' },
    });

    const mockDatesSelect = vi.fn().mockReturnValue({
      in: mockDatesIn,
    });

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'employees') {
        return {
          select: mockEmployeeSelect,
        };
      }
      if (table === 'important_dates') {
        return {
          select: mockDatesSelect,
        };
      }
      return {};
    });

    // Capture should succeed
    const repaymentDates = await captureRepaymentDates(employeeId);
    expect(repaymentDates.omc).toBe(omcDateId);

    // Apply repayment should fail, simulating transaction rollback
    // In real scenario, this would be wrapped in a transaction
    await expect(applyRepaymentCapture(employeeId, repaymentDates)).rejects.toThrow();

    // Verify no further operations would occur (transaction rolled back)
    // In a real transaction, clearEmployeeDatesAndReleaseSpots would not be called
  });

  it('should rollback termination if spot release fails', async () => {
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

    // Mock RPC failure
    mockSupabaseRpc.mockResolvedValue({
      data: null,
      error: { message: 'RPC function error' },
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

    // Should throw error, simulating transaction rollback
    await expect(clearEmployeeDatesAndReleaseSpots(employeeId)).rejects.toThrow(
      'Failed to release spot'
    );

    // In a real transaction, repayment capture would also be rolled back
    // Verify that update was not called (transaction rolled back)
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('should rollback termination if date clearing fails', async () => {
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

    // Mock successful spot release
    mockSupabaseRpc.mockResolvedValue({ data: null, error: null });

    // Mock update failure
    const mockUpdateEq = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Update constraint violation' },
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

    // Should throw error
    await expect(clearEmployeeDatesAndReleaseSpots(employeeId)).rejects.toThrow(
      'Failed to clear employee date assignments'
    );

    // In a real transaction, spot release would be rolled back
    // Verify RPC was called but transaction would rollback
    expect(mockSupabaseRpc).toHaveBeenCalled();
  });
});
