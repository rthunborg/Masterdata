'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

const SW_PATH = '/sw.js';

export function ServiceWorkerRegister() {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const isMountedRef = useRef(true);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const controllerChangeHandlerRef = useRef<() => void | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    isMountedRef.current = true;

    async function registerServiceWorker() {
      try {
        const registration = await navigator.serviceWorker.register(SW_PATH, {
          scope: '/',
        });

        if (!isMountedRef.current) return;

        registrationRef.current = registration;

        // Check for updates immediately
        await registration.update();

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is installed and waiting (not yet activated)
              if (isMountedRef.current) {
                toast.info('App updated. Refresh to see changes.', {
                  duration: 10000,
                  action: {
                    label: 'Refresh Now',
                    onClick: () => {
                      // User explicitly requests update - activate immediately
                      newWorker.postMessage({ type: 'SKIP_WAITING' });
                      window.location.reload();
                    },
                  },
                });
              }
            }
          });
        });

        // Listen for controller change (service worker activated)
        const handleControllerChange = () => {
          if (isMountedRef.current) {
            // Service worker has been activated
            // Show notification and reload on next navigation (per AC4 requirement)
            toast.info('App updated. Changes will apply on next page navigation.', {
              duration: 5000,
            });
            // Reload on next navigation instead of immediately
            const handleNavigation = () => {
              window.location.reload();
            };
            // Reload when user navigates (link click, back/forward, etc.)
            window.addEventListener('beforeunload', handleNavigation);
            // Also reload after a short delay if user doesn't navigate
            setTimeout(() => {
              if (isMountedRef.current) {
                window.location.reload();
              }
            }, 10000); // 10 second grace period
          }
        };

        controllerChangeHandlerRef.current = handleControllerChange;
        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

        // Periodic update check (every 5 minutes)
        updateIntervalRef.current = setInterval(() => {
          if (registrationRef.current) {
            registrationRef.current.update();
          }
        }, 5 * 60 * 1000);
      } catch (error) {
        console.error('[PWA] Service Worker registration failed:', error);
      }
    }

    registerServiceWorker();

    return () => {
      isMountedRef.current = false;
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      if (controllerChangeHandlerRef.current) {
        navigator.serviceWorker.removeEventListener(
          'controllerchange',
          controllerChangeHandlerRef.current
        );
      }
    };
  }, []);

  return null; // This component doesn't render anything
}

