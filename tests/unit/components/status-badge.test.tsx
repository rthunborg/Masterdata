import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '@/components/dashboard/status-badge';


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

describe('StatusBadge', () => {
  it('renders green badge with checkmark when status is green', () => {
    render(<StatusBadge status="green" />);
    const badge = screen.getByLabelText('Completed');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-green-100');
    expect(badge).toHaveClass('text-green-800');
    expect(badge).toHaveClass('border-green-300');
    expect(badge).toHaveTextContent('✓');
  });

  it('renders yellow badge with warning icon when status is yellow', () => {
    render(<StatusBadge status="yellow" />);
    const badge = screen.getByLabelText('Pending');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-yellow-100');
    expect(badge).toHaveClass('text-yellow-800');
    expect(badge).toHaveClass('border-yellow-300');
    expect(badge).toHaveTextContent('⚠');
  });

  it('returns null when status is null', () => {
    const { container } = render(<StatusBadge status={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('applies correct ARIA label for green status', () => {
    render(<StatusBadge status="green" />);
    const badge = screen.getByLabelText('Completed');
    expect(badge).toBeInTheDocument();
  });

  it('applies correct ARIA label for yellow status', () => {
    render(<StatusBadge status="yellow" />);
    const badge = screen.getByLabelText('Pending');
    expect(badge).toBeInTheDocument();
  });

  it('uses custom label when provided', () => {
    render(<StatusBadge status="green" label="Custom Label" />);
    const badge = screen.getByLabelText('Custom Label');
    expect(badge).toBeInTheDocument();
  });

  it('applies status-badge class for print styling', () => {
    render(<StatusBadge status="green" />);
    const badge = screen.getByLabelText('Completed');
    expect(badge).toHaveClass('status-badge');
  });

  it('applies correct spacing and sizing classes', () => {
    render(<StatusBadge status="green" />);
    const badge = screen.getByLabelText('Completed');
    expect(badge).toHaveClass('px-2');
    expect(badge).toHaveClass('py-0.5');
    expect(badge).toHaveClass('text-xs');
    expect(badge).toHaveClass('font-medium');
    expect(badge).toHaveClass('rounded');
    expect(badge).toHaveClass('border');
  });
});
