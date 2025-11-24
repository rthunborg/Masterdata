/**
 * Component Tests for ÖMC Date Picker
 * Story 11.5: Date Format & Parsing Tests
 * AC3: Component Test Coverage (Date Picker)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OMCDatePicker } from '@/components/dashboard/omc-date-picker';

describe('OMCDatePicker Component', () => {
  it('should display ÖMC date format "8-9 mars 2025"', () => {
    const onChange = vi.fn();
    render(
      <OMCDatePicker
        value="2025-03-08"
        onChange={onChange}
      />
    );

    // Check that the formatted date is displayed
    expect(screen.getByDisplayValue('8-9 mars 2025')).toBeInTheDocument();
  });

  it('should accept multiple input formats', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    
    render(
      <OMCDatePicker
        value=""
        onChange={onChange}
      />
    );

    // Input no longer has placeholder, use ID instead
    const input = screen.getByLabelText(/ÖMC-datum/i) as HTMLInputElement;

    // Test short format
    await user.type(input, '8-9/3');
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('2025-03-08');
    });

    onChange.mockClear();

    // Test Swedish month format
    await user.clear(input);
    await user.type(input, '8-9 mars');
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('2025-03-08');
    });
  });

  it('should validate consecutive days', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    
    render(
      <OMCDatePicker
        value=""
        onChange={onChange}
      />
    );

    // Input no longer has placeholder, use label instead
    const input = screen.getByLabelText(/ÖMC-datum/i) as HTMLInputElement;

    // Try non-consecutive days
    await user.type(input, '8-10/3');
    
    await waitFor(() => {
      // Should show error message
      expect(screen.getByText(/Ogiltigt format/)).toBeInTheDocument();
    });

    // onChange should not be called for invalid input
    expect(onChange).not.toHaveBeenCalled();
  });

  it('should show error for invalid input', async () => {
    const user = userEvent.setup();
    
    render(
      <OMCDatePicker
        value=""
        onChange={vi.fn()}
      />
    );

    // Input no longer has placeholder, use label instead
    const input = screen.getByLabelText(/ÖMC-datum/i) as HTMLInputElement;

    // Type invalid format
    await user.type(input, 'invalid date');
    
    await waitFor(() => {
      expect(screen.getByText(/Ogiltigt format/)).toBeInTheDocument();
    });
  });

  it('should display Swedish month names', () => {
    const onChange = vi.fn();
    render(
      <OMCDatePicker
        value="2025-03-08"
        onChange={onChange}
      />
    );

    // Should show Swedish month name "mars"
    expect(screen.getByDisplayValue(/mars/)).toBeInTheDocument();
  });

  it('should update state on selection', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    
    render(
      <OMCDatePicker
        value=""
        onChange={onChange}
      />
    );

    // Input no longer has placeholder, use label instead
    const input = screen.getByLabelText(/ÖMC-datum/i) as HTMLInputElement;

    await user.type(input, '15-16 mars');
    
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('2025-03-15');
    });
  });

  it('should highlight two-day range in calendar popup', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    
    render(
      <OMCDatePicker
        value="2025-03-08"
        onChange={onChange}
      />
    );

    // When value is provided, button shows the formatted date
    // Use getByRole to get the button specifically
    const button = screen.getByRole('button', { name: /8-9 mars 2025/ });
    expect(button).toBeInTheDocument();
    
    // Should show selected range in the visual representation
    expect(screen.getByText(/✓ Valt intervall:/)).toBeInTheDocument();
    
    // Verify the date appears in multiple places (button and visual representation)
    const dateTexts = screen.getAllByText(/8-9 mars 2025/);
    expect(dateTexts.length).toBeGreaterThanOrEqual(2); // At least in button and visual rep
  });
});

