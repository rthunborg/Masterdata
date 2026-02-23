/**
 * Unit Tests for DateFilter Component
 * Story 20.3: Filter Controls by Column Type
 * 
 * Tests verify:
 * 1. Component renders date range picker (From/To buttons)
 * 2. Component renders list of available dates as checkboxes
 * 3. Date range onChange is called when dates are selected
 * 4. Checkbox onChange is called when dates are checked/unchecked
 * 5. Multiple dates can be selected via checkboxes
 * 6. Clear button clears date range
 * 7. Error message shows when From date is after To date
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateFilter, type ImportantDate } from '@/components/dashboard/FilterPanel';
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

describe('Story 20.3: DateFilter', () => {
  const mockColumn: ColumnConfig = {
    id: 'col-1',
    column_name: 'OMC Date',
    db_column_name: 'omc_date',
    column_type: 'text', // UUID in database, but displayed as date
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

  const mockAvailableDates: ImportantDate[] = [
    {
      id: 'date-1',
      date_value: '2024-01-15T00:00:00Z',
      category: 'OMC',
      capacity: 20,
      booked: 5,
      available: 15,
      is_active: true,
    },
    {
      id: 'date-2',
      date_value: '2024-02-20T00:00:00Z',
      category: 'OMC',
      capacity: 20,
      booked: 10,
      available: 10,
      is_active: true,
    },
    {
      id: 'date-3',
      date_value: '2024-03-25T00:00:00Z',
      category: 'OMC',
      capacity: 20,
      booked: 15,
      available: 5,
      is_active: true,
    },
  ];

  it('should render date range picker with From and To buttons', () => {
    render(
      <DateFilter
        column={mockColumn}
        dateRange={{ from: null, to: null }}
        selectedDateIds={[]}
        availableDates={[]}
        onDateRangeChange={vi.fn()}
        onDateSelectionChange={vi.fn()}
      />
    );

    expect(screen.getByText('Datumintervall')).toBeInTheDocument();
    expect(screen.getByText('Från')).toBeInTheDocument();
    expect(screen.getByText('Till')).toBeInTheDocument();
    expect(screen.getByTestId(`date-filter-from-${mockColumn.db_column_name}`)).toBeInTheDocument();
    expect(screen.getByTestId(`date-filter-to-${mockColumn.db_column_name}`)).toBeInTheDocument();
  });

  it('should show "Pick date" placeholder when no dates selected', () => {
    render(
      <DateFilter
        column={mockColumn}
        dateRange={{ from: null, to: null }}
        selectedDateIds={[]}
        availableDates={[]}
        onDateRangeChange={vi.fn()}
        onDateSelectionChange={vi.fn()}
      />
    );

    const fromButton = screen.getByTestId(`date-filter-from-${mockColumn.db_column_name}`);
    const toButton = screen.getByTestId(`date-filter-to-${mockColumn.db_column_name}`);
    
    expect(fromButton).toHaveTextContent('Välj datum');
    expect(toButton).toHaveTextContent('Välj datum');
  });

  it('should display selected From date', () => {
    const fromDate = new Date('2024-01-15T00:00:00Z');
    
    render(
      <DateFilter
        column={mockColumn}
        dateRange={{ from: fromDate, to: null }}
        selectedDateIds={[]}
        availableDates={[]}
        onDateRangeChange={vi.fn()}
        onDateSelectionChange={vi.fn()}
      />
    );

    const fromButton = screen.getByTestId(`date-filter-from-${mockColumn.db_column_name}`);
    expect(fromButton).toHaveTextContent('Jan 15, 2024');
  });

  it('should display selected To date', () => {
    const toDate = new Date('2024-03-31T00:00:00Z');
    
    render(
      <DateFilter
        column={mockColumn}
        dateRange={{ from: null, to: toDate }}
        selectedDateIds={[]}
        availableDates={[]}
        onDateRangeChange={vi.fn()}
        onDateSelectionChange={vi.fn()}
      />
    );

    const toButton = screen.getByTestId(`date-filter-to-${mockColumn.db_column_name}`);
    expect(toButton).toHaveTextContent('Mar 31, 2024');
  });

  it('should show clear button when date range is set', () => {
    const fromDate = new Date('2024-01-15T00:00:00Z');
    
    render(
      <DateFilter
        column={mockColumn}
        dateRange={{ from: fromDate, to: null }}
        selectedDateIds={[]}
        availableDates={[]}
        onDateRangeChange={vi.fn()}
        onDateSelectionChange={vi.fn()}
      />
    );

    expect(screen.getByTestId(`date-filter-clear-range-${mockColumn.db_column_name}`)).toBeInTheDocument();
  });

  it('should call onDateRangeChange with null values when clear is clicked', async () => {
    const handleDateRangeChange = vi.fn();
    const user = userEvent.setup();
    const fromDate = new Date('2024-01-15T00:00:00Z');
    
    render(
      <DateFilter
        column={mockColumn}
        dateRange={{ from: fromDate, to: null }}
        selectedDateIds={[]}
        availableDates={[]}
        onDateRangeChange={handleDateRangeChange}
        onDateSelectionChange={vi.fn()}
      />
    );

    const clearButton = screen.getByTestId(`date-filter-clear-range-${mockColumn.db_column_name}`);
    await user.click(clearButton);

    expect(handleDateRangeChange).toHaveBeenCalledWith({ from: null, to: null });
  });

  it('should show error when From date is after To date', () => {
    const fromDate = new Date('2024-03-31T00:00:00Z');
    const toDate = new Date('2024-01-15T00:00:00Z');
    
    render(
      <DateFilter
        column={mockColumn}
        dateRange={{ from: fromDate, to: toDate }}
        selectedDateIds={[]}
        availableDates={[]}
        onDateRangeChange={vi.fn()}
        onDateSelectionChange={vi.fn()}
      />
    );

    const errorMessage = screen.getByTestId(`date-filter-error-${mockColumn.db_column_name}`);
    expect(errorMessage).toHaveTextContent('"Från"-datum måste vara före "Till"-datum.');
  });

  it('should render list of available dates as checkboxes', () => {
    render(
      <DateFilter
        column={mockColumn}
        dateRange={{ from: null, to: null }}
        selectedDateIds={[]}
        availableDates={mockAvailableDates}
        onDateRangeChange={vi.fn()}
        onDateSelectionChange={vi.fn()}
      />
    );

    expect(screen.getByText('Eller välj specifika datum:')).toBeInTheDocument();
    expect(screen.getByText(/Jan 15, 2024 - OMC/)).toBeInTheDocument();
    expect(screen.getByText(/Feb 20, 2024 - OMC/)).toBeInTheDocument();
    expect(screen.getByText(/Mar 25, 2024 - OMC/)).toBeInTheDocument();
  });

  it('should call onDateSelectionChange when checkbox is checked', async () => {
    const handleDateSelectionChange = vi.fn();
    const user = userEvent.setup();
    
    render(
      <DateFilter
        column={mockColumn}
        dateRange={{ from: null, to: null }}
        selectedDateIds={[]}
        availableDates={mockAvailableDates}
        onDateRangeChange={vi.fn()}
        onDateSelectionChange={handleDateSelectionChange}
      />
    );

    const checkbox = screen.getByTestId('date-filter-checkbox-date-1');
    await user.click(checkbox);

    expect(handleDateSelectionChange).toHaveBeenCalledWith(['date-1']);
  });

  it('should call onDateSelectionChange when checkbox is unchecked', async () => {
    const handleDateSelectionChange = vi.fn();
    const user = userEvent.setup();
    
    render(
      <DateFilter
        column={mockColumn}
        dateRange={{ from: null, to: null }}
        selectedDateIds={['date-1', 'date-2']}
        availableDates={mockAvailableDates}
        onDateRangeChange={vi.fn()}
        onDateSelectionChange={handleDateSelectionChange}
      />
    );

    const checkbox = screen.getByTestId('date-filter-checkbox-date-1');
    await user.click(checkbox);

    expect(handleDateSelectionChange).toHaveBeenCalledWith(['date-2']);
  });

  it('should allow multiple date selections', async () => {
    const handleDateSelectionChange = vi.fn();
    const user = userEvent.setup();
    
    render(
      <DateFilter
        column={mockColumn}
        dateRange={{ from: null, to: null }}
        selectedDateIds={['date-1']}
        availableDates={mockAvailableDates}
        onDateRangeChange={vi.fn()}
        onDateSelectionChange={handleDateSelectionChange}
      />
    );

    const checkbox2 = screen.getByTestId('date-filter-checkbox-date-2');
    await user.click(checkbox2);

    expect(handleDateSelectionChange).toHaveBeenCalledWith(['date-1', 'date-2']);
  });

  it('should show checked state for selected dates', () => {
    render(
      <DateFilter
        column={mockColumn}
        dateRange={{ from: null, to: null }}
        selectedDateIds={['date-1', 'date-3']}
        availableDates={mockAvailableDates}
        onDateRangeChange={vi.fn()}
        onDateSelectionChange={vi.fn()}
      />
    );

    const checkbox1 = screen.getByTestId('date-filter-checkbox-date-1');
    const checkbox2 = screen.getByTestId('date-filter-checkbox-date-2');
    const checkbox3 = screen.getByTestId('date-filter-checkbox-date-3');

    expect(checkbox1).toBeChecked();
    expect(checkbox2).not.toBeChecked();
    expect(checkbox3).toBeChecked();
  });

  it('should not render date checkboxes when no available dates', () => {
    render(
      <DateFilter
        column={mockColumn}
        dateRange={{ from: null, to: null }}
        selectedDateIds={[]}
        availableDates={[]}
        onDateRangeChange={vi.fn()}
        onDateSelectionChange={vi.fn()}
      />
    );

    expect(screen.queryByText('Eller välj specifika datum:')).not.toBeInTheDocument();
  });
});
