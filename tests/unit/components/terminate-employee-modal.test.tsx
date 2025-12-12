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
import { SupabaseClient } from '@supabase/supabase-js';
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
    town_district: 'Göteborg',
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
    from: vi.fn(),
  } as unknown as SupabaseClient;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock that returns empty data
    const defaultSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: defaultSingle,
        })),
      })),
    });
    
    vi.mocked(createClient).mockReturnValue(mockSupabaseClient);
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

    expect(screen.getByText(/markera anställd som uppsagd/i)).toBeInTheDocument();
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
      // May appear multiple times (in description and preview), so use getAllByText
      expect(screen.getAllByText(/Stena Training/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/ÖMC Training/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/PE3 Training/i).length).toBeGreaterThan(0);
    });
  });

  it('should display repayment fields preview', async () => {
    // Mock employee with repayment dates set (for repayment preview)
    const employeeWithRepayment = {
      ...mockEmployee,
      repayment_needed_omc: true,
      repayment_needed_pe3: true,
    };

    const mockSingle = vi.fn()
      .mockResolvedValueOnce({ data: null, error: null }) // stena_date
      .mockResolvedValueOnce({
        data: {
          date_description: 'ÖMC Training 8-9 mars',
          date_value: '2025-03-08',
          remaining_spots: 10,
        },
        error: null,
      }) // omc_date
      .mockResolvedValueOnce({
        data: {
          date_description: 'PE3 Training',
          date_value: '2025-04-20',
          remaining_spots: 3,
        },
        error: null,
      }); // pe3_date

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mockSingle,
        })),
      })),
    } as never);

    renderWithI18n(
      <TerminateEmployeeModal
        employee={employeeWithRepayment}
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    // Wait for async date fetching and repayment preview to render
    await waitFor(() => {
      // May appear multiple times, so use getAllByText
      const repaymentTexts = screen.getAllByText(/återbetalning/i);
      expect(repaymentTexts.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it('should display spots to be released', async () => {
    const mockSingle = vi.fn()
      .mockResolvedValueOnce({ data: null, error: null }) // stena_date (not assigned in mockEmployee)
      .mockResolvedValueOnce({
        data: {
          date_description: 'ÖMC Training',
          date_value: '2025-03-08',
          remaining_spots: 5,
        },
        error: null,
      }) // omc_date
      .mockResolvedValueOnce({
        data: {
          date_description: 'PE3 Training',
          date_value: '2025-04-20',
          remaining_spots: 3,
        },
        error: null,
      }); // pe3_date

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

    // Wait for async date fetching and spots preview to render
    await waitFor(() => {
      // May appear multiple times (once per date), so use getAllByText
      const spotsTexts = screen.getAllByText(/platser/i);
      expect(spotsTexts.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it('should show loading state during async operations', async () => {
    const user = userEvent.setup();
    let resolveTermination: (value: { employee: Employee; clearedDates: string[]; releasedSpots: number }) => void;
    
    vi.mocked(employeeService.terminate).mockImplementation(
      () => new Promise((resolve) => {
        resolveTermination = resolve;
      })
    );

    renderWithI18n(
      <TerminateEmployeeModal
        employee={mockEmployee}
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    const dateInput = screen.getByLabelText(/uppsägningsdatum/i);
    const reasonInput = screen.getByLabelText(/uppsägningsorsak/i);
    const submitButton = screen.getByRole('button', { name: /bekräfta uppsägning/i });

    await user.type(dateInput, '2025-11-13');
    await user.type(reasonInput, 'Test reason');

    await user.click(submitButton);

    // Button should be disabled during submission
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
    
    // Complete the operation
    resolveTermination!({
      employee: mockEmployee,
      clearedDates: [],
      releasedSpots: 0,
    });

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
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

    const dateInput = screen.getByLabelText(/uppsägningsdatum/i);
    const reasonInput = screen.getByLabelText(/uppsägningsorsak/i);
    const submitButton = screen.getByRole('button', { name: /bekräfta uppsägning/i });

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

    const submitButton = screen.getByRole('button', { name: /bekräfta uppsägning/i });
    await user.click(submitButton);

    await waitFor(() => {
      // Validation error messages - may appear multiple times, so use getAllByText
      const requiredMessages = screen.getAllByText(/required/i);
      expect(requiredMessages.length).toBeGreaterThan(0);
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

    const dateInput = screen.getByLabelText(/uppsägningsdatum/i);
    const reasonInput = screen.getByLabelText(/uppsägningsorsak/i);
    const submitButton = screen.getByRole('button', { name: /bekräfta uppsägning/i });

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

    expect(screen.getByText(/inga datumanmälningar att rensa/i)).toBeInTheDocument();
  });
});

