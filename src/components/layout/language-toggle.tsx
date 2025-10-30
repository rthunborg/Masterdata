'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/lib/navigation';
import { Button } from '@/components/ui/button';

export function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchToLocale = (newLocale: 'en' | 'sv') => {
    if (newLocale === locale) return; // Already on this locale
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Language selection">
      {/* Swedish Flag */}
      <Button
        onClick={() => switchToLocale('sv')}
        variant={locale === 'sv' ? 'default' : 'ghost'}
        size="sm"
        disabled={locale === 'sv'}
        className={locale === 'sv' ? 'cursor-default' : ''}
        aria-label="Byt till svenska"
        aria-pressed={locale === 'sv'}
      >
        🇸🇪 <span className="hidden sm:inline ml-1">SV</span>
      </Button>

      {/* English Flag */}
      <Button
        onClick={() => switchToLocale('en')}
        variant={locale === 'en' ? 'default' : 'ghost'}
        size="sm"
        disabled={locale === 'en'}
        className={locale === 'en' ? 'cursor-default' : ''}
        aria-label="Switch to English"
        aria-pressed={locale === 'en'}
      >
        🇬🇧 <span className="hidden sm:inline ml-1">EN</span>
      </Button>
    </div>
  );
}
