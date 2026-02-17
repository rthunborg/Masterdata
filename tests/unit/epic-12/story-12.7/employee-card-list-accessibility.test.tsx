/**
 * Story 12.7: Enhanced Mobile Accessibility
 * Unit tests for employee card list accessibility features
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmployeeCardList } from '@/components/dashboard/employee-card-list';
import type { Employee } from '@/lib/types/employee';

// Mock hooks
vi.mock('@/hooks/use-media-query', () => ({
  useMediaQuery: () => true, // Mobile view
}));

vi.mock('@/hooks/use-pull-to-refresh', () => ({
  usePullToRefresh: () => ({
    isPulling: false,
    pullDistance: 0,
    shouldRefresh: false,
    isRefreshing: false,
    handlers: {},
    containerRef: { current: null },
  }),
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


const mockEmployees: Employee[] = [
  {
    id: '1',
    first_name: 'John',
    surname: 'Doe',
    rank: 'SEV',
    email: 'john.doe@example.com',
    mobile: '+46701234567',
    is_archived: false,
    is_terminated: false,
    ssn: '19850315-1234',
    gender: 'Man',
    town_district: null,
    hotel_required: false,
    hire_date: '2024-01-01',
    stena_date: null,
    omc_date: null,
    pe3_date: null,
    comments: null,
    termination_date: null,
    termination_reason: null,
  },
  {
    id: '2',
    first_name: 'Jane',
    surname: 'Smith',
    rank: 'CHEF',
    email: 'jane.smith@example.com',
    mobile: '+46709876543',
    is_archived: false,
    is_terminated: false,
    ssn: '19900420-5678',
    gender: 'Woman',
    town_district: null,
    hotel_required: false,
    hire_date: '2024-02-01',
    stena_date: null,
    omc_date: null,
    pe3_date: null,
    comments: null,
    termination_date: null,
    termination_reason: null,
  },
];

describe('EmployeeCardList Accessibility', () => {
  it('should use semantic main element with aria-label', () => {
    render(
      <EmployeeCardList
        employees={mockEmployees}
        isLoading={false}
        isHRAdmin={true}
        searchValue=""
        onSearchChange={() => {}}
      />
    );

    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('aria-label', 'Employee list');
  });

  it('should have properly labeled search input', () => {
    render(
      <EmployeeCardList
        employees={mockEmployees}
        isLoading={false}
        isHRAdmin={true}
        searchValue=""
        onSearchChange={() => {}}
      />
    );

    const searchInput = screen.getByLabelText(/Search employees by name, email, or rank/i);
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('id', 'employee-search');
    expect(searchInput).toHaveAttribute('type', 'search');
  });

  it('should have screen reader only label for search', () => {
    render(
      <EmployeeCardList
        employees={mockEmployees}
        isLoading={false}
        isHRAdmin={true}
        searchValue=""
        onSearchChange={() => {}}
      />
    );

    const label = screen.getByText('Search employees');
    expect(label).toHaveClass('sr-only');
  });

  it('should use semantic list structure for employees', () => {
    render(
      <EmployeeCardList
        employees={mockEmployees}
        isLoading={false}
        isHRAdmin={true}
        searchValue=""
        onSearchChange={() => {}}
      />
    );

    const list = screen.getByRole('list');
    expect(list).toHaveAttribute('aria-label', '2 employees');
    
    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(2);
  });

  it('should have aria-hidden on decorative search icon', () => {
    render(
      <EmployeeCardList
        employees={mockEmployees}
        isLoading={false}
        isHRAdmin={true}
        searchValue=""
        onSearchChange={() => {}}
      />
    );

    // Search icon should be aria-hidden
    const icons = document.querySelectorAll('[aria-hidden="true"]');
    expect(icons.length).toBeGreaterThan(0);
  });

  it('should have proper region label for employee cards container', () => {
    render(
      <EmployeeCardList
        employees={mockEmployees}
        isLoading={false}
        isHRAdmin={true}
        searchValue=""
        onSearchChange={() => {}}
      />
    );

    const region = screen.getByRole('region', { name: /Employee cards/i });
    expect(region).toBeInTheDocument();
  });

  it('should announce empty state to screen readers', () => {
    render(
      <EmployeeCardList
        employees={[]}
        isLoading={false}
        isHRAdmin={true}
        searchValue=""
        onSearchChange={() => {}}
      />
    );

    // The empty state has role="status" and contains "No employees found" text
    const emptyState = screen.getByRole('status');
    expect(emptyState).toBeInTheDocument();
    expect(emptyState).toHaveTextContent(/No employees found/i);
    expect(emptyState).toHaveAttribute('aria-live', 'polite');
  });
});

