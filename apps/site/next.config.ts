import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
  },
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
  transpilePackages: ['lucide-react', '@ixos/ui', '@ixos/ixos-ui'],
  // Allow dev origins for desktop app and local testing
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    '*.duckdns.org',
    'ixos-protocol.duckdns.org',
  ],
  async headers() {
    return [
      {
        // API routes need CORS for desktop app requests
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Authorization,Content-Type,X-Requested-With' },
        ],
      },
    ];
  },
};

export default nextConfig;
