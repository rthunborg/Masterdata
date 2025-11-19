/**
 * Story 12.7: Enhanced Mobile Accessibility
 * Unit tests for form accessibility features
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AddEmployeeModal } from '@/components/dashboard/add-employee-modal';

// Mock the hooks and services
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({ user: { role: 'hr_admin' } }),
}));

vi.mock('@/lib/hooks/use-network-status', () => ({
  useNetworkStatus: () => ({ isOnline: true }),
}));

vi.mock('@/lib/hooks/use-important-dates', () => ({
  useImportantDates: () => ({ dates: [], isLoading: false }),
}));

vi.mock('@/lib/hooks/use-available-pe3-dates', () => ({
  useAvailablePE3Dates: () => ({ availableDates: [], totalAvailable: 0, isLoading: false }),
}));

vi.mock('@/lib/services/employee-service', () => ({
  employeeService: {
    create: vi.fn(),
  },
}));

// Mock translations - form uses Swedish labels
vi.mock('@/lib/i18n', () => ({
  useTranslations: (namespace: string) => (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      forms: {
        firstName: 'Förnamn',
        surname: 'Efternamn',
        ssn: 'Personnummer',
      },
      common: {},
      dashboard: {},
      errors: {},
    };
    return translations[namespace as keyof typeof translations]?.[key] || key;
  },
}));

describe('Form Accessibility', () => {
  it('should have live region for validation error announcements', () => {
    render(
      <AddEmployeeModal
        isOpen={true}
        onClose={() => {}}
        onSuccess={() => {}}
      />
    );

    const liveRegion = screen.getByRole('alert', { hidden: true });
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
    expect(liveRegion).toHaveAttribute('id', 'form-errors-announcement');
    expect(liveRegion).toHaveClass('sr-only');
  });

  it('should have aria-required on required fields', () => {
    render(
      <AddEmployeeModal
        isOpen={true}
        onClose={() => {}}
        onSuccess={() => {}}
      />
    );

    // Form uses Swedish translations: "Förnamn", "Efternamn", "Personnummer"
    const firstNameInput = screen.getByLabelText(/Förnamn/i);
    const surnameInput = screen.getByLabelText(/Efternamn/i);
    const ssnInput = screen.getByLabelText(/Personnummer/i);

    expect(firstNameInput).toHaveAttribute('aria-required', 'true');
    expect(surnameInput).toHaveAttribute('aria-required', 'true');
    expect(ssnInput).toHaveAttribute('aria-required', 'true');
  });

  it('should have aria-label on required field indicators', () => {
    render(
      <AddEmployeeModal
        isOpen={true}
        onClose={() => {}}
        onSuccess={() => {}}
      />
    );

    const requiredIndicators = document.querySelectorAll('span[aria-label="required"]');
    expect(requiredIndicators.length).toBeGreaterThan(0);
  });

  it('should have proper form structure with noValidate', () => {
    render(
      <AddEmployeeModal
        isOpen={true}
        onClose={() => {}}
        onSuccess={() => {}}
      />
    );

    const form = document.querySelector('form');
    expect(form).toHaveAttribute('noValidate');
  });
});

