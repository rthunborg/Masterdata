/**
 * Story 12.7: Enhanced Mobile Accessibility
 * Unit tests for employee card accessibility features
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmployeeCard } from '@/components/dashboard/employee-card';
import type { Employee } from '@/lib/types/employee';

// Mock hooks
vi.mock('@/hooks/use-media-query', () => ({
  useMediaQuery: () => true, // Mobile view
}));

vi.mock('@/lib/hooks/use-important-dates', () => ({
  useImportantDates: () => ({ dates: [] }),
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


const mockEmployee: Employee = {
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
};

describe('EmployeeCard Accessibility', () => {
  it('should have proper ARIA label with employee information', () => {
    render(
      <EmployeeCard
        employee={mockEmployee}
        isHRAdmin={true}
        cardIndex={1}
        totalCards={5}
      />
    );

    const card = screen.getByRole('article');
    expect(card).toHaveAttribute('aria-label');
    expect(card.getAttribute('aria-label')).toContain('John Doe');
    expect(card.getAttribute('aria-label')).toContain('SEV');
    expect(card.getAttribute('aria-label')).toContain('Active');
  });

  it('should have aria-posinset and aria-setsize for list navigation', () => {
    render(
      <EmployeeCard
        employee={mockEmployee}
        isHRAdmin={true}
        cardIndex={2}
        totalCards={10}
      />
    );

    const card = screen.getByRole('article');
    expect(card).toHaveAttribute('aria-posinset', '2');
    expect(card).toHaveAttribute('aria-setsize', '10');
  });

  it('should have descriptive ARIA labels for action buttons', () => {
    render(
      <EmployeeCard
        employee={mockEmployee}
        isHRAdmin={true}
        onArchive={() => {}}
        onTerminate={() => {}}
        onEdit={() => {}}
      />
    );

    // There are multiple buttons (swipe actions + footer), so use getAllByLabelText
    const archiveButtons = screen.getAllByLabelText(/Archive John Doe/i);
    const terminateButtons = screen.getAllByLabelText(/Terminate John Doe/i);
    const editButtons = screen.getAllByLabelText(/Edit John Doe/i);

    expect(archiveButtons.length).toBeGreaterThan(0);
    expect(terminateButtons.length).toBeGreaterThan(0);
    expect(editButtons.length).toBeGreaterThan(0);
  });

  it('should have proper ARIA labels for expand/collapse button', () => {
    render(
      <EmployeeCard
        employee={mockEmployee}
        isHRAdmin={true}
      />
    );

    const expandButton = screen.getByLabelText(/Expand details for John Doe/i);
    expect(expandButton).toBeInTheDocument();
    expect(expandButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('should have aria-hidden on decorative icons', () => {
    render(
      <EmployeeCard
        employee={mockEmployee}
        isHRAdmin={true}
      />
    );

    // Icons are SVG elements, not img elements. Query for SVG elements with aria-hidden
    const icons = document.querySelectorAll('svg[aria-hidden="true"]');
    expect(icons.length).toBeGreaterThan(0);
    icons.forEach(icon => {
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('should have proper ARIA labels for status badges', () => {
    render(
      <EmployeeCard
        employee={mockEmployee}
        isHRAdmin={true}
      />
    );

    const statusBadge = screen.getByLabelText(/Status: Active/i);
    expect(statusBadge).toBeInTheDocument();
  });

  it('should have proper ARIA labels for email and phone links', () => {
    render(
      <EmployeeCard
        employee={mockEmployee}
        isHRAdmin={true}
      />
    );

    const emailLink = screen.getByLabelText(/Email John Doe at/i);
    const phoneLink = screen.getByLabelText(/Call John Doe at/i);

    expect(emailLink).toBeInTheDocument();
    expect(phoneLink).toBeInTheDocument();
  });
});

