import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Exclude Supabase from bundling to avoid Edge Runtime issues
  serverExternalPackages: ['@supabase/ssr', '@supabase/supabase-js'],
  // Force experimental features for server components
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default withNextIntl(nextConfig);
