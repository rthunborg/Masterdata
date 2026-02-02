/**
 * Unit Tests for BooleanFilter Component
 * Story 20.3: Filter Controls by Column Type
 * 
 * Tests verify:
 * 1. Component renders three radio options (Either, Yes, No)
 * 2. "Either" is selected by default when value is null
 * 3. Correct option is selected based on value prop
 * 4. onChange is called with true when "Yes" is selected
 * 5. onChange is called with false when "No" is selected
 * 6. onChange is called with null when "Either" is selected
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BooleanFilter } from '@/components/dashboard/FilterPanel';
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

describe('Story 20.3: BooleanFilter', () => {
  const mockColumn: ColumnConfig = {
    id: 'col-1',
    column_name: 'Hotel Required',
    db_column_name: 'hotel_required',
    column_type: 'boolean',
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

  it('should render three radio options', () => {
    render(
      <BooleanFilter
        column={mockColumn}
        value={null}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Either')).toBeInTheDocument();
    expect(screen.getByLabelText('Yes')).toBeInTheDocument();
    expect(screen.getByLabelText('No')).toBeInTheDocument();
  });

  it('should select "Either" when value is null', () => {
    render(
      <BooleanFilter
        column={mockColumn}
        value={null}
        onChange={vi.fn()}
      />
    );

    const eitherRadio = screen.getByTestId(`boolean-filter-either-${mockColumn.db_column_name}`);
    expect(eitherRadio).toBeChecked();
  });

  it('should select "Yes" when value is true', () => {
    render(
      <BooleanFilter
        column={mockColumn}
        value={true}
        onChange={vi.fn()}
      />
    );

    const yesRadio = screen.getByTestId(`boolean-filter-yes-${mockColumn.db_column_name}`);
    expect(yesRadio).toBeChecked();
  });

  it('should select "No" when value is false', () => {
    render(
      <BooleanFilter
        column={mockColumn}
        value={false}
        onChange={vi.fn()}
      />
    );

    const noRadio = screen.getByTestId(`boolean-filter-no-${mockColumn.db_column_name}`);
    expect(noRadio).toBeChecked();
  });

  it('should call onChange with true when "Yes" is selected', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(
      <BooleanFilter
        column={mockColumn}
        value={null}
        onChange={handleChange}
      />
    );

    const yesLabel = screen.getByText('Yes');
    await user.click(yesLabel);

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('should call onChange with false when "No" is selected', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(
      <BooleanFilter
        column={mockColumn}
        value={null}
        onChange={handleChange}
      />
    );

    const noLabel = screen.getByText('No');
    await user.click(noLabel);

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(false);
  });

  it('should call onChange with null when "Either" is selected', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(
      <BooleanFilter
        column={mockColumn}
        value={true}
        onChange={handleChange}
      />
    );

    const eitherLabel = screen.getByText('Either');
    await user.click(eitherLabel);

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(null);
  });

  it('should switch between options correctly', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    const { rerender } = render(
      <BooleanFilter
        column={mockColumn}
        value={null}
        onChange={handleChange}
      />
    );

    // Click Yes
    await user.click(screen.getByText('Yes'));
    expect(handleChange).toHaveBeenCalledWith(true);

    // Rerender with new value
    rerender(
      <BooleanFilter
        column={mockColumn}
        value={true}
        onChange={handleChange}
      />
    );

    // Click No
    await user.click(screen.getByText('No'));
    expect(handleChange).toHaveBeenCalledWith(false);

    // Rerender with new value
    rerender(
      <BooleanFilter
        column={mockColumn}
        value={false}
        onChange={handleChange}
      />
    );

    // Click Either
    await user.click(screen.getByText('Either'));
    expect(handleChange).toHaveBeenCalledWith(null);
  });

  it('should have accessible aria-label on radio group', () => {
    render(
      <BooleanFilter
        column={mockColumn}
        value={null}
        onChange={vi.fn()}
      />
    );

    // The RadioGroup should have an aria-label
    const radioGroup = screen.getByRole('radiogroup');
    expect(radioGroup).toHaveAttribute('aria-label', 'Filter Hotel Required');
  });

  it('should render with correct test IDs', () => {
    render(
      <BooleanFilter
        column={mockColumn}
        value={null}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByTestId(`boolean-filter-${mockColumn.db_column_name}`)).toBeInTheDocument();
    expect(screen.getByTestId(`boolean-filter-either-${mockColumn.db_column_name}`)).toBeInTheDocument();
    expect(screen.getByTestId(`boolean-filter-yes-${mockColumn.db_column_name}`)).toBeInTheDocument();
    expect(screen.getByTestId(`boolean-filter-no-${mockColumn.db_column_name}`)).toBeInTheDocument();
  });
});
