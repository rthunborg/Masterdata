'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/lib/navigation';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

export function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggleLocale = () => {
    const newLocale = locale === 'en' ? 'sv' : 'en';
    // Use next-intl router which handles locale switching
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <Button
      onClick={toggleLocale}
      variant="ghost"
      size="sm"
      className="gap-2"
      aria-label={`Switch to ${locale === 'en' ? 'Swedish' : 'English'}`}
    >
      <Globe className="h-4 w-4" />
      <span className="hidden sm:inline">
        {locale === 'en' ? '🇬🇧 EN' : '🇸🇪 SV'}
      </span>
      <span className="sm:hidden">
        {locale === 'en' ? '🇬🇧' : '🇸🇪'}
      </span>
    </Button>
  );
}
