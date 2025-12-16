/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Story 12.9: Mobile Header and Navigation UI Improvements
 * Unit tests for mobile navigation branding (logo and text)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MobileNav } from '@/components/layout/mobile-nav';
import { UserRole } from '@/lib/types/user';
import type { SessionUser } from '@/lib/types/user';

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => {
     
    const { priority, ...imgProps } = props;
    return <img {...imgProps} />;
  },
}));

// Mock i18n
vi.mock('@/lib/i18n', () => {
  const translations: Record<string, any> = {
    dashboard: {
      navigation: {
        employees: 'Employees',
        importantDates: 'Important Dates',
      },
      admin: {
        userManagement: 'User Management',
        columnSettings: 'Column Settings',
      },
    },
  };

  return {
    useTranslations: (namespace: string) => {
      // Return a function that behaves like t(key) or a nested object if needed
      // Simple implementation for test purposes
      const t = translations[namespace] || {};
      return t;
    },
    t: translations.dashboard, // Export 't' object matching dashboard namespace structure used in component
  };
});

// Mock navigation Link
vi.mock('@/lib/navigation', () => ({
  Link: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const mockUser: SessionUser = {
  id: '1',
  email: 'test@example.com',
  role: UserRole.HR_ADMIN,
  auth_id: 'auth-1',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  last_active_at: new Date().toISOString(),
};

describe('MobileNav - Branding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display Stena Line logo in navigation header', async () => {
    render(<MobileNav user={mockUser} />);

    // Open the sheet
    const trigger = screen.getByLabelText('Open navigation menu');
    fireEvent.click(trigger);

    await waitFor(() => {
      const logo = screen.getByAltText('Stena Line');
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute('src', '/images/stena-logo.png');
    });
  });

  it('should display "Säsongsrekrytering 2026" text in navigation header', async () => {
    render(<MobileNav user={mockUser} />);

    // Open the sheet
    const trigger = screen.getByLabelText('Open navigation menu');
    fireEvent.click(trigger);

    await waitFor(() => {
      const brandingText = screen.getByText('Säsongsrekrytering 2026');
      expect(brandingText).toBeInTheDocument();
    });
  });

  it('should NOT display "Navigation" as SheetTitle', async () => {
    render(<MobileNav user={mockUser} />);

    // Open the sheet
    const trigger = screen.getByLabelText('Open navigation menu');
    fireEvent.click(trigger);

    await waitFor(() => {
      // Should not find "Navigation" text
      const navigationText = screen.queryByText('Navigation');
      expect(navigationText).not.toBeInTheDocument();
    });
  });

  it('should have logo and text properly styled and centered', async () => {
    render(<MobileNav user={mockUser} />);

    // Open the sheet
    const trigger = screen.getByLabelText('Open navigation menu');
    fireEvent.click(trigger);

    await waitFor(() => {
      const brandingText = screen.getByText('Säsongsrekrytering 2026');
      const sheetTitle = brandingText.closest('h2');
      expect(sheetTitle).toBeInTheDocument();
      
      // Check for flex column and items-center classes (centered alignment)
      // The h2 itself has these classes
      expect(sheetTitle?.className).toContain('flex');
      expect(sheetTitle?.className).toContain('flex-col');
      expect(sheetTitle?.className).toContain('items-center');
    });
  });

  it('should use same logo source as main header', async () => {
    render(<MobileNav user={mockUser} />);

    // Open the sheet
    const trigger = screen.getByLabelText('Open navigation menu');
    fireEvent.click(trigger);

    await waitFor(() => {
      const logo = screen.getByAltText('Stena Line');
      expect(logo).toHaveAttribute('src', '/images/stena-logo.png');
      
      // Verify logo dimensions match header usage
      expect(logo).toHaveAttribute('width', '120');
      expect(logo).toHaveAttribute('height', '40');
    });
  });

  it('should have consistent branding with main header', async () => {
    render(<MobileNav user={mockUser} />);

    // Open the sheet
    const trigger = screen.getByLabelText('Open navigation menu');
    fireEvent.click(trigger);

    await waitFor(() => {
      const logo = screen.getByAltText('Stena Line');
      const brandingText = screen.getByText('Säsongsrekrytering 2026');
      
      // Both elements should be present
      expect(logo).toBeInTheDocument();
      expect(brandingText).toBeInTheDocument();
      
      // Logo should be above text (flex-col layout)
      const container = logo.closest('[class*="flex-col"]');
      expect(container).toBeInTheDocument();
      expect(container).toContainElement(brandingText);
    });
  });

  it('should have proper spacing between logo and text', async () => {
    render(<MobileNav user={mockUser} />);

    // Open the sheet
    const trigger = screen.getByLabelText('Open navigation menu');
    fireEvent.click(trigger);

    await waitFor(() => {
      const brandingText = screen.getByText('Säsongsrekrytering 2026');
      const sheetTitle = brandingText.closest('h2');
      
      // The h2 element should have gap-2 class for spacing
      expect(sheetTitle).toBeInTheDocument();
      expect(sheetTitle?.className).toContain('gap-2');
    });
  });

  it('should render logo with appropriate size for mobile navigation', async () => {
    render(<MobileNav user={mockUser} />);

    // Open the sheet
    const trigger = screen.getByLabelText('Open navigation menu');
    fireEvent.click(trigger);

    await waitFor(() => {
      const logo = screen.getByAltText('Stena Line');
      
      // Logo should have h-8 class for mobile navigation (smaller than header)
      expect(logo.className).toContain('h-8');
    });
  });

  it('should have text with appropriate font styling', async () => {
    render(<MobileNav user={mockUser} />);

    // Open the sheet
    const trigger = screen.getByLabelText('Open navigation menu');
    fireEvent.click(trigger);

    await waitFor(() => {
      const brandingText = screen.getByText('Säsongsrekrytering 2026');
      
      // Should have text-base and font-semibold for readability
      expect(brandingText.className).toContain('text-base');
      expect(brandingText.className).toContain('font-semibold');
    });
  });
});
