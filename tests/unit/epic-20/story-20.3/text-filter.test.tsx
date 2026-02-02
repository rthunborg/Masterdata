/**
 * Unit Tests for TextFilter Component
 * Story 20.3: Filter Controls by Column Type
 * 
 * Tests verify:
 * 1. Component renders with search input
 * 2. Input has correct placeholder text
 * 3. onChange is debounced by 300ms
 * 4. Clear button appears when text is entered
 * 5. Clear button calls onClear handler
 * 6. Local state updates immediately for user feedback
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextFilter } from '@/components/dashboard/FilterPanel';
import type { ColumnConfig } from '@/lib/types/column-config';


vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    pathname: "/dashboard",
  }),
  useSearchParams: () => ({
    get: vi.fn(),
    toString: vi.fn(() => ""),
  }),
  usePathname: () => "/dashboard",
}));

describe('Story 20.3: TextFilter', () => {
  const mockColumn: ColumnConfig = {
    id: 'col-1',
    column_name: 'First Name',
    db_column_name: 'first_name',
    column_type: 'text',
    role_permissions: {},
    is_masterdata: true,
    category: null,
    category_color: null,
    display_order: 1,
    is_visible: true,
    is_checklist_item: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should render search input with correct placeholder', () => {
    render(
      <TextFilter
        column={mockColumn}
        value=""
        onChange={vi.fn()}
        onClear={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText('Search First Name...');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'text');
  });

  it('should display current value in input', () => {
    render(
      <TextFilter
        column={mockColumn}
        value="John"
        onChange={vi.fn()}
        onClear={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText('Search First Name...');
    expect(input).toHaveValue('John');
  });

  it('should debounce onChange by 300ms', async () => {
    const handleChange = vi.fn();

    render(
      <TextFilter
        column={mockColumn}
        value=""
        onChange={handleChange}
        onClear={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText('Search First Name...') as HTMLInputElement;
    
    // Simulate typing quickly using fireEvent
    await act(async () => {
      fireEvent.change(input, { target: { value: 'J' } });
      fireEvent.change(input, { target: { value: 'Jo' } });
      fireEvent.change(input, { target: { value: 'Joh' } });
      fireEvent.change(input, { target: { value: 'John' } });
    });

    // onChange should not be called yet
    expect(handleChange).not.toHaveBeenCalled();

    // Fast-forward time by 300ms
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    // Now onChange should be called once with final value
    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith('John');
  });

  it('should show clear button when text is entered', async () => {
    render(
      <TextFilter
        column={mockColumn}
        value=""
        onChange={vi.fn()}
        onClear={vi.fn()}
      />
    );

    // Initially no clear button
    expect(screen.queryByTestId(`text-filter-clear-${mockColumn.db_column_name}`)).not.toBeInTheDocument();

    // Type some text
    const input = screen.getByPlaceholderText('Search First Name...') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { value: 'John' } });
      await vi.advanceTimersByTimeAsync(0);
    });

    // Clear button should appear
    expect(screen.getByTestId(`text-filter-clear-${mockColumn.db_column_name}`)).toBeInTheDocument();
  });

  it('should call onClear when clear button is clicked', async () => {
    const handleClear = vi.fn();

    render(
      <TextFilter
        column={mockColumn}
        value="John"
        onChange={vi.fn()}
        onClear={handleClear}
      />
    );

    const clearButton = screen.getByTestId(`text-filter-clear-${mockColumn.db_column_name}`);
    clearButton.click();

    await vi.advanceTimersByTimeAsync(0);

    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it('should clear local value when clear button is clicked', async () => {
    render(
      <TextFilter
        column={mockColumn}
        value="John"
        onChange={vi.fn()}
        onClear={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText('Search First Name...') as HTMLInputElement;
    expect(input.value).toBe('John');

    const clearButton = screen.getByTestId(`text-filter-clear-${mockColumn.db_column_name}`);
    clearButton.click();

    await vi.advanceTimersByTimeAsync(0);

    expect(input.value).toBe('');
  });

  it('should update local value immediately for user feedback', async () => {
    const handleChange = vi.fn();

    render(
      <TextFilter
        column={mockColumn}
        value=""
        onChange={handleChange}
        onClear={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText('Search First Name...') as HTMLInputElement;
    
    // Type a character
    await act(async () => {
      fireEvent.change(input, { target: { value: 'J' } });
      await vi.advanceTimersByTimeAsync(0);
    });

    // Input should update immediately (not debounced)
    expect(input.value).toBe('J');

    // But onChange should not be called yet (300ms debounce)
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('should cancel debounce on unmount', async () => {
    const handleChange = vi.fn();

    const { unmount } = render(
      <TextFilter
        column={mockColumn}
        value=""
        onChange={handleChange}
        onClear={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText('Search First Name...') as HTMLInputElement;
    
    await act(async () => {
      fireEvent.change(input, { target: { value: 'John' } });
    });

    // Unmount before debounce fires
    unmount();

    // Fast-forward time
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    // onChange should not be called after unmount
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('should have accessible aria-label', () => {
    render(
      <TextFilter
        column={mockColumn}
        value=""
        onChange={vi.fn()}
        onClear={vi.fn()}
      />
    );

    const input = screen.getByLabelText('Filter First Name');
    expect(input).toBeInTheDocument();
  });
});
