import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toast';
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register';
import { InstallPrompt } from '@/components/pwa/install-prompt';
import { SplashScreen } from '@/components/pwa/splash-screen';
import { PerformanceTracker } from '@/components/performance/performance-tracker';

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
  manifest: '/manifest.json',
  themeColor: '#1e40af',
  icons: {
    apple: '/icons/icon-192x192.png',
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'HR Masterdata',
  },
  openGraph: {
    title: 'HR Masterdata | Stena Line',
    description: 'Stena Line HR Masterdata Management System',
    type: 'website',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
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
        <SplashScreen />
        <PerformanceTracker />
        {children}
        <Toaster />
        <ServiceWorkerRegister />
        <InstallPrompt />
      </body>
    </html>
  );
}
