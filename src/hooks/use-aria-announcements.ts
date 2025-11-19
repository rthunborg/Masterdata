'use client';

import { useEffect, useRef } from 'react';

/**
 * Hook to announce validation errors to screen readers
 * Story 12.7: Enhanced Mobile Accessibility
 */
export function useAriaAnnouncements(formErrors: Record<string, { message?: string } | undefined>) {
  const announcementRef = useRef<HTMLDivElement>(null);
  const previousErrorsRef = useRef<string>('');

  useEffect(() => {
    if (!announcementRef.current) return;

    // Get all current error messages
    const errorMessages = Object.entries(formErrors)
      .filter(([_, error]) => error?.message)
      .map(([field, error]) => `${field}: ${error?.message}`)
      .join('. ');

    // Only announce if errors have changed
    if (errorMessages && errorMessages !== previousErrorsRef.current) {
      announcementRef.current.textContent = errorMessages;
      previousErrorsRef.current = errorMessages;
    } else if (!errorMessages) {
      // Clear announcement when no errors
      announcementRef.current.textContent = '';
      previousErrorsRef.current = '';
    }
  }, [formErrors]);

  return announcementRef;
}

