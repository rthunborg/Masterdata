/**
 * Unit Tests: useLongPress Hook
 * Story 12.6: Mobile Quick Actions and Shortcuts - AC 1
 * 
 * Tests that long-press detection works correctly with touch events.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLongPress } from '@/hooks/use-long-press';

describe('useLongPress (Story 12.6)', () => {
  let mockOnLongPress: (event: React.TouchEvent | React.MouseEvent) => void;
  let mockOnClick: (event: React.TouchEvent | React.MouseEvent) => void;

  beforeEach(() => {
    vi.useFakeTimers();
    mockOnLongPress = vi.fn();
    mockOnClick = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should trigger onLongPress after delay (500ms)', () => {
    const { result } = renderHook(() =>
      useLongPress({
        onLongPress: mockOnLongPress,
        delay: 500,
      })
    );

    const touchEvent = {
      touches: [{ clientX: 100, clientY: 100 }],
      clientX: 100,
      clientY: 100,
    } as unknown as React.TouchEvent;

    act(() => {
      result.current.onTouchStart(touchEvent);
    });

    // Fast-forward 499ms - should not trigger yet
    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(mockOnLongPress).not.toHaveBeenCalled();

    // Fast-forward 1ms more - should trigger now
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(mockOnLongPress).toHaveBeenCalledTimes(1);
    expect(mockOnLongPress).toHaveBeenCalledWith(touchEvent);
  });

  it('should cancel long-press if touch moves beyond threshold', () => {
    const { result } = renderHook(() =>
      useLongPress({
        onLongPress: mockOnLongPress,
        delay: 500,
        threshold: 10,
      })
    );

    const touchStart = {
      touches: [{ clientX: 100, clientY: 100 }],
    } as unknown as React.TouchEvent;

    act(() => {
      result.current.onTouchStart(touchStart);
    });

    // Move beyond threshold
    const touchMove = {
      touches: [{ clientX: 115, clientY: 100 }], // 15px movement
    } as unknown as React.TouchEvent;

    act(() => {
      result.current.onTouchMove(touchMove);
    });

    // Fast-forward past delay - should not trigger
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(mockOnLongPress).not.toHaveBeenCalled();
  });

  it('should not cancel if movement is within threshold', () => {
    const { result } = renderHook(() =>
      useLongPress({
        onLongPress: mockOnLongPress,
        delay: 500,
        threshold: 10,
      })
    );

    const touchStart = {
      touches: [{ clientX: 100, clientY: 100 }],
    } as unknown as React.TouchEvent;

    act(() => {
      result.current.onTouchStart(touchStart);
    });

    // Move within threshold
    const touchMove = {
      touches: [{ clientX: 105, clientY: 100 }], // 5px movement
    } as unknown as React.TouchEvent;

    act(() => {
      result.current.onTouchMove(touchMove);
    });

    // Fast-forward past delay - should still trigger
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(mockOnLongPress).toHaveBeenCalledTimes(1);
  });

  it('should trigger onClick if long-press is not triggered', () => {
    const { result } = renderHook(() =>
      useLongPress({
        onLongPress: mockOnLongPress,
        onClick: mockOnClick,
        delay: 500,
      })
    );

    const touchEvent = {
      touches: [{ clientX: 100, clientY: 100 }],
    } as unknown as React.TouchEvent;

    act(() => {
      result.current.onTouchStart(touchEvent);
    });

    // End touch before delay completes
    act(() => {
      result.current.onTouchEnd(touchEvent);
    });

    // Fast-forward past delay
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(mockOnLongPress).not.toHaveBeenCalled();
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('should not trigger onClick if long-press was triggered', () => {
    const { result } = renderHook(() =>
      useLongPress({
        onLongPress: mockOnLongPress,
        onClick: mockOnClick,
        delay: 500,
      })
    );

    const touchEvent = {
      touches: [{ clientX: 100, clientY: 100 }],
    } as unknown as React.TouchEvent;

    act(() => {
      result.current.onTouchStart(touchEvent);
    });

    // Fast-forward past delay to trigger long-press
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(mockOnLongPress).toHaveBeenCalledTimes(1);

    // End touch - should not trigger onClick
    act(() => {
      result.current.onTouchEnd(touchEvent);
    });

    expect(mockOnClick).not.toHaveBeenCalled();
  });

  it('should work with mouse events', () => {
    const { result } = renderHook(() =>
      useLongPress({
        onLongPress: mockOnLongPress,
        delay: 500,
      })
    );

    const mouseEvent = {
      clientX: 100,
      clientY: 100,
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.onMouseDown(mouseEvent);
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(mockOnLongPress).toHaveBeenCalledTimes(1);
    expect(mockOnLongPress).toHaveBeenCalledWith(mouseEvent);
  });

  it('should cancel on mouse leave', () => {
    const { result } = renderHook(() =>
      useLongPress({
        onLongPress: mockOnLongPress,
        delay: 500,
      })
    );

    const mouseEvent = {
      clientX: 100,
      clientY: 100,
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.onMouseDown(mouseEvent);
    });

    // Mouse leaves before delay
    act(() => {
      result.current.onMouseLeave(mouseEvent);
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(mockOnLongPress).not.toHaveBeenCalled();
  });
});

