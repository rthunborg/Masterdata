import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StaffingNeedsTracker } from '@/components/dashboard/staffing-needs-tracker';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

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
      last_change: null,
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

describe('Edit Staffing Needs Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockUseAuth.mockReturnValue({
      user: { role: 'hr_admin', email: 'admin@test.com' },
      isAuthenticated: true,
      isLoading: false,
    });
  });

  it('clicking pencil icon opens the edit modal with correct values', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockApiData,
    } as Response);

    render(<StaffingNeedsTracker />);

    await waitFor(() => {
      expect(screen.getAllByTestId('pencil-icon')).toHaveLength(2);
    });

    const pencilIcons = screen.getAllByTestId('pencil-icon');
    await user.click(pencilIcons[0]);

    await waitFor(() => {
      expect(screen.getByText('Uppdatera bemanningsbehov')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Trelleborg')).toHaveValue(30);
    expect(screen.getByLabelText('Göteborg')).toHaveValue(20);
  });

  it('cards refresh after successful save', async () => {
    const user = userEvent.setup();
    const updatedApiData = {
      data: [
        { ...mockApiData.data[0], headcount_need: 35 },
        { ...mockApiData.data[1] },
      ],
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      // Initial load
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiData,
      } as Response)
      // PUT request
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)
      // Refresh after save
      .mockResolvedValueOnce({
        ok: true,
        json: async () => updatedApiData,
      } as Response);

    render(<StaffingNeedsTracker />);

    await waitFor(() => {
      expect(screen.getByText('13/30')).toBeInTheDocument();
    });

    const pencilIcons = screen.getAllByTestId('pencil-icon');
    await user.click(pencilIcons[0]);

    await waitFor(() => {
      expect(screen.getByLabelText('Trelleborg')).toBeInTheDocument();
    });

    const trelleborgInput = screen.getByLabelText('Trelleborg') as HTMLInputElement;
    fireEvent.change(trelleborgInput, { target: { value: '35' } });
    await user.click(screen.getByRole('button', { name: 'Spara' }));

    await waitFor(() => {
      expect(screen.getByText('13/35')).toBeInTheDocument();
    });
  });
});
