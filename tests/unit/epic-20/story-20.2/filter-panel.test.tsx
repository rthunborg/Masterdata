/**
 * Unit Tests for FilterPanel Component
 * Story 20.2: Filter Panel UI
 * 
 * Tests verify:
 * 1. Panel renders when open
 * 2. Panel does not render when closed
 * 3. Shows columns user has access to
 * 4. Calls onClose when X button clicked
 * 5. Calls onClose when overlay clicked
 * 6. Calls onClose when ESC pressed
 * 7. Panel has correct ARIA attributes
 * 8. Apply button closes panel
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterPanel } from '@/components/dashboard/FilterPanel';
import type { ColumnConfig } from '@/lib/types/column-config';

const mockColumnConfigs: ColumnConfig[] = [
  {
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
  },
  {
    id: '2',
    db_column_name: 'surname',
    column_name: 'Last Name',
    column_type: 'text',
    is_visible: true,
    display_order: 2,
    role_permissions: { all: { view: true, edit: false }, hr_admin: { view: true, edit: true } },
    is_masterdata: true,
    category: null,
    category_color: null,
    is_checklist_item: false,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: '3',
    db_column_name: 'id',
    column_name: 'ID',
    column_type: 'text',
    is_visible: true,
    display_order: 0,
    role_permissions: { all: { view: true, edit: false } },
    is_masterdata: true,
    category: null,
    category_color: null,
    is_checklist_item: false,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: '4',
    db_column_name: 'hidden_field',
    column_name: 'Hidden',
    column_type: 'text',
    is_visible: false,
    display_order: 3,
    role_permissions: { all: { view: true, edit: false } },
    is_masterdata: false,
    category: null,
    category_color: null,
    is_checklist_item: false,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
];

describe('Story 20.2: FilterPanel', () => {
  it('should render when open', () => {
    render(
      <FilterPanel
        isOpen={true}
        onClose={vi.fn()}
        columnConfigs={mockColumnConfigs}
        activeFilters={[]}
        onFiltersChange={vi.fn()}
      />
    );

    expect(screen.getByTestId('filter-panel')).toBeInTheDocument();
    expect(screen.getByText('Filter Employees')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(
      <FilterPanel
        isOpen={false}
        onClose={vi.fn()}
        columnConfigs={mockColumnConfigs}
        activeFilters={[]}
        onFiltersChange={vi.fn()}
      />
    );

    expect(screen.queryByTestId('filter-panel')).not.toBeInTheDocument();
  });

  it('should show only filterable columns (exclude id, created_at, updated_at, hidden)', () => {
    render(
      <FilterPanel
        isOpen={true}
        onClose={vi.fn()}
        columnConfigs={mockColumnConfigs}
        activeFilters={[]}
        onFiltersChange={vi.fn()}
      />
    );

    // Should show first_name and surname
    expect(screen.getByText('First Name')).toBeInTheDocument();
    expect(screen.getByText('Last Name')).toBeInTheDocument();

    // Should not show id or hidden field
    expect(screen.queryByText('ID')).not.toBeInTheDocument();
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
  });

  it('should call onClose when X button clicked', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <FilterPanel
        isOpen={true}
        onClose={handleClose}
        columnConfigs={mockColumnConfigs}
        activeFilters={[]}
        onFiltersChange={vi.fn()}
      />
    );

    await user.click(screen.getByTestId('close-filter-panel'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when overlay clicked', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <FilterPanel
        isOpen={true}
        onClose={handleClose}
        columnConfigs={mockColumnConfigs}
        activeFilters={[]}
        onFiltersChange={vi.fn()}
      />
    );

    await user.click(screen.getByTestId('filter-panel-overlay'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when ESC key pressed', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <FilterPanel
        isOpen={true}
        onClose={handleClose}
        columnConfigs={mockColumnConfigs}
        activeFilters={[]}
        onFiltersChange={vi.fn()}
      />
    );

    await user.keyboard('{Escape}');
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should have correct ARIA attributes', () => {
    render(
      <FilterPanel
        isOpen={true}
        onClose={vi.fn()}
        columnConfigs={mockColumnConfigs}
        activeFilters={[]}
        onFiltersChange={vi.fn()}
      />
    );

    const panel = screen.getByTestId('filter-panel');
    expect(panel).toHaveAttribute('role', 'dialog');
    expect(panel).toHaveAttribute('aria-modal', 'true');
    expect(panel).toHaveAttribute('aria-labelledby', 'filter-panel-title');
  });

  it('should call onClose when Apply Filters button clicked', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <FilterPanel
        isOpen={true}
        onClose={handleClose}
        columnConfigs={mockColumnConfigs}
        activeFilters={[]}
        onFiltersChange={vi.fn()}
      />
    );

    await user.click(screen.getByTestId('apply-filters'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should not call onClose when clicking inside panel', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <FilterPanel
        isOpen={true}
        onClose={handleClose}
        columnConfigs={mockColumnConfigs}
        activeFilters={[]}
        onFiltersChange={vi.fn()}
      />
    );

    await user.click(screen.getByText('Filter Employees'));
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('should display message when no filterable columns available', () => {
    const noFilterableColumns: ColumnConfig[] = [
      {
        id: '1',
        db_column_name: 'id',
        column_name: 'ID',
        column_type: 'text',
        is_visible: true,
        display_order: 0,
        role_permissions: { all: { view: true, edit: false } },
        is_masterdata: true,
        category: null,
        category_color: null,
        is_checklist_item: false,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      },
    ];

    render(
      <FilterPanel
        isOpen={true}
        onClose={vi.fn()}
        columnConfigs={noFilterableColumns}
        activeFilters={[]}
        onFiltersChange={vi.fn()}
      />
    );

    expect(screen.getByText('No filterable columns available.')).toBeInTheDocument();
  });
});
