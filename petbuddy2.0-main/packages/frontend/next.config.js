/**
 * NOTE: This file is kept as an ES Module stub to satisfy tooling that might import it.
 * The actual exported config is in `next.config.cjs` to work with package.json { type: "module" }.
 */

// Environment helpers
const isProduction = process.env.NODE_ENV === 'production';
// Use NEXT_PUBLIC_ prefix so it's available both server-side and client-side
const backendOrigin = process.env.NEXT_PUBLIC_BACKEND_ORIGIN || 'http://localhost:4000';

const nextConfig = {
  reactStrictMode: true,

  // Performance Optimizations
  compiler: {
    // Remove console logs in production
    removeConsole: isProduction
      ? {
          exclude: ['error', 'warn'],
        }
      : false,
    // Suppress hydration warnings
    styledComponents: true,
  },

  // Optimize page loading
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },

  // Production optimizations
  swcMinify: true,

  // Optimize images
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Experimental features for better performance
  experimental: {
    optimizePackageImports: [
      "@heroicons/react",
      "@headlessui/react",
      "lucide-react",
    ],
  },

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
