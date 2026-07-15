import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Allow an isolated build dir so a second `next dev` (e.g. a parallel session)
  // doesn't clobber the primary `.next` cache. Defaults to `.next`.
  distDir: process.env.NEXT_DIST_DIR || '.next',
};

export default nextConfig;
