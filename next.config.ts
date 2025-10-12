import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This tells Next.js to ignore ESLint errors during the production build.
  eslint: {
    ignoreDuringBuilds: true,
  },
  
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