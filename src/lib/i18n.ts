/**
 * Simple translation utility for Swedish-only application
 * Loads translations from messages/sv.json and provides type-safe access
 */

import { useMemo } from 'react';
import translations from '../../messages/sv.json';

// Export the translations object with proper typing
export const t = translations;

// Export a hook for consistency with previous pattern
// This allows existing code patterns to work with minimal changes
// Returns a stable function reference to avoid causing re-renders
export function useTranslations(namespace: keyof typeof translations) {
  return useMemo(() => {
    return (key: string, params?: Record<string, string | number>) => {
      const keys = key.split('.');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let value: any = translations[namespace];
      
      for (const k of keys) {
        if (value && typeof value === 'object') {
          value = value[k];
        } else {
          return key; // Return key if translation not found
        }
      }
      
      let result = value || key;
      
      // Handle parameter substitution like {name}, {email}, etc.
      if (params && typeof result === 'string') {
        Object.entries(params).forEach(([paramKey, paramValue]) => {
          result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
        });
      }
      
      return result;
    };
  }, [namespace]); // Only recreate if namespace changes (which it never does in practice)
}

// Export a simple formatter hook to replace next-intl's useFormatter
export function useFormatter() {
  return {
    dateTime: (date: Date | string | null, options?: Intl.DateTimeFormatOptions) => {
      if (!date) return '';
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return new Intl.DateTimeFormat('sv-SE', options).format(dateObj);
    },
    relativeTime: (date: Date | string | null) => {
      if (!date) return '';
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      const rtf = new Intl.RelativeTimeFormat('sv', { numeric: 'auto' });
      const diffInSeconds = Math.floor((dateObj.getTime() - Date.now()) / 1000);
      
      if (Math.abs(diffInSeconds) < 60) return rtf.format(diffInSeconds, 'second');
      if (Math.abs(diffInSeconds) < 3600) return rtf.format(Math.floor(diffInSeconds / 60), 'minute');
      if (Math.abs(diffInSeconds) < 86400) return rtf.format(Math.floor(diffInSeconds / 3600), 'hour');
      if (Math.abs(diffInSeconds) < 2592000) return rtf.format(Math.floor(diffInSeconds / 86400), 'day');
      if (Math.abs(diffInSeconds) < 31536000) return rtf.format(Math.floor(diffInSeconds / 2592000), 'month');
      return rtf.format(Math.floor(diffInSeconds / 31536000), 'year');
    }
  };
}
