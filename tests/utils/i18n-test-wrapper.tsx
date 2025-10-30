/**
 * Test wrapper utilities for i18n (next-intl)
 * 
 * Provides a wrapper component for testing components that use useTranslations hook
 */

import React from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { render, RenderOptions } from '@testing-library/react';

// Import actual translation messages
import enMessages from '../../messages/en.json';
import svMessages from '../../messages/sv.json';

const messages = {
  en: enMessages,
  sv: svMessages,
};

interface I18nWrapperProps {
  children: React.ReactNode;
  locale?: 'en' | 'sv';
}

/**
 * Wrapper component that provides i18n context for tests
 */
export function I18nWrapper({ children, locale = 'en' }: I18nWrapperProps) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages[locale]}>
      {children}
    </NextIntlClientProvider>
  );
}

/**
 * Custom render function that wraps components with i18n provider
 */
export function renderWithI18n(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { locale?: 'en' | 'sv' }
) {
  const { locale = 'en', ...renderOptions } = options || {};
  
  return render(ui, {
    wrapper: ({ children }) => <I18nWrapper locale={locale}>{children}</I18nWrapper>,
    ...renderOptions,
  });
}
