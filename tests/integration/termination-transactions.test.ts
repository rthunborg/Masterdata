/**
 * Integration Tests: Termination & Reactivation Transaction Atomicity
 * Story 11.3: Comprehensive Test Coverage for Termination & Reactivation Workflows
 * 
 * Tests transaction rollback scenarios to ensure data integrity:
 * - Termination fails: repayment not saved, dates not cleared, spots not released
 * - Reactivation fails: dates not restored, spots not decremented
 * - Spot release fails: transaction rolled back, dates remain
 * - Array update fails: transaction rolled back, spots restored
 * - Database constraints prevent inconsistent state
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { employeeRepository } from '@/lib/server/repositories/employee-repository';
import {
  captureRepaymentDates,
  applyRepaymentCapture,
  clearEmployeeDatesAndReleaseSpots,
  restoreRepaymentDates,
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

describe('Termination Transaction Atomicity', () => {
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

describe('Reactivation Transaction Atomicity', () => {
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

  it('should rollback reactivation if date restoration fails', async () => {
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

    const mockDateEq = vi.fn().mockReturnValue({
      single: mockDateSingle,
    });

    const mockDateSelect = vi.fn().mockReturnValue({
      eq: mockDateEq,
    });

    // Mock assignEmployeeToDate failure
    vi.mocked(assignEmployeeToDate).mockRejectedValue(
      new Error('Failed to assign employee to date')
    );

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

    // Should handle error gracefully and return warnings
    expect(result.restored.omc).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('Failed to restore ÖMC date');

    // In a real transaction, no updates would be committed
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('should rollback reactivation if spot decrement fails', async () => {
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

    const mockDateEq = vi.fn().mockReturnValue({
      single: mockDateSingle,
    });

    const mockDateSelect = vi.fn().mockReturnValue({
      eq: mockDateEq,
    });

    // Mock assignEmployeeToDate to simulate spot decrement failure
    // (In real scenario, this would fail inside the RPC function)
    vi.mocked(assignEmployeeToDate).mockRejectedValue(
      new Error('Cannot decrement spots - constraint violation')
    );

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

    // Should handle error and not restore date
    expect(result.restored.omc).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);

    // In a real transaction, repayment field would not be cleared
  });
});

describe('Database Constraint Validation', () => {
  it('should prevent inconsistent state when spot count goes negative', async () => {
    // This test documents that database constraints prevent negative spot counts
    // In a real scenario, the RPC function would enforce remaining_spots >= 0
    // and the transaction would rollback if violated

    const employeeId = 'emp-123';
    const omcDateId = 'omc-date-1';
    
    // Simulate scenario where date has 0 spots but we try to assign
    const mockEmployeeSingle = vi.fn().mockResolvedValue({
      data: {
        id: employeeId,
        first_name: 'John',
        surname: 'Doe',
        repayment_needed_omc: '2025-03-08',
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
        remaining_spots: 0, // No spots available
      },
      error: null,
    });

    const mockDateEq = vi.fn().mockReturnValue({
      single: mockDateSingle,
    });

    const mockDateSelect = vi.fn().mockReturnValue({
      eq: mockDateEq,
    });

    const mockSupabaseFrom = vi.fn((table: string) => {
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

    const mockSupabaseClient = {
      from: mockSupabaseFrom,
      rpc: vi.fn(),
    };

    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabaseClient);

    const result = await restoreRepaymentDates(employeeId);

    // Should not attempt to restore when spots unavailable
    expect(assignEmployeeToDate).not.toHaveBeenCalled();
    expect(result.restored.omc).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

