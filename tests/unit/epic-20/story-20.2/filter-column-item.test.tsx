/**
 * Unit Tests for FilterColumnItem Component
 * Story 20.2: Filter Panel UI
 * 
 * Tests verify:
 * 1. Component renders with column name
 * 2. Column starts collapsed by default
 * 3. Clicking toggles expand/collapse state
 * 4. Chevron icon changes based on state
 * 5. Active filter shows "Active" badge
 * 6. Content area shows placeholder text (Story 20.3 will add controls)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterColumnItem, type FilterState } from '@/components/dashboard/FilterPanel';
import type { ColumnConfig } from '@/lib/types/column-config';

const mockColumn: ColumnConfig = {
  id: '1',
  db_column_name: 'first_name',
  column_name: 'First Name',
  column_type: 'text',
  is_visible: true,
  display_order: 1,
  role_permissions: { all: { view: true, edit: false }, hr_admin: { view: true, edit: true } },
  is_masterdata: true,
  category: null,
  category_color: null,
  is_checklist_item: false,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};


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

describe('Story 20.2: FilterColumnItem', () => {
  it('should render with column name', () => {
    render(
      <FilterColumnItem
        column={mockColumn}
        onFilterChange={vi.fn()}
      />
    );

    expect(screen.getByText('First Name')).toBeInTheDocument();
  });

  it('should start collapsed by default', () => {
    render(
      <FilterColumnItem
        column={mockColumn}
        onFilterChange={vi.fn()}
      />
    );

    expect(screen.queryByTestId('filter-content-first_name')).not.toBeInTheDocument();
  });

  it('should expand when toggle button clicked', async () => {
    const user = userEvent.setup();

    render(
      <FilterColumnItem
        column={mockColumn}
        onFilterChange={vi.fn()}
      />
    );

    const toggleButton = screen.getByTestId('filter-column-toggle-first_name');
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggleButton);

    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('filter-content-first_name')).toBeInTheDocument();
  });

  it('should collapse when toggle button clicked again', async () => {
    const user = userEvent.setup();

    render(
      <FilterColumnItem
        column={mockColumn}
        onFilterChange={vi.fn()}
      />
    );

    const toggleButton = screen.getByTestId('filter-column-toggle-first_name');

    // Expand
    await user.click(toggleButton);
    expect(screen.getByTestId('filter-content-first_name')).toBeInTheDocument();

    // Collapse
    await user.click(toggleButton);
    expect(screen.queryByTestId('filter-content-first_name')).not.toBeInTheDocument();
  });

  it('should show "Active" badge when filter is active', () => {
    const activeFilter: FilterState = {
      columnId: '1',
      type: 'text',
      operator: 'contains',
      value: 'test',
    };

    render(
      <FilterColumnItem
        column={mockColumn}
        activeFilter={activeFilter}
        onFilterChange={vi.fn()}
      />
    );

    expect(screen.getByText('Aktiv')).toBeInTheDocument();
  });

  it('should not show "Active" badge when no filter is active', () => {
    render(
      <FilterColumnItem
        column={mockColumn}
        onFilterChange={vi.fn()}
      />
    );

    expect(screen.queryByText('Aktiv')).not.toBeInTheDocument();
  });

  it('should apply active styling when filter is active', () => {
    const activeFilter: FilterState = {
      columnId: '1',
      type: 'text',
      operator: 'contains',
      value: 'test',
    };

    render(
      <FilterColumnItem
        column={mockColumn}
        activeFilter={activeFilter}
        onFilterChange={vi.fn()}
      />
    );

    const container = screen.getByTestId('filter-column-item-first_name');
    expect(container).toHaveClass('border-primary');
    expect(container).toHaveClass('bg-primary/5');
  });

  it('should render text filter in expanded content (Story 20.3)', async () => {
    const user = userEvent.setup();

    render(
      <FilterColumnItem
        column={mockColumn}
        onFilterChange={vi.fn()}
      />
    );

    await user.click(screen.getByTestId('filter-column-toggle-first_name'));

    // Verify TextFilter is rendered
    expect(screen.getByTestId('text-filter-first_name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Sök First Name...')).toBeInTheDocument();
  });

  it('should render boolean filter for boolean columns (Story 20.3)', async () => {
    const booleanColumn: ColumnConfig = {
      ...mockColumn,
      id: '2',
      db_column_name: 'is_active',
      column_name: 'Active Status',
      column_type: 'boolean',
    };

    const user = userEvent.setup();

    render(
      <FilterColumnItem
        column={booleanColumn}
        onFilterChange={vi.fn()}
      />
    );

    await user.click(screen.getByTestId('filter-column-toggle-is_active'));

    // Verify BooleanFilter is rendered with Yes/No options (Either removed)
    expect(screen.getByTestId('boolean-filter-is_active')).toBeInTheDocument();
    expect(screen.getByText('Ja')).toBeInTheDocument();
    expect(screen.getByText('Nej')).toBeInTheDocument();
  });
});
