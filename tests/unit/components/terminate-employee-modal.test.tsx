/**
 * Component Tests: Terminate Employee Modal
 * Story 11.3: Comprehensive Test Coverage for Termination & Reactivation Workflows
 * 
 * Tests UI components for termination workflow:
 * - Modal rendering with employee data
 * - Date preview (current values)
 * - Repayment preview
 * - Spot release preview
 * - Confirmation flow
 * - Loading and error states
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import { TerminateEmployeeModal } from '@/components/dashboard/terminate-employee-modal';
import { employeeService } from '@/lib/services/employee-service';
import { createClient } from '@/lib/supabase/client';
import type { Employee } from '@/lib/types/employee';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('@/lib/services/employee-service', () => ({
  employeeService: {
    terminate: vi.fn(),
  },
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('TerminateEmployeeModal', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnSuccess = vi.fn();

  const mockEmployee: Employee = {
    id: 'emp-123',
    first_name: 'John',
    surname: 'Doe',
    ssn: '123456-7890',
    email: 'john@example.com',
    mobile: '+46701234567',
    rank: 'SEV',
    gender: 'Man',
    town_district: 'Stockholm',
    hire_date: '2025-01-15',
    stena_date: 'stena-date-1',
    omc_date: 'omc-date-1',
    pe3_date: 'pe3-date-1',
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
  };

  const mockSupabaseClient = {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockReturnValue(mockSupabaseClient as never);
  });

  it('should render modal with employee data', () => {
    renderWithI18n(
      <TerminateEmployeeModal
        employee={mockEmployee}
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText(/terminate/i)).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('123456-7890')).toBeInTheDocument();
  });

  it('should display current date values for confirmation', async () => {
    // Mock date info fetch
    const mockSingle = vi.fn()
      .mockResolvedValueOnce({
        data: {
          date_description: 'Stena Training',
          date_value: '2025-02-15',
          remaining_spots: 5,
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          date_description: 'ÖMC Training 8-9 mars',
          date_value: '2025-03-08',
          remaining_spots: 10,
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          date_description: 'PE3 Training',
          date_value: '2025-04-20',
          remaining_spots: 3,
        },
        error: null,
      });

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mockSingle,
        })),
      })),
    } as never);

    renderWithI18n(
      <TerminateEmployeeModal
        employee={mockEmployee}
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Stena Training/i)).toBeInTheDocument();
      expect(screen.getByText(/ÖMC Training/i)).toBeInTheDocument();
      expect(screen.getByText(/PE3 Training/i)).toBeInTheDocument();
    });
  });

  it('should display repayment fields preview', async () => {
    const mockSingle = vi.fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: {
          date_description: 'ÖMC Training 8-9 mars',
          date_value: '2025-03-08',
          remaining_spots: 10,
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          date_description: 'PE3 Training',
          date_value: '2025-04-20',
          remaining_spots: 3,
        },
        error: null,
      });

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mockSingle,
        })),
      })),
    } as never);

    renderWithI18n(
      <TerminateEmployeeModal
        employee={mockEmployee}
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/repayment/i)).toBeInTheDocument();
    });
  });

  it('should display spots to be released', async () => {
    const mockSingle = vi.fn()
      .mockResolvedValueOnce({
        data: {
          date_description: 'ÖMC Training',
          date_value: '2025-03-08',
          remaining_spots: 5,
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          date_description: 'PE3 Training',
          date_value: '2025-04-20',
          remaining_spots: 3,
        },
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: null });

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mockSingle,
        })),
      })),
    } as never);

    renderWithI18n(
      <TerminateEmployeeModal
        employee={mockEmployee}
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/spots/i)).toBeInTheDocument();
    });
  });

  it('should show loading state during async operations', async () => {
    const user = userEvent.setup();
    vi.mocked(employeeService.terminate).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    renderWithI18n(
      <TerminateEmployeeModal
        employee={mockEmployee}
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    const dateInput = screen.getByLabelText(/termination date/i);
    const reasonInput = screen.getByLabelText(/termination reason/i);
    const submitButton = screen.getByRole('button', { name: /confirm/i });

    await user.type(dateInput, '2025-11-13');
    await user.type(reasonInput, 'Test reason');

    await user.click(submitButton);

    // Button should be disabled during submission
    expect(submitButton).toBeDisabled();
  });

  it('should display error messages on failure', async () => {
    const user = userEvent.setup();
    vi.mocked(employeeService.terminate).mockRejectedValue(
      new Error('Termination failed')
    );

    renderWithI18n(
      <TerminateEmployeeModal
        employee={mockEmployee}
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    const dateInput = screen.getByLabelText(/termination date/i);
    const reasonInput = screen.getByLabelText(/termination reason/i);
    const submitButton = screen.getByRole('button', { name: /confirm/i });

    await user.type(dateInput, '2025-11-13');
    await user.type(reasonInput, 'Test reason');
    await user.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Termination failed');
    });
  });

  it('should validate required fields', async () => {
    const user = userEvent.setup();

    renderWithI18n(
      <TerminateEmployeeModal
        employee={mockEmployee}
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    const submitButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/required/i)).toBeInTheDocument();
    });

    expect(employeeService.terminate).not.toHaveBeenCalled();
  });

  it('should call onSuccess after successful termination', async () => {
    const user = userEvent.setup();
    vi.mocked(employeeService.terminate).mockResolvedValue({
      employee: mockEmployee,
      clearedDates: ['omc-date-1'],
      releasedSpots: 1,
    });

    renderWithI18n(
      <TerminateEmployeeModal
        employee={mockEmployee}
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    const dateInput = screen.getByLabelText(/termination date/i);
    const reasonInput = screen.getByLabelText(/termination reason/i);
    const submitButton = screen.getByRole('button', { name: /confirm/i });

    await user.type(dateInput, '2025-11-13');
    await user.type(reasonInput, 'Test reason');
    await user.click(submitButton);

    await waitFor(() => {
      expect(employeeService.terminate).toHaveBeenCalledWith(
        'emp-123',
        '2025-11-13',
        'Test reason'
      );
      expect(toast.success).toHaveBeenCalled();
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('should handle employee with no dates assigned', () => {
    const employeeWithoutDates = {
      ...mockEmployee,
      stena_date: null,
      omc_date: null,
      pe3_date: null,
    };

    renderWithI18n(
      <TerminateEmployeeModal
        employee={employeeWithoutDates}
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText(/no date assignments/i)).toBeInTheDocument();
  });
});

