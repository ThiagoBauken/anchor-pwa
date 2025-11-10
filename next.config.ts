import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // PWA and offline optimizations
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        'localhost:9002',
        'https://anchorpwa.easypanel.host', // Production domain
      ],
      bodySizeLimit: '10mb', // Increased for floor plans and facade photos
    },
  },
  // Turbopack configuration
  turbopack: {
    resolveAlias: {
      // Ensure server actions are properly resolved
      '@/app/actions': './src/app/actions',
    },
  },
  // Better offline handling
  async headers() {
    return [
      {
        // Static assets (images, fonts, etc.) - long cache
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // JavaScript/CSS bundles - shorter cache with revalidation
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, must-revalidate',
          },
        ],
      },
      {
        // API routes - no cache
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        // Pages - short cache with revalidation
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
