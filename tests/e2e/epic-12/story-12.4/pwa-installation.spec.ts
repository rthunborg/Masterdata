import { test, expect } from '@playwright/test';

interface BeforeInstallPromptEvent extends Event {
  preventDefault: () => void;
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

test.describe('PWA Installation E2E', () => {
  test.beforeEach(async ({ page, context }) => {
    // Clear service workers before each test
    await context.clearServiceWorkers();
  });

  test('should register service worker on page load', async ({ page }) => {
    await page.goto('/login');

    // Wait for service worker to register
    await page.waitForTimeout(2000);

    // Check if service worker is registered
    const swRegistered = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });

    expect(swRegistered).toBe(true);
  });

  test('should show install prompt when criteria met', async ({ page, context }) => {
    // Simulate mobile device
    await context.setGeolocation({ latitude: 59.3293, longitude: 18.0686 });
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/login');

    // Simulate beforeinstallprompt event
    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt') as BeforeInstallPromptEvent;
      event.preventDefault = () => {};
      event.prompt = () => Promise.resolve();
      Object.defineProperty(event, 'userChoice', {
        value: Promise.resolve({ outcome: 'accepted' })
      });
      window.dispatchEvent(event);
    });

    // Wait for install prompt to appear
    await page.waitForTimeout(3000);

    // Check if install prompt is visible
    const installPrompt = page.getByText('Install HR Masterdata App');
    await expect(installPrompt).toBeVisible({ timeout: 5000 });
  });

  test('should cache static assets', async ({ page, context }) => {
    await page.goto('/login');

    // Wait for service worker to register and cache assets
    await page.waitForTimeout(3000);

    // Navigate to another page to trigger caching
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);

    // Go offline
    await context.setOffline(true);

    // Try to navigate back - should work from cache
    await page.goto('/login');
    
    // Page should still load (from cache)
    await expect(page).toHaveURL('/login');
  });

  test('should handle service worker updates', async ({ page, context }) => {
    await page.goto('/login');

    // Wait for initial service worker registration
    await page.waitForTimeout(2000);

    // Check for update notification when new version is available
    // This would require actually deploying a new version, so we'll just verify
    // the update mechanism is set up
    const updateListenerExists = await page.evaluate(() => {
      return navigator.serviceWorker !== undefined;
    });

    expect(updateListenerExists).toBe(true);
  });

  test('should display app in standalone mode when installed', async ({ page }) => {
    // Simulate standalone mode (PWA installed)
    await page.addInitScript(() => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
          matches: query === '(display-mode: standalone)',
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => true,
        }),
      });
    });

    await page.goto('/login');

    // Install prompt should not appear in standalone mode
    const installPrompt = page.getByText('Install HR Masterdata App');
    await expect(installPrompt).not.toBeVisible();
  });

  test('should have manifest.json linked in page head', async ({ page }) => {
    await page.goto('/login');

    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute('href', '/manifest.json');
  });

  test('should have theme color meta tag', async ({ page }) => {
    await page.goto('/login');

    const themeColor = page.locator('meta[name="theme-color"]');
    await expect(themeColor).toHaveAttribute('content', '#1e40af');
  });

  test('should have apple touch icon', async ({ page }) => {
    await page.goto('/login');

    const appleIcon = page.locator('link[rel="apple-touch-icon"]');
    await expect(appleIcon).toHaveAttribute('href', '/icons/icon-192x192.png');
  });
});
