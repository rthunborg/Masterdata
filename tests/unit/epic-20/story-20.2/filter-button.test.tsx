/**
 * Unit Tests for FilterButton Component
 * Story 20.2: Filter Panel UI
 * 
 * Tests verify:
 * 1. Component renders with icon and text
 * 2. Badge displays when filters are active
 * 3. Badge shows correct filter count
 * 4. onClick handler is called when clicked
 * 5. Active state applies correct styling
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterButton } from '@/components/dashboard/FilterPanel';


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

describe('Story 20.2: FilterButton', () => {
  it('should render with icon and text', () => {
    render(
      <FilterButton
        onClick={vi.fn()}
        isActive={false}
        filterCount={0}
      />
    );

    expect(screen.getByRole('button', { name: /open filter panel/i })).toBeInTheDocument();
    expect(screen.getByText('Filter')).toBeInTheDocument();
  });

  it('should not show badge when no filters are active', () => {
    render(
      <FilterButton
        onClick={vi.fn()}
        isActive={false}
        filterCount={0}
      />
    );

    expect(screen.queryByTestId('filter-count-badge')).not.toBeInTheDocument();
  });

  it('should show badge when filters are active', () => {
    render(
      <FilterButton
        onClick={vi.fn()}
        isActive={true}
        filterCount={3}
      />
    );

    const badge = screen.getByTestId('filter-count-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('3');
  });

  it('should call onClick when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(
      <FilterButton
        onClick={handleClick}
        isActive={false}
        filterCount={0}
      />
    );

    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should apply active styling when isActive is true', () => {
    render(
      <FilterButton
        onClick={vi.fn()}
        isActive={true}
        filterCount={2}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toHaveClass('border-primary');
    expect(button).toHaveClass('bg-primary/5');
  });

  it('should accept custom className', () => {
    render(
      <FilterButton
        onClick={vi.fn()}
        isActive={false}
        filterCount={0}
        className="custom-class"
      />
    );

    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  it('should show correct badge count for different filter counts', () => {
    const { rerender } = render(
      <FilterButton
        onClick={vi.fn()}
        isActive={true}
        filterCount={1}
      />
    );

    expect(screen.getByTestId('filter-count-badge')).toHaveTextContent('1');

    rerender(
      <FilterButton
        onClick={vi.fn()}
        isActive={true}
        filterCount={10}
      />
    );

    expect(screen.getByTestId('filter-count-badge')).toHaveTextContent('9+');
  });
});
