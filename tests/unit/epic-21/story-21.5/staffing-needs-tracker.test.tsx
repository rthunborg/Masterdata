import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StaffingNeedsTracker } from '@/components/dashboard/staffing-needs-tracker';
import { StaffingNeedsCard } from '@/components/dashboard/staffing-needs-card';
import type { StaffingNeedLastChange } from '@/lib/types/staffing-needs';

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), pathname: '/dashboard' }),
  useSearchParams: () => ({ get: vi.fn(), toString: vi.fn(() => '') }),
  usePathname: () => '/dashboard',
}));

const mockApiData = {
  data: [
    {
      id: '1',
      location: 'Trelleborg',
      headcount_need: 30,
      updated_at: '2026-03-10T14:30:00Z',
      updated_by: 'user-1',
      crewReadyCount: 13,
      crewReadyPercentage: 43.33,
      last_change: {
        old_value: 25,
        new_value: 30,
        changed_at: '2026-03-10T14:30:00Z',
        changed_by_email: 'anna.svensson@stenaline.com',
      },
    },
    {
      id: '2',
      location: 'Göteborg',
      headcount_need: 20,
      updated_at: '2026-03-09T10:00:00Z',
      updated_by: 'user-2',
      crewReadyCount: 18,
      crewReadyPercentage: 90,
      last_change: null,
    },
  ],
};

describe('StaffingNeedsTracker', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockUseAuth.mockReturnValue({
      user: { role: 'hr_admin', email: 'admin@test.com' },
      isAuthenticated: true,
      isLoading: false,
    });
  });

  it('renders two tracker cards with location names when API returns valid data', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiData,
    } as Response);

    render(<StaffingNeedsTracker />);

    await waitFor(() => {
      expect(screen.getByText('Trelleborg')).toBeInTheDocument();
      expect(screen.getByText('Göteborg')).toBeInTheDocument();
    });
  });

  it('displays correct fraction for each card', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiData,
    } as Response);

    render(<StaffingNeedsTracker />);

    await waitFor(() => {
      expect(screen.getByText('13/30')).toBeInTheDocument();
      expect(screen.getByText('18/20')).toBeInTheDocument();
    });
  });

  it('shows pencil icon for hr_admin role', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiData,
    } as Response);

    render(<StaffingNeedsTracker />);

    await waitFor(() => {
      const icons = screen.getAllByTestId('pencil-icon');
      expect(icons).toHaveLength(2);
    });
  });

  it('hides pencil icon for recruiter role', async () => {
    mockUseAuth.mockReturnValue({
      user: { role: 'recruiter', email: 'rec@test.com' },
      isAuthenticated: true,
      isLoading: false,
    });

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiData,
    } as Response);

    render(<StaffingNeedsTracker />);

    await waitFor(() => {
      expect(screen.getByText('Trelleborg')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('pencil-icon')).not.toBeInTheDocument();
  });
});

describe('StaffingNeedsCard', () => {
  const defaultProps = {
    location: 'Trelleborg' as const,
    crewReadyCount: 13,
    headcount_need: 30,
    lastChange: null as StaffingNeedLastChange | null,
    canEdit: false,
    isLoading: false,
    hasError: false,
  };

  it('shows "Ej angivet" when headcount_need is 0', () => {
    render(
      <StaffingNeedsCard
        {...defaultProps}
        headcount_need={0}
        crewReadyCount={0}
      />
    );

    expect(screen.getByTestId('ej-angivet')).toHaveTextContent('Ej angivet');
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('renders fraction count without progress bar or percentage', () => {
    render(<StaffingNeedsCard {...defaultProps} />);

    expect(screen.getByText('13/30')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByText(/43%/)).not.toBeInTheDocument();
  });

  it('shows tooltip with last change details', async () => {
    const user = userEvent.setup();
    const lastChange: StaffingNeedLastChange = {
      old_value: 25,
      new_value: 30,
      changed_at: '2026-03-10T14:30:00Z',
      changed_by_email: 'anna.svensson@stenaline.com',
    };

    render(<StaffingNeedsCard {...defaultProps} lastChange={lastChange} />);

    const trigger = screen.getByRole('button');
    await user.hover(trigger);

    await waitFor(() => {
      const matches = screen.getAllByText(/anna\.svensson@stenaline\.com/);
      expect(matches.length).toBeGreaterThan(0);
      const changeMatches = screen.getAllByText(/25 → 30/);
      expect(changeMatches.length).toBeGreaterThan(0);
    });
  });

  it('shows "Ingen ändring gjord" tooltip when lastChange is null', async () => {
    const user = userEvent.setup();

    render(<StaffingNeedsCard {...defaultProps} lastChange={null} />);

    const trigger = screen.getByRole('button');
    await user.hover(trigger);

    await waitFor(() => {
      const matches = screen.getAllByText('Ingen ändring gjord');
      expect(matches.length).toBeGreaterThan(0);
    });
  });
});
