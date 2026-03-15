import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { StaffingNeedsHistoryModal } from '@/components/dashboard/staffing-needs-history-modal';
import type { StaffingNeedsChangelogEntry } from '@/lib/types/staffing-needs';

const mockEntries: StaffingNeedsChangelogEntry[] = [
  {
    id: '1',
    location: 'Göteborg',
    old_value: 25,
    new_value: 30,
    changed_by: 'user-1',
    changed_at: '2026-03-10T14:30:00Z',
    changed_by_email: 'anna.svensson@stenaline.com',
  },
  {
    id: '2',
    location: 'Göteborg',
    old_value: 20,
    new_value: 25,
    changed_by: 'user-2',
    changed_at: '2026-03-05T09:15:00Z',
    changed_by_email: 'erik.johansson@stenaline.com',
  },
];

describe('StaffingNeedsHistoryModal', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    location: 'Göteborg' as const,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    defaultProps.onOpenChange = vi.fn();
  });

  it('renders entries in reverse chronological order with correct details', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockEntries }),
    } as Response);

    render(<StaffingNeedsHistoryModal {...defaultProps} />);

    // Title includes location
    expect(screen.getAllByText('Ändringshistorik — Göteborg').length).toBeGreaterThanOrEqual(1);

    // Wait for entries to render
    await waitFor(() => {
      expect(screen.getByTestId('history-list')).toBeInTheDocument();
    });

    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(2);

    // First entry (newest) shows anna's change: 25 → 30
    expect(listItems[0]).toHaveTextContent('anna.svensson@stenaline.com');
    expect(listItems[0]).toHaveTextContent('25 → 30');

    // Second entry (older) shows erik's change: 20 → 25
    expect(listItems[1]).toHaveTextContent('erik.johansson@stenaline.com');
    expect(listItems[1]).toHaveTextContent('20 → 25');

    // Verify fetch was called with correct URL
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/staffing-needs/history?location=G%C3%B6teborg'
    );
  });

  it('shows empty state when no history exists', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    } as Response);

    render(<StaffingNeedsHistoryModal {...defaultProps} />);

    const currentYear = new Date().getFullYear();

    await waitFor(() => {
      expect(screen.getByTestId('history-empty')).toBeInTheDocument();
    });

    expect(
      screen.getByText(`Inga ändringar under ${currentYear}`)
    ).toBeInTheDocument();
  });

  it('shows error state on fetch failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    render(<StaffingNeedsHistoryModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('history-error')).toBeInTheDocument();
    });

    expect(
      screen.getByText('Kunde inte hämta ändringshistorik')
    ).toBeInTheDocument();
  });

  it('shows loading state while fetching', () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => {}));

    render(<StaffingNeedsHistoryModal {...defaultProps} />);

    expect(screen.getByTestId('history-loading')).toBeInTheDocument();
    expect(screen.getByText('Laddar…')).toBeInTheDocument(); // sv.json staffingNeeds.loading
  });

  it('does not render when location is null', () => {
    const { container } = render(
      <StaffingNeedsHistoryModal
        open={true}
        onOpenChange={vi.fn()}
        location={null}
      />
    );

    expect(container.innerHTML).toBe('');
  });
});
