/**
 * Integration Tests: Mobile Quick Actions
 * Story 12.6: Mobile Quick Actions and Shortcuts
 * 
 * Tests the complete workflow of mobile quick actions including
 * long-press context menu, email/phone links, FAB, and search functionality.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import { EmployeeCard } from '@/components/dashboard/employee-card';
import { EmployeeCardList } from '@/components/dashboard/employee-card-list';
import { FloatingActionButton } from '@/components/dashboard/floating-action-button';
import type { Employee } from '@/lib/types/employee';

// Mock useMediaQuery to return true (mobile)
vi.mock('@/hooks/use-media-query', () => ({
  useMediaQuery: () => true,
}));

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


// Mock haptic feedback
Object.defineProperty(navigator, 'vibrate', {
  writable: true,
  value: vi.fn(),
});

describe('Mobile Quick Actions Integration (Story 12.6)', () => {
  const mockEmployee: Employee = {
    id: 'emp-1',
    first_name: 'John',
    surname: 'Doe',
    email: 'john.doe@example.com',
    mobile: '+46701234567',
    is_archived: false,
    is_terminated: false,
  } as Employee;

  let mockOnEdit: (employee: Employee) => void;
  let mockOnArchive: (employee: Employee) => void;
  let mockOnSearchChange: (value: string) => void;

  beforeEach(() => {
    mockOnEdit = vi.fn();
    mockOnArchive = vi.fn();
    mockOnSearchChange = vi.fn();
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Long-press Context Menu Workflow', () => {
    it('should show context menu after long-press on employee card', async () => {
      render(
        <EmployeeCard
          employee={mockEmployee}
          isHRAdmin={true}
          onEdit={mockOnEdit}
          onArchive={mockOnArchive}
        />
      );

      const card = screen.getByText('John Doe').closest('article');
      expect(card).toBeInTheDocument();

      // Simulate long-press (touchstart, wait 500ms, touchend)
      fireEvent.touchStart(card!, {
        touches: [{ clientX: 100, clientY: 100 }],
      });

      // Wait for long-press delay
      await waitFor(
        () => {
          expect(screen.getByText('View Details')).toBeInTheDocument();
        },
        { timeout: 600 }
      );
    });

    it('should execute action and close menu when menu item is clicked', async () => {
      render(
        <EmployeeCard
          employee={mockEmployee}
          isHRAdmin={true}
          onEdit={mockOnEdit}
          onArchive={mockOnArchive}
        />
      );

      const card = screen.getByText('John Doe').closest('article');

      // Trigger long-press
      fireEvent.touchStart(card!, {
        touches: [{ clientX: 100, clientY: 100 }],
      });

      // Wait for context menu to appear
      await waitFor(
        () => {
          expect(screen.getByText('View Details')).toBeInTheDocument();
        },
        { timeout: 600 }
      );

      // Find context menu container
      const contextMenu = screen.getByText('View Details').closest('div[class*="fixed"]') as HTMLElement;
      expect(contextMenu).toBeInTheDocument();

      // Find Edit button within the context menu (not the swipe action button)
      const editButton = within(contextMenu).getByRole('button', { name: /^Edit$/ });
      expect(editButton).toBeInTheDocument();

      // Click Edit button in context menu
      fireEvent.click(editButton);

      expect(mockOnEdit).toHaveBeenCalledWith(mockEmployee);
      
      // Wait for context menu to close
      await waitFor(() => {
        expect(screen.queryByText('View Details')).not.toBeInTheDocument();
      });
    });
  });

  describe('Email and Phone Links', () => {
    it('should generate correct mailto link with pre-filled subject', () => {
      render(
        <EmployeeCard
          employee={mockEmployee}
          isHRAdmin={true}
        />
      );

      const emailLink = screen.getByText(mockEmployee.email!);
      expect(emailLink).toHaveAttribute(
        'href',
        `mailto:${mockEmployee.email}?subject=${encodeURIComponent('Re: John Doe')}`
      );
    });

    it('should generate correct tel link for phone number', () => {
      render(
        <EmployeeCard
          employee={mockEmployee}
          isHRAdmin={true}
        />
      );

      const phoneLink = screen.getByText(mockEmployee.mobile!);
      expect(phoneLink).toHaveAttribute('href', `tel:${mockEmployee.mobile}`);
    });
  });

  describe('Search Debouncing and History', () => {
    it('should debounce search input changes', async () => {
      vi.useFakeTimers();

      render(
        <EmployeeCardList
          employees={[mockEmployee]}
          isLoading={false}
          isHRAdmin={true}
          searchValue=""
          onSearchChange={mockOnSearchChange}
        />
      );

      // Clear initial call (component calls onSearchChange with "" on mount)
      mockOnSearchChange.mockClear();

      const searchInput = screen.getByLabelText('Search employees by name, email, or rank');
      
      // Type multiple characters rapidly
      fireEvent.change(searchInput, { target: { value: 'J' } });
      fireEvent.change(searchInput, { target: { value: 'Jo' } });
      fireEvent.change(searchInput, { target: { value: 'Joh' } });
      fireEvent.change(searchInput, { target: { value: 'John' } });

      // Should not call onSearchChange immediately after typing
      expect(mockOnSearchChange).not.toHaveBeenCalled();

      // Fast-forward 300ms to trigger debounce
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Switch to real timers and wait a bit for React to process the update
      vi.useRealTimers();
      await waitFor(() => {
        expect(mockOnSearchChange).toHaveBeenCalledWith('John');
      }, { timeout: 100 });
    });

    it('should save search to history on form submission', async () => {
      render(
        <EmployeeCardList
          employees={[mockEmployee]}
          isLoading={false}
          isHRAdmin={true}
          searchValue=""
          onSearchChange={mockOnSearchChange}
        />
      );

      const searchForm = screen.getByLabelText('Search employees by name, email, or rank').closest('form');
      const searchInput = screen.getByLabelText('Search employees by name, email, or rank');

      fireEvent.change(searchInput, { target: { value: 'test search' } });
      fireEvent.submit(searchForm!);

      // Wait for state update and localStorage write
      await waitFor(() => {
        const history = JSON.parse(
          localStorage.getItem('employee_search_history') || '[]'
        );
        expect(history).toContain('test search');
      }, { timeout: 1000 });
    });
  });

  describe('Floating Action Button Workflow', () => {
    it('should show FAB menu when clicked', () => {
      const mockOnAddEmployee = vi.fn();
      const mockOnImportCSV = vi.fn();
      const mockOnQuickSearch = vi.fn();

      render(
        <FloatingActionButton
          onAddEmployee={mockOnAddEmployee}
          onImportCSV={mockOnImportCSV}
          onQuickSearch={mockOnQuickSearch}
        />
      );

      const fabButton = screen.getByLabelText('Open quick actions menu');
      fireEvent.click(fabButton);

      expect(screen.getByLabelText('Add Employee')).toBeInTheDocument();
      expect(screen.getByLabelText('Import CSV')).toBeInTheDocument();
      expect(screen.getByLabelText('Quick Search')).toBeInTheDocument();
    });

    it('should execute action and close menu when FAB menu item is clicked', async () => {
      const mockOnAddEmployee = vi.fn();

      render(
        <FloatingActionButton
          onAddEmployee={mockOnAddEmployee}
        />
      );

      // Open menu
      const fabButton = screen.getByLabelText('Open quick actions menu');
      fireEvent.click(fabButton);

      // Wait for menu to appear
      await waitFor(() => {
        expect(screen.getByLabelText('Add Employee')).toBeInTheDocument();
      });

      // Click action
      const addEmployeeButton = screen.getByLabelText('Add Employee');
      fireEvent.click(addEmployeeButton);

      expect(mockOnAddEmployee).toHaveBeenCalledTimes(1);

      // Wait for menu to close (state update)
      await waitFor(() => {
        expect(screen.queryByLabelText('Add Employee')).not.toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });
});

