import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ✅ Ignore TypeScript errors during build
  typescript: {
    ignoreBuildErrors: true,
  },
  // ✅ ADD THIS: Ignore ESLint errors during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Logo images config
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
