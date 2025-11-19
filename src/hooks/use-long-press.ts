'use client';

import { useRef, useCallback } from 'react';

interface UseLongPressOptions {
  onLongPress: (event: React.TouchEvent | React.MouseEvent) => void;
  onClick?: (event: React.TouchEvent | React.MouseEvent) => void;
  delay?: number;
  threshold?: number; // Maximum movement allowed during press
}

/**
 * Hook for detecting long-press gestures
 * @param options - Configuration options
 * @returns Event handlers for touch and mouse events
 */
export function useLongPress({
  onLongPress,
  onClick,
  delay = 500,
  threshold = 10,
}: UseLongPressOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const isLongPressRef = useRef(false);

  const start = useCallback(
    (event: React.TouchEvent | React.MouseEvent) => {
      // Get initial position
      const clientX =
        'touches' in event ? event.touches[0].clientX : event.clientX;
      const clientY =
        'touches' in event ? event.touches[0].clientY : event.clientY;

      startPosRef.current = { x: clientX, y: clientY };
      isLongPressRef.current = false;

      // Set timeout for long-press
      timeoutRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        onLongPress(event);
      }, delay);
    },
    [onLongPress, delay]
  );

  const move = useCallback(
    (event: React.TouchEvent | React.MouseEvent) => {
      if (!startPosRef.current) return;

      // Get current position
      const clientX =
        'touches' in event ? event.touches[0].clientX : event.clientX;
      const clientY =
        'touches' in event ? event.touches[0].clientY : event.clientY;

      // Calculate movement distance
      const deltaX = Math.abs(clientX - startPosRef.current.x);
      const deltaY = Math.abs(clientY - startPosRef.current.y);
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Cancel if moved too far
      if (distance > threshold && timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        startPosRef.current = null;
      }
    },
    [threshold]
  );

  const end = useCallback(
    (event: React.TouchEvent | React.MouseEvent) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Only trigger onClick if it wasn't a long-press
      if (!isLongPressRef.current && onClick) {
        onClick(event);
      }

      isLongPressRef.current = false;
      startPosRef.current = null;
    },
    [onClick]
  );

  return {
    onTouchStart: start,
    onTouchMove: move,
    onTouchEnd: end,
    onMouseDown: start,
    onMouseMove: move,
    onMouseUp: end,
    onMouseLeave: end, // Cancel if mouse leaves element
  };
}

