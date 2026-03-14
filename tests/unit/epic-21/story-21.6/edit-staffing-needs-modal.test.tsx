import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { z } from 'zod';
import { toast } from 'sonner';
import { EditStaffingNeedsModal } from '@/components/dashboard/edit-staffing-needs-modal';
import type { StaffingNeedWithProgress } from '@/lib/types/staffing-needs';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mirror the component's form schema for direct validation tests
const editStaffingNeedsFormSchema = z.object({
  trelleborg: z
    .number({ invalid_type_error: 'Måste vara ett tal' })
    .int({ message: 'Måste vara ett heltal' })
    .min(0, { message: 'Måste vara 0 eller högre' }),
  goteborg: z
    .number({ invalid_type_error: 'Måste vara ett tal' })
    .int({ message: 'Måste vara ett heltal' })
    .min(0, { message: 'Måste vara 0 eller högre' }),
});

const currentNeeds: StaffingNeedWithProgress[] = [
  {
    id: '1',
    location: 'Trelleborg',
    headcount_need: 30,
    updated_at: '2026-03-10T14:30:00Z',
    updated_by: 'user-1',
    crewReadyCount: 13,
    crewReadyPercentage: 43.33,
    last_change: null,
  },
  {
    id: '2',
    location: 'Göteborg',
    headcount_need: 20,
    updated_at: '2026-03-09T10:00:00Z',
    updated_by: 'user-2',
    crewReadyCount: 18,
    crewReadyPercentage: 90,
    last_change: null,
  },
];

/** Helper to set a number input value reliably in jsdom */
function setInputValue(input: HTMLInputElement, value: string) {
  fireEvent.change(input, { target: { value } });
}

describe('EditStaffingNeedsModal', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    currentNeeds,
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
    defaultProps.onOpenChange = vi.fn();
    defaultProps.onSuccess = vi.fn();
  });

  it('renders modal with title "Uppdatera bemanningsbehov"', () => {
    render(<EditStaffingNeedsModal {...defaultProps} />);
    expect(screen.getByText('Uppdatera bemanningsbehov')).toBeInTheDocument();
  });

  it('renders two inputs pre-filled with current values', () => {
    render(<EditStaffingNeedsModal {...defaultProps} />);

    const trelleborgInput = screen.getByLabelText('Trelleborg');
    const goteborgInput = screen.getByLabelText('Göteborg');

    expect(trelleborgInput).toHaveValue(30);
    expect(goteborgInput).toHaveValue(20);
  });

  it('calls PUT only for changed location when one value changes', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);

    render(<EditStaffingNeedsModal {...defaultProps} />);

    const trelleborgInput = screen.getByLabelText('Trelleborg') as HTMLInputElement;
    setInputValue(trelleborgInput, '35');
    await user.click(screen.getByRole('button', { name: 'Spara' }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith('/api/staffing-needs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: 'Trelleborg', headcount_need: 35 }),
      });
    });
  });

  it('calls PUT for both locations when both values change', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);

    render(<EditStaffingNeedsModal {...defaultProps} />);

    setInputValue(screen.getByLabelText('Trelleborg') as HTMLInputElement, '35');
    setInputValue(screen.getByLabelText('Göteborg') as HTMLInputElement, '25');
    await user.click(screen.getByRole('button', { name: 'Spara' }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });

  it('shows success toast and closes on successful save', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);

    render(<EditStaffingNeedsModal {...defaultProps} />);

    setInputValue(screen.getByLabelText('Trelleborg') as HTMLInputElement, '35');
    await user.click(screen.getByRole('button', { name: 'Spara' }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Bemanningsbehov uppdaterat');
      expect(defaultProps.onSuccess).toHaveBeenCalled();
      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('shows error toast on save failure and keeps modal open', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({}),
    } as Response);

    render(<EditStaffingNeedsModal {...defaultProps} />);

    setInputValue(screen.getByLabelText('Trelleborg') as HTMLInputElement, '35');
    await user.click(screen.getByRole('button', { name: 'Spara' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Kunde inte uppdatera bemanningsbehov');
    });
    // Modal should NOT have closed
    expect(defaultProps.onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('rejects negative numbers via validation schema', () => {
    const result = editStaffingNeedsFormSchema.safeParse({ trelleborg: -5, goteborg: 10 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const trelleborgErrors = result.error.issues.filter(i => i.path.includes('trelleborg'));
      expect(trelleborgErrors[0].message).toBe('Måste vara 0 eller högre');
    }
  });

  it('rejects non-integer (decimal) values via validation schema', () => {
    const result = editStaffingNeedsFormSchema.safeParse({ trelleborg: 3.5, goteborg: 10 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const trelleborgErrors = result.error.issues.filter(i => i.path.includes('trelleborg'));
      expect(trelleborgErrors[0].message).toBe('Måste vara ett heltal');
    }
  });

  it('closes modal without saving when clicking Avbryt', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    render(<EditStaffingNeedsModal {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Avbryt' }));

    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('disables Spara button during save', async () => {
    const user = userEvent.setup();
    let resolvePromise: (value: Response) => void;
    vi.spyOn(globalThis, 'fetch').mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      })
    );

    render(<EditStaffingNeedsModal {...defaultProps} />);

    setInputValue(screen.getByLabelText('Trelleborg') as HTMLInputElement, '35');

    const saveButton = screen.getByRole('button', { name: 'Spara' });
    await user.click(saveButton);

    await waitFor(() => {
      const submitBtn = screen.getByTestId('save-button');
      expect(submitBtn).toBeDisabled();
    });

    // Resolve the fetch
    resolvePromise!({ ok: true, json: async () => ({}) } as Response);

    await waitFor(() => {
      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('closes modal without API calls when no values changed', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    render(<EditStaffingNeedsModal {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Spara' }));

    await waitFor(() => {
      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
