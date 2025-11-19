import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('PWA Installation Integration', () => {
  beforeEach(() => {
    // Clear service worker registrations before each test
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
        });
      });
    }
  });

  afterEach(() => {
    // Clean up after each test
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
        });
      });
    }
  });

  it('should have manifest.json accessible', async () => {
    // Read manifest.json from public folder
    const manifestPath = join(process.cwd(), 'public', 'manifest.json');
    const manifestContent = readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);
    
    expect(manifest).toHaveProperty('name');
    expect(manifest).toHaveProperty('short_name');
    expect(manifest).toHaveProperty('display', 'standalone');
    expect(manifest).toHaveProperty('icons');
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  it('should have service worker file accessible', async () => {
    // Read service worker file from public folder
    const swPath = join(process.cwd(), 'public', 'sw.js');
    const swContent = readFileSync(swPath, 'utf-8');
    
    // Verify it's a JavaScript file (contains service worker code)
    expect(swContent).toContain('self');
    expect(swContent.length).toBeGreaterThan(0);
  });

  it('should register service worker successfully', async () => {
    if (!('serviceWorker' in navigator)) {
      // Skip test if service workers are not supported
      return;
    }

    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    expect(registration).toBeDefined();
    expect(registration.scope).toBe('http://localhost:3000/');

    // Clean up
    await registration.unregister();
  });

  it('should have correct manifest structure', async () => {
    // Read manifest.json from public folder
    const manifestPath = join(process.cwd(), 'public', 'manifest.json');
    const manifestContent = readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);

    // Required PWA fields
    expect(manifest.name).toBe('HR Masterdata | Stena Line');
    expect(manifest.short_name).toBe('HR Masterdata');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.theme_color).toBe('#1e40af');
    expect(manifest.background_color).toBe('#ffffff');

    // Icons
    expect(manifest.icons).toBeInstanceOf(Array);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);

    const icon192 = manifest.icons.find((icon: any) => icon.sizes === '192x192');
    const icon512 = manifest.icons.find((icon: any) => icon.sizes === '512x512');

    expect(icon192).toBeDefined();
    expect(icon512).toBeDefined();
  });
});

