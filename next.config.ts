import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  webpack: (config, { nextRuntime }) => {
    // Avoid bundling issues with @supabase packages in Edge Runtime
    if (nextRuntime === 'edge') {
      config.resolve.alias = {
        ...config.resolve.alias,
        // Ensure proper bundling for edge runtime
      };
    }
    return config;
  },
};

export default nextConfig;
