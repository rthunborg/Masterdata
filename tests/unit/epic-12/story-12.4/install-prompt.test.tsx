import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InstallPrompt } from '@/components/pwa/install-prompt';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('InstallPrompt', () => {
  const mockPrompt = vi.fn();
  const mockUserChoice = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Clear localStorage
    localStorage.clear();

    // Set up installation criteria to be met (for tests that need prompt to show)
    localStorage.setItem('pwa_visit_count', '2');
    localStorage.setItem('pwa_time_spent', '30');

    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    // Mock navigator.standalone (iOS)
    Object.defineProperty(window.navigator, 'standalone', {
      value: false,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not render if app is already installed (standalone mode)', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: query === '(display-mode: standalone)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const { container } = render(<InstallPrompt />);

    expect(container.firstChild).toBeNull();
  });

  it('should not render if navigator.standalone is true (iOS)', () => {
    Object.defineProperty(window.navigator, 'standalone', {
      value: true,
      writable: true,
      configurable: true,
    });

    const { container } = render(<InstallPrompt />);

    expect(container.firstChild).toBeNull();
  });

  it('should show prompt when beforeinstallprompt event fires', async () => {
    const { container } = render(<InstallPrompt />);

    // Simulate beforeinstallprompt event
    const event = new Event('beforeinstallprompt') as any;
    event.preventDefault = vi.fn();
    event.prompt = mockPrompt;
    event.userChoice = Promise.resolve({ outcome: 'accepted' as const });

    window.dispatchEvent(event);

    // Wait for prompt to appear (2 second delay)
    await waitFor(
      () => {
        expect(screen.queryByText('Install HR Masterdata App')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('should call prompt when install button is clicked', async () => {
    const user = userEvent.setup();

    render(<InstallPrompt />);

    // Simulate beforeinstallprompt event
    const event = new Event('beforeinstallprompt') as any;
    event.preventDefault = vi.fn();
    event.prompt = mockPrompt;
    event.userChoice = Promise.resolve({ outcome: 'accepted' as const });

    window.dispatchEvent(event);

    // Wait for prompt to appear
    await waitFor(
      () => {
        expect(screen.queryByText('Install HR Masterdata App')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    const installButton = screen.getByText('Install');
    await user.click(installButton);

    expect(mockPrompt).toHaveBeenCalled();
  });

  it('should hide prompt when "Not now" is clicked', async () => {
    const user = userEvent.setup();

    render(<InstallPrompt />);

    // Simulate beforeinstallprompt event
    const event = new Event('beforeinstallprompt') as any;
    event.preventDefault = vi.fn();
    event.prompt = mockPrompt;
    event.userChoice = Promise.resolve({ outcome: 'dismissed' as const });

    window.dispatchEvent(event);

    // Wait for prompt to appear
    await waitFor(
      () => {
        expect(screen.queryByText('Install HR Masterdata App')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    const notNowButton = screen.getByText('Not now');
    await user.click(notNowButton);

    await waitFor(() => {
      expect(screen.queryByText('Install HR Masterdata App')).not.toBeInTheDocument();
    });
  });
});

