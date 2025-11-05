/**
 * Test wrapper utilities for i18n (Swedish-only)
 * 
 * Simple test utilities since the app is Swedish-only now
 * No provider needed - translations are direct imports from @/lib/i18n
 */

import React from 'react';
import { render, RenderOptions } from '@testing-library/react';

interface I18nWrapperProps {
  children: React.ReactNode;
}

/**
 * Wrapper component for backwards compatibility
 * No actual wrapping needed since translations are simple imports
 */
export function I18nWrapper({ children }: I18nWrapperProps) {
  return <>{children}</>;
}

/**
 * Custom render function for backwards compatibility
 * Simply renders without any provider wrapper
 */
export function renderWithI18n(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, {
    wrapper: ({ children }) => <I18nWrapper>{children}</I18nWrapper>,
    ...options,
  });
}
