import { useState, useCallback, useRef, useEffect } from "react";

interface UseCardSwipeOptions {
  isMobile: boolean;
  isHRAdmin: boolean;
  actionButtonsWidth?: number;
}

/**
 * Encapsulates swipe-to-reveal gesture state and handlers for mobile card actions.
 * Manages touch tracking, horizontal offset, haptic feedback, and click-outside reset.
 */
export function useCardSwipe({
  isMobile,
  isHRAdmin,
  actionButtonsWidth = 240,
}: UseCardSwipeOptions) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number; offset: number } | null>(null);
  const swipeOffsetRef = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const updateSwipeOffset = useCallback((offset: number) => {
    swipeOffsetRef.current = offset;
    setSwipeOffset(offset);
  }, []);

  const resetSwipe = useCallback(() => {
    updateSwipeOffset(0);
    setIsSwiping(false);
    touchStartRef.current = null;
  }, [updateSwipeOffset]);

  const triggerHapticFeedback = useCallback(() => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(10);
    }
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!isMobile || !isHRAdmin) return;
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        offset: swipeOffsetRef.current,
      };
      setIsSwiping(true);
    },
    [isMobile, isHRAdmin]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isMobile || !isHRAdmin || !touchStartRef.current) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      // Prioritize vertical scroll if gesture is ambiguous
      if (absDeltaY > absDeltaX) return;

      if (absDeltaX > 10) {
        e.preventDefault();
      }

      const nextOffset = touchStartRef.current.offset + deltaX;
      updateSwipeOffset(Math.min(0, Math.max(-actionButtonsWidth, nextOffset)));
    },
    [isMobile, isHRAdmin, actionButtonsWidth, updateSwipeOffset]
  );

  const handleTouchEnd = useCallback((e?: React.TouchEvent) => {
    if (!isMobile || !isHRAdmin || !touchStartRef.current) return;

    const threshold = 50;
    const endTouch = e?.changedTouches[0];
    const endDeltaX = endTouch ? endTouch.clientX - touchStartRef.current.x : 0;

    if (touchStartRef.current.offset < 0 && endDeltaX > threshold) {
      resetSwipe();
      return;
    }

    const currentOffset = swipeOffsetRef.current;
    if (Math.abs(currentOffset) >= threshold && currentOffset < -threshold) {
      updateSwipeOffset(-actionButtonsWidth);
      triggerHapticFeedback();
    } else {
      resetSwipe();
    }

    setIsSwiping(false);
    touchStartRef.current = null;
  }, [
    isMobile,
    isHRAdmin,
    actionButtonsWidth,
    updateSwipeOffset,
    triggerHapticFeedback,
    resetSwipe,
  ]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        if (swipeOffset < 0) {
          resetSwipe();
        }
      }
    };

    if (swipeOffset < 0) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [swipeOffset, resetSwipe]);

  return {
    swipeOffset,
    isSwiping,
    cardRef,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    resetSwipe,
    triggerHapticFeedback,
  };
}
