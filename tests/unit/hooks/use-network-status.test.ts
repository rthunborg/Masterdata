/**
 * Unit Tests for useNetworkStatus Hook
 * Story 12.3: Offline Support with Local Caching
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useNetworkStatus } from '@/lib/hooks/use-network-status';

describe('useNetworkStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: true,
    });

    // Mock window events
    global.window.addEventListener = vi.fn();
    global.window.removeEventListener = vi.fn();
  });

  it('should initialize with online status when navigator.onLine is true', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: true,
    });

    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isSlowConnection).toBe(false);
  });

  it('should initialize with offline status when navigator.onLine is false', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: false,
    });

    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isOnline).toBe(false);
  });

  it('should detect slow connection when effectiveType is 2g', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: true,
    });

    // Mock Network Information API
    const mockConnection = {
      effectiveType: '2g',
      downlink: 0.5,
      saveData: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    (navigator as any).connection = mockConnection;

    const { result } = renderHook(() => useNetworkStatus());

    waitFor(() => {
      expect(result.current.isSlowConnection).toBe(true);
    });
  });

  it('should detect slow connection when effectiveType is slow-2g', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: true,
    });

    const mockConnection = {
      effectiveType: 'slow-2g',
      downlink: 0.5,
      saveData: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    (navigator as any).connection = mockConnection;

    const { result } = renderHook(() => useNetworkStatus());

    waitFor(() => {
      expect(result.current.isSlowConnection).toBe(true);
    });
  });

  it('should set connectionType when Network Information API is available', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: true,
    });

    const mockConnection = {
      effectiveType: '4g',
      downlink: 10,
      saveData: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    (navigator as any).connection = mockConnection;

    const { result } = renderHook(() => useNetworkStatus());

    waitFor(() => {
      expect(result.current.connectionType).toBe('4g');
    });
  });

  it('should handle missing Network Information API gracefully', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: true,
    });

    delete (navigator as any).connection;

    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isSlowConnection).toBe(false);
    expect(result.current.connectionType).toBeUndefined();
  });
});

