/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── Rewrites (URL aliases — no visible URL change) ──
  async rewrites() {
    return [
      { source: '/signup', destination: '/auth' },
      { source: '/plans', destination: '/packages' },
      { source: '/passes', destination: '/vouchers' },
      { source: '/api/mikrotik/test', destination: '/api/mikrotik/test-connection' },
    ];
  },

  // ── Redirects (permanent URL changes — SEO-safe) ──
  async redirects() {
    return [
      // If someone hits /admin, send them to /super-admin
      {
        source: '/admin',
        destination: '/super-admin',
        permanent: true,
      },
      // Block direct access to API internals from browser address bar
      {
        source: '/api/super-admin/settings',
        has: [{ type: 'header', key: 'sec-fetch-dest', value: 'document' }],
        destination: '/super-admin',
        permanent: false,
      },
    ];
  },

  // ── Security & Performance Headers ──
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' checkout.flutterwave.com",
              "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
              "font-src 'self' fonts.gstatic.com",
              "img-src 'self' data: blob: *.supabase.co",
              "connect-src 'self' *.supabase.co wss://*.supabase.co api.flutterwave.com checkout.flutterwave.com",
              "frame-src checkout.flutterwave.com",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
      {
        // Webhook route — allow POST from Flutterwave
        source: '/api/webhook/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, verif-hash' },
        ],
      },
    ];
  },

  // ── Image optimization ──
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },

  // ── Powered-by header removal ──
  poweredByHeader: false,

  // ── React strict mode for catching bugs ──
  reactStrictMode: true,
};

export default nextConfig;
