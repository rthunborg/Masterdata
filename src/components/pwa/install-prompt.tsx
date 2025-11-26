'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useTranslations } from '@/lib/i18n';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Type guard for iOS standalone mode
function isIOSStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

// Installation criteria tracking
const INSTALL_CRITERIA = {
  MIN_VISITS: 2,
  MIN_TIME_SECONDS: 30,
  DISMISSAL_COOLDOWN_DAYS: 7,
};

const STORAGE_KEYS = {
  VISIT_COUNT: 'pwa_visit_count',
  TIME_SPENT: 'pwa_time_spent',
  LAST_VISIT: 'pwa_last_visit',
  PROMPT_DISMISSED: 'pwa_prompt_dismissed',
};

function getVisitCount(): number {
  if (typeof window === 'undefined') return 0;
  const count = localStorage.getItem(STORAGE_KEYS.VISIT_COUNT);
  return count ? parseInt(count, 10) : 0;
}

function incrementVisitCount(): void {
  if (typeof window === 'undefined') return;
  const count = getVisitCount() + 1;
  localStorage.setItem(STORAGE_KEYS.VISIT_COUNT, count.toString());
  localStorage.setItem(STORAGE_KEYS.LAST_VISIT, Date.now().toString());
}

function getTimeSpent(): number {
  if (typeof window === 'undefined') return 0;
  const time = localStorage.getItem(STORAGE_KEYS.TIME_SPENT);
  return time ? parseInt(time, 10) : 0;
}

function addTimeSpent(seconds: number): void {
  if (typeof window === 'undefined') return;
  const current = getTimeSpent();
  localStorage.setItem(STORAGE_KEYS.TIME_SPENT, (current + seconds).toString());
}

function isPromptDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  const dismissed = localStorage.getItem(STORAGE_KEYS.PROMPT_DISMISSED);
  if (!dismissed) return false;
  
  const dismissedTime = parseInt(dismissed, 10);
  const daysSinceDismissal = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
  return daysSinceDismissal < INSTALL_CRITERIA.DISMISSAL_COOLDOWN_DAYS;
}

function markPromptDismissed(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.PROMPT_DISMISSED, Date.now().toString());
}

function meetsInstallCriteria(): boolean {
  const visitCount = getVisitCount();
  const timeSpent = getTimeSpent();
  
  return (
    visitCount >= INSTALL_CRITERIA.MIN_VISITS &&
    timeSpent >= INSTALL_CRITERIA.MIN_TIME_SECONDS &&
    !isPromptDismissed()
  );
}

export function InstallPrompt() {
  const tToasts = useTranslations("toasts");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if running as PWA (iOS)
    if (isIOSStandalone()) {
      setIsInstalled(true);
      return;
    }

    // Track visit
    incrementVisitCount();

    // Track time spent on page (accumulate across sessions)
    const sessionStartTime = Date.now();
    let lastUpdateTime = sessionStartTime;
    
    const timeTracker = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - lastUpdateTime) / 1000);
      if (elapsed > 0) {
        const currentTotal = getTimeSpent();
        localStorage.setItem(STORAGE_KEYS.TIME_SPENT, (currentTotal + elapsed).toString());
        lastUpdateTime = now;
      }
    }, 1000); // Update every second
    
    // Save final session time on page unload
    const handleBeforeUnload = () => {
      const sessionDuration = Math.floor((Date.now() - sessionStartTime) / 1000);
      const currentTotal = getTimeSpent();
      // Calculate remaining time not yet saved
      const savedDuration = Math.floor((lastUpdateTime - sessionStartTime) / 1000);
      const remainingTime = sessionDuration - savedDuration;
      if (remainingTime > 0) {
        localStorage.setItem(STORAGE_KEYS.TIME_SPENT, (currentTotal + remainingTime).toString());
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      
      // Check if criteria are met before showing prompt
      if (meetsInstallCriteria()) {
        // Show prompt after a brief delay for better UX
        setTimeout(() => {
          setShowPrompt(true);
        }, 2000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowPrompt(false);
      toast.success(tToasts("pwa.appInstalled"));
    });

    return () => {
      clearInterval(timeTracker);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Save final session time (cleanup)
      const sessionDuration = Math.floor((Date.now() - sessionStartTime) / 1000);
      const currentTotal = getTimeSpent();
      const savedDuration = Math.floor((lastUpdateTime - sessionStartTime) / 1000);
      const remainingTime = sessionDuration - savedDuration;
      if (remainingTime > 0) {
        localStorage.setItem(STORAGE_KEYS.TIME_SPENT, (currentTotal + remainingTime).toString());
      }
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    try {
      // Show the install prompt
      await deferredPrompt.prompt();

      // Wait for user response
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        toast.success(tToasts("pwa.installing"));
        setDeferredPrompt(null);
        setShowPrompt(false);
      } else {
        toast.info(tToasts("pwa.installationCancelled"));
      }
    } catch (error) {
      console.error('[PWA] Install prompt error:', error);
      toast.error(tToasts("pwa.installPromptFailed"));
    }
  };

  // Don't show if already installed or no prompt available
  if (isInstalled || !deferredPrompt || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <div className="bg-background border border-border rounded-lg shadow-lg p-4 flex flex-col gap-3">
        <div>
          <h3 className="font-semibold text-sm">Install HR Masterdata App</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Add to your home screen for quick access and app-like experience
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleInstallClick}
            size="sm"
            className="flex-1"
          >
            Install
          </Button>
          <Button
            onClick={() => {
              setShowPrompt(false);
              setDeferredPrompt(null);
              markPromptDismissed();
            }}
            variant="outline"
            size="sm"
          >
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
}

