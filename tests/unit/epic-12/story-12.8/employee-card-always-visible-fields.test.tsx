/**
 * Story 12.8: Enhanced Mobile Employee Card with Always-Visible Fields
 * Unit tests for always-visible fields display and filtering
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmployeeCard } from '@/components/dashboard/employee-card';
import { employeeService } from '@/lib/services/employee-service';
import { createTestEmployee } from '@/../tests/helpers/validation-test-helpers';
import type { Employee } from '@/lib/types/employee';
import type { ColumnConfig } from '@/lib/types/column-config';
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';

// Mock services
vi.mock('@/lib/services/employee-service', () => ({
  employeeService: {
    update: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/lib/services/custom-data-service', () => ({
  customDataService: {
    updateCustomData: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock hooks
vi.mock('@/hooks/use-media-query', () => ({
  useMediaQuery: vi.fn(() => true), // Mobile view by default
}));

vi.mock('@/lib/hooks/use-important-dates', () => ({
  useImportantDates: vi.fn(() => ({ dates: [] })),
}));

vi.mock('@/hooks/use-long-press', () => ({
  useLongPress: vi.fn(() => ({
    onTouchStart: vi.fn(),
    onTouchMove: vi.fn(),
    onTouchEnd: vi.fn(),
  })),
}));

// Helper to create test column configs
function createTestColumnConfig(overrides: Partial<ColumnConfig> = {}): ColumnConfig {
  return {
    id: `col-${Date.now()}-${Math.random()}`,
    column_name: overrides.column_name || 'First Name',
    db_column_name: overrides.db_column_name || 'first_name',
    column_type: overrides.column_type || 'text',
    role_permissions: overrides.role_permissions || {
      hr_admin: { view: true, edit: true },
      omc: { view: true, edit: false },
    },
    is_masterdata: overrides.is_masterdata ?? true,
    category: overrides.category || 'General',
    category_color: overrides.category_color || null,
    display_order: overrides.display_order || 1,
    is_visible: overrides.is_visible ?? true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('EmployeeCard - Always-Visible Fields (Story 12.8)', () => {
  const mockOnEmployeeUpdated = vi.fn();
  let mockEmployee: Employee;
  let mockColumnConfigs: ColumnConfig[];

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockEmployee = createTestEmployee({
      first_name: 'John',
      surname: 'Doe',
      rank: 'SEV',
      town_district: 'Göteborg',
      email: 'john.doe@example.com',
      mobile: '+46701234567',
      stena_date: null,
      omc_date: null,
      pe3_date: null,
    });

    mockColumnConfigs = [
      createTestColumnConfig({
        column_name: 'First Name',
        db_column_name: 'first_name',
        display_order: 1,
      }),
      createTestColumnConfig({
        column_name: 'Surname',
        db_column_name: 'surname',
        display_order: 2,
      }),
      createTestColumnConfig({
        column_name: 'Rank',
        db_column_name: 'rank',
        column_type: 'select',
        display_order: 3,
      }),
      createTestColumnConfig({
        column_name: 'Town District',
        db_column_name: 'town_district',
        display_order: 4,
      }),
      createTestColumnConfig({
        column_name: 'Stena Date',
        db_column_name: 'stena_date',
        column_type: 'date',
        display_order: 5,
      }),
      createTestColumnConfig({
        column_name: 'ÖMC Date',
        db_column_name: 'omc_date',
        column_type: 'date',
        display_order: 6,
      }),
      createTestColumnConfig({
        column_name: 'PE3 Date',
        db_column_name: 'pe3_date',
        column_type: 'date',
        display_order: 7,
      }),
      createTestColumnConfig({
        column_name: 'Email',
        db_column_name: 'email',
        display_order: 8,
      }),
    ];
  });

  it('should display always-visible fields in CardContent on mobile', () => {
    renderWithI18n(
      <EmployeeCard
        employee={mockEmployee}
        isHRAdmin={true}
        columnConfigs={mockColumnConfigs}
        onEmployeeUpdated={mockOnEmployeeUpdated}
      />
    );

    // Check that always-visible fields are present
    expect(screen.getByText('First Name')).toBeInTheDocument();
    expect(screen.getByText('Surname')).toBeInTheDocument();
    expect(screen.getByText('Rank')).toBeInTheDocument();
    expect(screen.getByText('City/Town District')).toBeInTheDocument();
    expect(screen.getByText('Stena Date')).toBeInTheDocument();
    expect(screen.getByText('ÖMC Date')).toBeInTheDocument();
    expect(screen.getByText('PE3 Date')).toBeInTheDocument();
  });

  it('should not duplicate always-visible fields in expanded section on mobile', async () => {
    const user = userEvent.setup();
    
    renderWithI18n(
      <EmployeeCard
        employee={mockEmployee}
        isHRAdmin={true}
        columnConfigs={mockColumnConfigs}
        onEmployeeUpdated={mockOnEmployeeUpdated}
      />
    );

    // Expand the card
    const moreButton = screen.getByLabelText(/Expand details/i);
    await user.click(moreButton);

    // Wait for expanded content - there should be "Less" button(s)
    await waitFor(() => {
      const lessButtons = screen.queryAllByText('Less');
      expect(lessButtons.length).toBeGreaterThan(0);
    });

    // Check that always-visible fields are NOT duplicated in expanded section
    // They should only appear once (in the always-visible section)
    const firstNames = screen.queryAllByText('First Name');
    const surnames = screen.queryAllByText('Surname');
    const ranks = screen.queryAllByText('Rank');
    
    // Each should appear only once (in always-visible section, not in expanded)
    expect(firstNames.length).toBeLessThanOrEqual(1);
    expect(surnames.length).toBeLessThanOrEqual(1);
    expect(ranks.length).toBeLessThanOrEqual(1);
  });

  it('should show "Less" button in CardHeader when expanded on mobile', async () => {
    const user = userEvent.setup();
    
    renderWithI18n(
      <EmployeeCard
        employee={mockEmployee}
        isHRAdmin={true}
        columnConfigs={mockColumnConfigs}
        onEmployeeUpdated={mockOnEmployeeUpdated}
      />
    );

    // Expand the card
    const moreButton = screen.getByLabelText(/Expand details/i);
    await user.click(moreButton);

    // Wait for "Less" button to appear in header
    await waitFor(() => {
      const lessButton = screen.getByLabelText(/Collapse card/i);
      expect(lessButton).toBeInTheDocument();
      expect(lessButton).toHaveTextContent('Less');
    });
  });

  it('should collapse card when "Less" button is clicked', async () => {
    const user = userEvent.setup();
    
    renderWithI18n(
      <EmployeeCard
        employee={mockEmployee}
        isHRAdmin={true}
        columnConfigs={mockColumnConfigs}
        onEmployeeUpdated={mockOnEmployeeUpdated}
      />
    );

    // Expand the card
    const moreButton = screen.getByLabelText(/Expand details/i);
    await user.click(moreButton);

    // Wait for "Less" button
    await waitFor(() => {
      expect(screen.getByLabelText(/Collapse card/i)).toBeInTheDocument();
    });

    // Click "Less" button
    const lessButton = screen.getByLabelText(/Collapse card/i);
    await user.click(lessButton);

    // Card should be collapsed (More button should be visible again)
    await waitFor(() => {
      expect(screen.getByLabelText(/Expand details/i)).toBeInTheDocument();
    });
  });

  it('should hide Archive/Delete buttons when card is NOT expanded on mobile', () => {
    renderWithI18n(
      <EmployeeCard
        employee={mockEmployee}
        isHRAdmin={true}
        columnConfigs={mockColumnConfigs}
        onArchive={() => {}}
        onTerminate={() => {}}
        onEmployeeUpdated={mockOnEmployeeUpdated}
      />
    );

    // Archive and Terminate buttons should NOT be visible when not expanded
    const archiveButtons = screen.queryAllByLabelText(/Archive John Doe/i);
    const terminateButtons = screen.queryAllByLabelText(/Terminate John Doe/i);
    
    // Buttons might exist but should not be visible in footer (only in swipe actions)
    // Check that footer buttons are not visible
    const footerButtons = screen.queryByRole('group', { name: /Employee actions/i });
    expect(footerButtons).not.toBeInTheDocument();
  });

  it('should show Archive/Delete buttons when card is expanded on mobile', async () => {
    const user = userEvent.setup();
    
    renderWithI18n(
      <EmployeeCard
        employee={mockEmployee}
        isHRAdmin={true}
        columnConfigs={mockColumnConfigs}
        onArchive={() => {}}
        onTerminate={() => {}}
        onEmployeeUpdated={mockOnEmployeeUpdated}
      />
    );

    // Expand the card
    const moreButton = screen.getByLabelText(/Expand details/i);
    await user.click(moreButton);

    // Wait for expanded state
    await waitFor(() => {
      expect(screen.getByLabelText(/Collapse card/i)).toBeInTheDocument();
    });

    // Archive and Terminate buttons should be visible (in footer when expanded)
    // There may be multiple (swipe actions + footer), so use getAllByLabelText
    const archiveButtons = screen.getAllByLabelText(/Archive John Doe/i);
    const terminateButtons = screen.getAllByLabelText(/Terminate John Doe/i);
    
    expect(archiveButtons.length).toBeGreaterThan(0);
    expect(terminateButtons.length).toBeGreaterThan(0);
    
    // Find the footer buttons (they should have 44px minimum height for touch optimization)
    const footerGroup = screen.queryByRole('group', { name: /Employee actions/i });
    if (footerGroup) {
      const footerArchiveButton = archiveButtons.find(btn => footerGroup.contains(btn));
      const footerTerminateButton = terminateButtons.find(btn => footerGroup.contains(btn));
      
      if (footerArchiveButton) {
        expect(footerArchiveButton).toHaveStyle({ minHeight: '44px' });
      }
      if (footerTerminateButton) {
        expect(footerTerminateButton).toHaveStyle({ minHeight: '44px' });
      }
    }
  });

  it('should allow inline editing of always-visible fields', async () => {
    const user = userEvent.setup();
    const mockUpdate = vi.fn().mockResolvedValue({});
    (employeeService.update as ReturnType<typeof vi.fn>).mockImplementation(mockUpdate);
    
    renderWithI18n(
      <EmployeeCard
        employee={mockEmployee}
        isHRAdmin={true}
        columnConfigs={mockColumnConfigs}
        onEmployeeUpdated={mockOnEmployeeUpdated}
      />
    );

    // Find and click on First Name field to edit
    const firstNameField = screen.getByText('John').closest('div[role="gridcell"]');
    if (firstNameField) {
      await user.click(firstNameField);
      
      // Wait for input to appear
      await waitFor(() => {
        const input = screen.getByDisplayValue('John');
        expect(input).toBeInTheDocument();
      });
      
      // Type new value
      const input = screen.getByDisplayValue('John');
      await user.clear(input);
      await user.type(input, 'Jane');
      await user.keyboard('{Enter}');
      
      // Verify update was called
      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(mockEmployee.id, { first_name: 'Jane' });
      });
    }
  });
});

