import { getRequestConfig } from 'next-intl/server';

export const locales = ['sv', 'en'] as const;
export const defaultLocale = 'sv' as const;

export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ locale }) => {
  const validLocale = locale || defaultLocale;
  
  return {
    locale: validLocale,
    messages: (await import(`../messages/${validLocale}.json`)).default,
  };
});
