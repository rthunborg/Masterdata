/**
 * Component Tests for Capacity Badge
 * 
 * Tests visual capacity status indicators for Important Dates.
 * Story: 11.1 - Capacity Management Test Suite
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CapacityBadge } from '@/components/dashboard/capacity-badge';

describe('CapacityBadge', () => {
  describe('Badge Rendering States', () => {
    it('should render red "Fullbokad" badge when remaining_spots is 0', () => {
      render(<CapacityBadge remainingSpots={0} maxSpots={20} />);
      const badge = screen.getByLabelText('Fullbokad');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('Fullbokad');
      expect(badge).toHaveClass('bg-red-100');
      expect(badge).toHaveClass('text-red-800');
      expect(badge).toHaveClass('border-red-300');
      expect(badge).toHaveAttribute('title', '0 platser kvar');
    });

    it('should render yellow "Nästan fullbokad" badge when remaining_spots <= 3 for ÖMC/PE3 dates', () => {
      // Test with 1 spot (ÖMC date, maxSpots=20)
      const { rerender } = render(<CapacityBadge remainingSpots={1} maxSpots={20} />);
      let badge = screen.getByLabelText('Nästan fullbokad');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('Nästan fullbokad');
      expect(badge).toHaveClass('bg-yellow-100');
      expect(badge).toHaveClass('text-yellow-800');
      expect(badge).toHaveClass('border-yellow-300');
      expect(badge).toHaveAttribute('title', '1 platser kvar');

      // Test with 2 spots
      rerender(<CapacityBadge remainingSpots={2} maxSpots={20} />);
      badge = screen.getByLabelText('Nästan fullbokad');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('title', '2 platser kvar');

      // Test with 3 spots (boundary)
      rerender(<CapacityBadge remainingSpots={3} maxSpots={20} />);
      badge = screen.getByLabelText('Nästan fullbokad');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('title', '3 platser kvar');

      // Test with PE3 date (maxSpots=1)
      rerender(<CapacityBadge remainingSpots={1} maxSpots={1} />);
      badge = screen.getByLabelText('Nästan fullbokad');
      expect(badge).toBeInTheDocument();
    });

    it('should render yellow "Nästan fullbokad" badge when remaining_spots <= 10 for Stena dates', () => {
      // Test with 5 spots (Stena date, maxSpots=99)
      const { rerender } = render(<CapacityBadge remainingSpots={5} maxSpots={99} />);
      let badge = screen.getByLabelText('Nästan fullbokad');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('Nästan fullbokad');
      expect(badge).toHaveAttribute('title', '5 platser kvar');

      // Test with 10 spots (boundary)
      rerender(<CapacityBadge remainingSpots={10} maxSpots={99} />);
      badge = screen.getByLabelText('Nästan fullbokad');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('title', '10 platser kvar');
    });

    it('should return null (no badge) when remaining_spots > threshold', () => {
      // ÖMC date: threshold = 3, so 4+ should show no badge
      const { container, rerender } = render(<CapacityBadge remainingSpots={4} maxSpots={20} />);
      expect(container.firstChild).toBeNull();

      // Test with 5 spots (ÖMC)
      rerender(<CapacityBadge remainingSpots={5} maxSpots={20} />);
      expect(container.firstChild).toBeNull();

      // Test with 20 spots (full capacity, ÖMC)
      rerender(<CapacityBadge remainingSpots={20} maxSpots={20} />);
      expect(container.firstChild).toBeNull();

      // Stena date: threshold = 10, so 11+ should show no badge
      rerender(<CapacityBadge remainingSpots={11} maxSpots={99} />);
      expect(container.firstChild).toBeNull();

      // Test with 50 spots (Stena)
      rerender(<CapacityBadge remainingSpots={50} maxSpots={99} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Badge Colors', () => {
    it('should apply red color classes when full (remaining = 0)', () => {
      render(<CapacityBadge remainingSpots={0} maxSpots={20} />);
      const badge = screen.getByLabelText('Fullbokad');
      expect(badge).toHaveClass('bg-red-100');
      expect(badge).toHaveClass('text-red-800');
      expect(badge).toHaveClass('border-red-300');
      expect(badge).toHaveClass('dark:bg-red-900');
      expect(badge).toHaveClass('dark:text-red-200');
      expect(badge).toHaveClass('dark:border-red-700');
    });

    it('should apply yellow color classes when almost full', () => {
      // ÖMC date (threshold = 3)
      render(<CapacityBadge remainingSpots={3} maxSpots={20} />);
      let badge = screen.getByLabelText('Nästan fullbokad');
      expect(badge).toHaveClass('bg-yellow-100');
      expect(badge).toHaveClass('text-yellow-800');
      expect(badge).toHaveClass('border-yellow-300');
      expect(badge).toHaveClass('dark:bg-yellow-900');
      expect(badge).toHaveClass('dark:text-yellow-200');
      expect(badge).toHaveClass('dark:border-yellow-700');

      // Stena date (threshold = 10)
      render(<CapacityBadge remainingSpots={10} maxSpots={99} />);
      badge = screen.getByLabelText('Nästan fullbokad');
      expect(badge).toHaveClass('bg-yellow-100');
      expect(badge).toHaveClass('text-yellow-800');
      expect(badge).toHaveClass('border-yellow-300');
    });
  });

  describe('Badge Text (Swedish Translations)', () => {
    it('should display "Fullbokad" text when remaining_spots is 0', () => {
      render(<CapacityBadge remainingSpots={0} maxSpots={20} />);
      const badge = screen.getByLabelText('Fullbokad');
      expect(badge).toHaveTextContent('Fullbokad');
    });

    it('should display "Nästan fullbokad" text for ÖMC/PE3 dates when remaining <= 3', () => {
      render(<CapacityBadge remainingSpots={2} maxSpots={20} />);
      const badge = screen.getByLabelText('Nästan fullbokad');
      expect(badge).toHaveTextContent('Nästan fullbokad');
    });

    it('should display "Nästan fullbokad" text for Stena dates when remaining <= 10', () => {
      render(<CapacityBadge remainingSpots={8} maxSpots={99} />);
      const badge = screen.getByLabelText('Nästan fullbokad');
      expect(badge).toHaveTextContent('Nästan fullbokad');
    });
  });

  describe('Tooltip', () => {
    it('should show "X platser kvar" tooltip on hover', () => {
      render(<CapacityBadge remainingSpots={3} maxSpots={20} />);
      const badge = screen.getByLabelText('Nästan fullbokad');
      expect(badge).toHaveAttribute('title', '3 platser kvar');
    });

    it('should show correct tooltip for full capacity', () => {
      render(<CapacityBadge remainingSpots={0} maxSpots={20} />);
      const badge = screen.getByLabelText('Fullbokad');
      expect(badge).toHaveAttribute('title', '0 platser kvar');
    });
  });

  describe('Badge Visibility - Unlimited Capacity', () => {
    it('should return null when max_spots is 0 (unlimited capacity)', () => {
      const { container } = render(<CapacityBadge remainingSpots={999} maxSpots={0} />);
      expect(container.firstChild).toBeNull();
    });

    it('should return null when max_spots is 0 even if remaining_spots is 0', () => {
      // Edge case: unlimited capacity with 0 remaining (shouldn't happen, but test it)
      const { container } = render(<CapacityBadge remainingSpots={0} maxSpots={0} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('ARIA Labels and Accessibility', () => {
    it('should have correct aria-label for full capacity', () => {
      render(<CapacityBadge remainingSpots={0} maxSpots={20} />);
      const badge = screen.getByLabelText('Fullbokad');
      expect(badge).toBeInTheDocument();
    });

    it('should have correct aria-label for almost full capacity', () => {
      render(<CapacityBadge remainingSpots={3} maxSpots={20} />);
      const badge = screen.getByLabelText('Nästan fullbokad');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Badge Styling Classes', () => {
    it('should apply consistent styling classes to all badges', () => {
      const { rerender } = render(<CapacityBadge remainingSpots={0} maxSpots={20} />);
      let badge = screen.getByLabelText('Fullbokad');
      expect(badge).toHaveClass('inline-flex');
      expect(badge).toHaveClass('items-center');
      expect(badge).toHaveClass('px-2');
      expect(badge).toHaveClass('py-0.5');
      expect(badge).toHaveClass('rounded');
      expect(badge).toHaveClass('border');
      expect(badge).toHaveClass('text-xs');
      expect(badge).toHaveClass('font-medium');

      rerender(<CapacityBadge remainingSpots={3} maxSpots={20} />);
      badge = screen.getByLabelText('Nästan fullbokad');
      expect(badge).toHaveClass('inline-flex');
      expect(badge).toHaveClass('items-center');
      expect(badge).toHaveClass('px-2');
      expect(badge).toHaveClass('py-0.5');
      expect(badge).toHaveClass('rounded');
      expect(badge).toHaveClass('border');
      expect(badge).toHaveClass('text-xs');
      expect(badge).toHaveClass('font-medium');
    });
  });

  describe('Edge Cases', () => {
    it('should handle boundary at exactly 3 spots for ÖMC (almost full)', () => {
      render(<CapacityBadge remainingSpots={3} maxSpots={20} />);
      const badge = screen.getByLabelText('Nästan fullbokad');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('Nästan fullbokad');
    });

    it('should handle boundary at exactly 4 spots for ÖMC (no badge)', () => {
      const { container } = render(<CapacityBadge remainingSpots={4} maxSpots={20} />);
      expect(container.firstChild).toBeNull();
    });

    it('should handle boundary at exactly 10 spots for Stena (almost full)', () => {
      render(<CapacityBadge remainingSpots={10} maxSpots={99} />);
      const badge = screen.getByLabelText('Nästan fullbokad');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('Nästan fullbokad');
    });

    it('should handle boundary at exactly 11 spots for Stena (no badge)', () => {
      const { container } = render(<CapacityBadge remainingSpots={11} maxSpots={99} />);
      expect(container.firstChild).toBeNull();
    });

    it('should handle large max_spots values', () => {
      const { container } = render(<CapacityBadge remainingSpots={50} maxSpots={99} />);
      expect(container.firstChild).toBeNull();
    });

    it('should handle PE3 dates with low capacity (1 max)', () => {
      render(<CapacityBadge remainingSpots={0} maxSpots={1} />);
      const badge = screen.getByLabelText('Fullbokad');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('Fullbokad');
    });
  });
});

