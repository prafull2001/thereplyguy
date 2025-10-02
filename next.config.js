/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true
  },
  // Force cache busting for JavaScript and CSS files
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  // Add cache headers to prevent aggressive caching
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate'
          }
        ]
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate'
          }
        ]
      }
    ]
  },
  // Service Worker for cache busting
  async rewrites() {
    return []
  }
}

module.exports = nextConfig