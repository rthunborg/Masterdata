'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export function SplashScreen() {
  const [isVisible, setIsVisible] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (PWA)
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    setIsStandalone(isStandaloneMode);

    if (isStandaloneMode) {
      // Show splash screen on PWA launch
      setIsVisible(true);

      // Hide splash screen after app loads (2 seconds or when page is ready)
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 2000);

      // Also hide when page is fully loaded
      if (document.readyState === 'complete') {
        setIsVisible(false);
        clearTimeout(timer);
      } else {
        window.addEventListener('load', () => {
          setIsVisible(false);
          clearTimeout(timer);
        });
      }

      return () => {
        clearTimeout(timer);
        window.removeEventListener('load', () => {});
      };
    }
  }, []);

  if (!isStandalone || !isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-24 w-24 md:h-32 md:w-32">
          <Image
            src="/images/stena-logo.png"
            alt="Stena Line"
            fill
            className="object-contain"
            priority
            unoptimized
          />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-semibold text-[#1e40af] md:text-2xl">
            HR Masterdata
          </h1>
          <p className="text-sm text-muted-foreground md:text-base">Stena Line</p>
        </div>
      </div>
    </div>
  );
}

