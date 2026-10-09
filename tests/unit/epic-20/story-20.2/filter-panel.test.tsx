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

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

const crewingDoneColumn: ColumnConfig = {
  id: 'cd-1',
  db_column_name: 'crewing_done',
  column_name: 'Crewing/Done',
  column_type: 'boolean',
  is_visible: true,
  display_order: 10,
  role_permissions: { hr_admin: { view: true, edit: true } },
  is_masterdata: true,
  category: null,
  category_color: null,
  is_checklist_item: false,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

const mockColumnConfigsWithCrewingDone = [...mockColumnConfigs, crewingDoneColumn];


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

vi.mock("@/hooks/useSavedFilters", () => ({
  useSavedFilters: () => ({
    savedFilters: [],
    saveFilter: vi.fn(),
    deleteFilter: vi.fn(),
    isLoading: false,
    error: null,
  }),
}));

describe('Story 20.2: FilterPanel', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  it('should render when open', () => {
    renderWithQueryClient(
      <FilterPanel
        isOpen={true}
        onClose={vi.fn()}
        columnConfigs={mockColumnConfigs}
        activeFilters={[]}
        onFiltersChange={vi.fn()}
      />
    );

    expect(screen.getByTestId('filter-panel')).toBeInTheDocument();
    expect(screen.getByText('Filtrera anställda')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    renderWithQueryClient(
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
    renderWithQueryClient(
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

    renderWithQueryClient(
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

    renderWithQueryClient(
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

    renderWithQueryClient(
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
    renderWithQueryClient(
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

    renderWithQueryClient(
      <FilterPanel
        isOpen={true}
        onClose={handleClose}
        columnConfigs={mockColumnConfigs}
        activeFilters={[]}
        onFiltersChange={vi.fn()}
      />
    );

    await user.click(screen.getByTestId('apply-filters'));
    await waitFor(() => expect(handleClose).toHaveBeenCalledTimes(1));
  });

  it('should not call onClose when clicking inside panel', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    renderWithQueryClient(
      <FilterPanel
        isOpen={true}
        onClose={handleClose}
        columnConfigs={mockColumnConfigs}
        activeFilters={[]}
        onFiltersChange={vi.fn()}
      />
    );

    await user.click(screen.getByText('Filtrera anställda'));
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('should apply pending text filter when Apply Filters is clicked (flush debounce)', async () => {
    const onFiltersChange = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();

    renderWithQueryClient(
      <FilterPanel
        isOpen={true}
        onClose={onClose}
        columnConfigs={mockColumnConfigs}
        activeFilters={[]}
        onFiltersChange={onFiltersChange}
      />
    );

    // Let the panel's initial focus timer complete before typing into the
    // expanded text filter, otherwise the focus handoff can race userEvent.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
    });

    await user.click(screen.getByTestId('filter-column-toggle-first_name'));
    const input = screen.getByTestId('text-filter-input-first_name');
    await user.type(input, 'John');
    // Allow debounced state to be scheduled, then click Apply (flush runs on flushTrigger change)
    await act(async () => {
      await user.click(screen.getByTestId('apply-filters'));
    });

    await waitFor(
      () => {
        expect(onFiltersChange).toHaveBeenCalled();
        const call = onFiltersChange.mock.calls[0]?.[0];
        expect(Array.isArray(call) && call.length === 1).toBe(true);
        expect(call[0]).toMatchObject({
          columnId: '1',
          type: 'text',
        });
        expect(typeof call[0].textValue === 'string' && call[0].textValue.length > 0).toBe(true);
      },
      { timeout: 2000 }
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled(), { timeout: 2000 });
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

    renderWithQueryClient(
      <FilterPanel
        isOpen={true}
        onClose={vi.fn()}
        columnConfigs={noFilterableColumns}
        activeFilters={[]}
        onFiltersChange={vi.fn()}
      />
    );

    expect(screen.getByText('Inga filterbara kolumner tillgängliga.')).toBeInTheDocument();
  });

  describe('Hide crewing done toggle', () => {
    it('should show the toggle when crewing_done column exists', () => {
      renderWithQueryClient(
        <FilterPanel
          isOpen={true}
          onClose={vi.fn()}
          columnConfigs={mockColumnConfigsWithCrewingDone}
          activeFilters={[]}
          onFiltersChange={vi.fn()}
        />
      );

      expect(screen.getByTestId('hide-crewing-done-toggle')).toBeInTheDocument();
      expect(screen.getByText('Dölj klara')).toBeInTheDocument();
    });

    it('should not show the toggle when crewing_done column is absent', () => {
      renderWithQueryClient(
        <FilterPanel
          isOpen={true}
          onClose={vi.fn()}
          columnConfigs={mockColumnConfigs}
          activeFilters={[]}
          onFiltersChange={vi.fn()}
        />
      );

      expect(screen.queryByTestId('hide-crewing-done-toggle')).not.toBeInTheDocument();
    });

    it('should add boolean filter with boolValue=false when checked', async () => {
      const onFiltersChange = vi.fn();
      const user = userEvent.setup();

      renderWithQueryClient(
        <FilterPanel
          isOpen={true}
          onClose={vi.fn()}
          columnConfigs={mockColumnConfigsWithCrewingDone}
          activeFilters={[]}
          onFiltersChange={onFiltersChange}
        />
      );

      await user.click(screen.getByTestId('hide-crewing-done-checkbox'));

      expect(onFiltersChange).toHaveBeenCalledWith([
        { columnId: 'cd-1', type: 'boolean', boolValue: false },
      ]);
    });

    it('should remove the crewing_done filter when unchecked', async () => {
      const onFiltersChange = vi.fn();
      const user = userEvent.setup();
      const existingFilter: import('@/lib/types/filter').FilterState = {
        columnId: 'cd-1',
        type: 'boolean',
        boolValue: false,
      };

      renderWithQueryClient(
        <FilterPanel
          isOpen={true}
          onClose={vi.fn()}
          columnConfigs={mockColumnConfigsWithCrewingDone}
          activeFilters={[existingFilter]}
          onFiltersChange={onFiltersChange}
        />
      );

      await user.click(screen.getByTestId('hide-crewing-done-checkbox'));

      expect(onFiltersChange).toHaveBeenCalledWith([]);
    });

    it('should preserve other active filters when toggling', async () => {
      const onFiltersChange = vi.fn();
      const user = userEvent.setup();
      const textFilter: import('@/lib/types/filter').FilterState = {
        columnId: '1',
        type: 'text',
        textValue: 'John',
      };

      renderWithQueryClient(
        <FilterPanel
          isOpen={true}
          onClose={vi.fn()}
          columnConfigs={mockColumnConfigsWithCrewingDone}
          activeFilters={[textFilter]}
          onFiltersChange={onFiltersChange}
        />
      );

      await user.click(screen.getByTestId('hide-crewing-done-checkbox'));

      expect(onFiltersChange).toHaveBeenCalledWith([
        textFilter,
        { columnId: 'cd-1', type: 'boolean', boolValue: false },
      ]);
    });

    it('should reflect active state when crewing_done filter already active', () => {
      const existingFilter: import('@/lib/types/filter').FilterState = {
        columnId: 'cd-1',
        type: 'boolean',
        boolValue: false,
      };

      renderWithQueryClient(
        <FilterPanel
          isOpen={true}
          onClose={vi.fn()}
          columnConfigs={mockColumnConfigsWithCrewingDone}
          activeFilters={[existingFilter]}
          onFiltersChange={vi.fn()}
        />
      );

      const checkbox = screen.getByTestId('hide-crewing-done-checkbox');
      expect(checkbox).toHaveAttribute('data-state', 'checked');
    });
  });
});
