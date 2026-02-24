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
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const resetSwipe = useCallback(() => {
    setSwipeOffset(0);
    setIsSwiping(false);
    touchStartRef.current = null;
  }, []);

  const triggerHapticFeedback = useCallback(() => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(10);
    }
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!isMobile || !isHRAdmin) return;
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
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

      // Only allow left swipe (negative deltaX)
      if (deltaX < 0) {
        setSwipeOffset(Math.max(-actionButtonsWidth, deltaX));
      }
    },
    [isMobile, isHRAdmin, actionButtonsWidth]
  );

  const handleTouchEnd = useCallback(() => {
    if (!isMobile || !isHRAdmin || !touchStartRef.current) return;

    const threshold = 50;
    if (Math.abs(swipeOffset) >= threshold && swipeOffset < -threshold) {
      setSwipeOffset(-actionButtonsWidth);
      triggerHapticFeedback();
    } else {
      resetSwipe();
    }

    setIsSwiping(false);
    touchStartRef.current = null;
  }, [
    isMobile,
    isHRAdmin,
    swipeOffset,
    actionButtonsWidth,
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
