import { assertNextBuildAllowed } from './src/maintenance/production-pause-next-build-policy.mjs';

assertNextBuildAllowed(process.env);

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
