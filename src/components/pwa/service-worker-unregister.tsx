'use client';

import { useEffect } from 'react';

export function ServiceWorkerUnregister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
          console.log('[SW] Service worker unregistered');
        }
      });
    }
  }, []);

  return null;
}

