import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toast';
import { PerformanceTracker } from '@/components/performance/performance-tracker';
import { ServiceWorkerUnregister } from '@/components/pwa/service-worker-unregister';
import { QueryProvider } from '@/components/providers/query-provider';
import { EnvStagingBanner } from '@/components/env-staging-banner';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'HR Masterdata | Stena Line',
  description: 'Stena Line HR Masterdata Management System - Centralized employee data management with role-based access control',
  // manifest: '/manifest.json', // Removed for no-offline/no-PWA
  icons: {
    apple: '/icons/icon-192x192.png',
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  // appleWebApp removed
  openGraph: {
    title: 'HR Masterdata | Stena Line',
    description: 'Stena Line HR Masterdata Management System',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          <PerformanceTracker />
          <ServiceWorkerUnregister />
          <EnvStagingBanner />
          {children}
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}
