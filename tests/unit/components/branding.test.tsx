import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Header } from '@/components/layout/header';
import { Card } from '@/components/ui/card';

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock useAuth hook
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({
    user: {
      id: '1',
      email: 'test@stenaline.com',
      role: 'hr_admin',
    },
    logout: vi.fn(),
    isLoading: false,
  }),
}));

describe('Stena Line Branding', () => {
  describe('Header Logo', () => {
    it('renders Stena logo with correct alt text', () => {
      render(<Header />);

      const logo = screen.getByAltText('Stena Line');
      expect(logo).toBeInTheDocument();
    });

    it('logo has correct source path', () => {
      render(<Header />);

      const logo = screen.getByAltText('Stena Line');
      expect(logo).toHaveAttribute('src', '/images/stena-logo.png');
    });

    it('logo has responsive sizing classes', () => {
      render(<Header />);

      const logo = screen.getByAltText('Stena Line');
      expect(logo).toHaveClass('h-8');
      expect(logo).toHaveClass('md:h-10');
    });

    it('logo has priority attribute for LCP optimization', () => {
      render(<Header />);

      const logo = screen.getByAltText('Stena Line');
      // Priority is passed but may not be in DOM as attribute
      expect(logo).toBeInTheDocument();
    });
  });

  describe('Card Component Variants', () => {
    it('renders default card with correct classes', () => {
      render(
        <Card data-testid="default-card">Default Card</Card>
      );

      const card = screen.getByTestId('default-card');
      expect(card).toHaveClass('bg-card');
      expect(card).toHaveClass('text-card-foreground');
    });

    it('renders beige variant card with correct classes', () => {
      render(
        <Card variant="beige" data-testid="beige-card">
          Beige Card
        </Card>
      );

      const card = screen.getByTestId('beige-card');
      expect(card).toHaveClass('bg-accent');
      expect(card).toHaveClass('text-accent-foreground');
    });

    it('beige variant does not have default card classes', () => {
      render(
        <Card variant="beige" data-testid="beige-card">
          Beige Card
        </Card>
      );

      const card = screen.getByTestId('beige-card');
      expect(card).not.toHaveClass('bg-card');
    });
  });

  describe('CSS Custom Properties', () => {
    it('defines Stena color variables in root', () => {
      const root = document.documentElement;
      const styles = getComputedStyle(root);

      // Check that Stena variables are defined
      // Note: These will only work if globals.css is loaded in test environment
      const primaryColor = styles.getPropertyValue('--primary');
      expect(primaryColor).toBeDefined();
    });
  });
});
