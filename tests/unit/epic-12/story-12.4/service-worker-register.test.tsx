import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
  },
}));

describe('ServiceWorkerRegister', () => {
  const mockRegister = vi.fn();
  const mockUpdate = vi.fn();
  const mockAddEventListener = vi.fn();
  const mockRemoveEventListener = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock navigator.serviceWorker
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: mockRegister,
        controller: null,
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener,
      },
      writable: true,
      configurable: true,
    });

    // Mock ServiceWorkerRegistration
    const mockRegistration = {
      installing: null,
      waiting: null,
      active: null,
      update: mockUpdate,
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    };

    mockRegister.mockResolvedValue(mockRegistration);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should register service worker on mount', async () => {
    render(<ServiceWorkerRegister />);

    // Wait for async registration
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockRegister).toHaveBeenCalledWith('/sw.js', { scope: '/' });
  });

  it('should check for updates after registration', async () => {
    render(<ServiceWorkerRegister />);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockUpdate).toHaveBeenCalled();
  });

  it('should not register if service worker is not supported', () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    render(<ServiceWorkerRegister />);

    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('should set up update listener', async () => {
    render(<ServiceWorkerRegister />);

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should add event listeners
    expect(mockAddEventListener).toHaveBeenCalled();
  });

  it('should clean up event listeners on unmount', async () => {
    const { unmount } = render(<ServiceWorkerRegister />);

    await new Promise((resolve) => setTimeout(resolve, 100));

    unmount();

    expect(mockRemoveEventListener).toHaveBeenCalled();
  });
});

