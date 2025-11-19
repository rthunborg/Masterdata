'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export interface UsePullToRefreshOptions {
  /**
   * Minimum distance in pixels to trigger refresh (default: 80)
   */
  threshold?: number;
  
  /**
   * Whether pull-to-refresh is enabled (default: true)
   * Set to false on desktop devices
   */
  enabled?: boolean;
  
  /**
   * Callback when refresh should be triggered
   */
  onRefresh: () => Promise<void>;
  
  /**
   * Callback when refresh completes successfully
   */
  onRefreshComplete?: () => void;
  
  /**
   * Callback when refresh fails
   */
  onRefreshError?: (error: Error) => void;
}

export interface UsePullToRefreshReturn {
  /**
   * Whether user is currently pulling
   */
  isPulling: boolean;
  
  /**
   * Current pull distance in pixels
   */
  pullDistance: number;
  
  /**
   * Whether pull distance has reached threshold
   */
  shouldRefresh: boolean;
  
  /**
   * Whether refresh is in progress
   */
  isRefreshing: boolean;
  
  /**
   * Touch event handlers to attach to container element
   */
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
  };
  
  /**
   * Ref to attach to scrollable container
   */
  containerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Custom hook for pull-to-refresh functionality on mobile devices
 * 
 * @example
 * const { isPulling, pullDistance, shouldRefresh, isRefreshing, handlers, containerRef } = usePullToRefresh({
 *   threshold: 80,
 *   enabled: isMobile,
 *   onRefresh: async () => {
 *     await refetch();
 *   },
 * });
 */
export function usePullToRefresh({
  threshold = 80,
  enabled = true,
  onRefresh,
  onRefreshComplete,
  onRefreshError,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const touchStartY = useRef<number>(0);
  const touchCurrentY = useRef<number>(0);
  const isAtTop = useRef<boolean>(true);
  const isRefreshingRef = useRef<boolean>(false);
  const isPullingRef = useRef<boolean>(false);

  // Check if container is scrolled to top
  const checkIfAtTop = useCallback(() => {
    if (!containerRef.current) {
      // If no container ref, check window scroll (fallback for body scrolling)
      if (typeof window !== 'undefined') {
        return window.scrollY === 0;
      }
      return false;
    }
    return containerRef.current.scrollTop === 0;
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled || isRefreshingRef.current) {
      return;
    }

    // Only handle if scrolled to top
    if (!checkIfAtTop()) {
      return;
    }

    const touch = e.touches[0];
    if (touch) {
      touchStartY.current = touch.clientY;
      touchCurrentY.current = touch.clientY;
      isAtTop.current = true;
      isPullingRef.current = true;
      setIsPulling(true);
    }
  }, [enabled, checkIfAtTop]);

  // Handle touch move
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled || !isPulling || isRefreshingRef.current) {
      return;
    }

    // Only allow pull if at top
    if (!isAtTop.current || !checkIfAtTop()) {
      isPullingRef.current = false;
      setIsPulling(false);
      setPullDistance(0);
      return;
    }

    const touch = e.touches[0];
    if (touch) {
      touchCurrentY.current = touch.clientY;
      const deltaY = touchCurrentY.current - touchStartY.current;
      
      // Only allow downward pull
      if (deltaY > 0) {
        // Apply rubber-band effect: resistance increases as you pull
        const resistance = 0.5; // Makes pull feel more natural
        const distance = deltaY * resistance;
        setPullDistance(distance);
        
        // Prevent default scrolling when pulling
        if (distance > 10) {
          e.preventDefault();
        }
      } else {
        setPullDistance(0);
      }
    }
  }, [enabled, isPulling, checkIfAtTop]);

  // Handle touch end
  const handleTouchEnd = useCallback(async (e: React.TouchEvent) => {
    if (!enabled || !isPulling) {
      return;
    }

    isPullingRef.current = false;
    setIsPulling(false);
    
    // Check if threshold is reached
    if (pullDistance >= threshold && !isRefreshingRef.current) {
      setIsRefreshing(true);
      isRefreshingRef.current = true;
      
      try {
        await onRefresh();
        onRefreshComplete?.();
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Refresh failed');
        onRefreshError?.(err);
      } finally {
        setIsRefreshing(false);
        isRefreshingRef.current = false;
        setPullDistance(0);
      }
    } else {
      // Reset if threshold not reached
      setPullDistance(0);
    }
  }, [enabled, isPulling, pullDistance, threshold, onRefresh, onRefreshComplete, onRefreshError]);

  // Reset pull distance when not pulling
  useEffect(() => {
    if (!isPulling && !isRefreshing) {
      const timer = setTimeout(() => {
        setPullDistance(0);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isPulling, isRefreshing]);

  // Update isAtTop when scrolling
  useEffect(() => {
    const container = containerRef.current;
    
    const handleScroll = () => {
      if (container) {
        isAtTop.current = container.scrollTop === 0;
      } else if (typeof window !== 'undefined') {
        // Fallback to window scroll for body scrolling
        isAtTop.current = window.scrollY === 0;
      }
      
      if (!isAtTop.current && isPullingRef.current) {
        isPullingRef.current = false;
        setIsPulling(false);
        setPullDistance(0);
      }
    };

    if (container) {
      container.addEventListener('scroll', handleScroll);
    } else if (typeof window !== 'undefined') {
      window.addEventListener('scroll', handleScroll);
    }
    
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      } else if (typeof window !== 'undefined') {
        window.removeEventListener('scroll', handleScroll);
      }
    };
  }, []); // Empty dependency array - scroll listener doesn't need to be recreated

  const shouldRefresh = pullDistance >= threshold;

  return {
    isPulling,
    pullDistance,
    shouldRefresh,
    isRefreshing,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    containerRef,
  };
}

