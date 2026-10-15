import type { NextConfig } from "next";
import path from "path";

const monorepoRoot = process.cwd().endsWith("frontend")
  ? path.resolve(process.cwd(), "..")
  : process.cwd();

const nextConfig: NextConfig = {
  outputFileTracingRoot: monorepoRoot,
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: process.env.BACKEND_URL
        ? [
            {
              source: '/api/:path*',
              destination: `${process.env.BACKEND_URL}/api/:path*`,
            },
          ]
        : [],
      fallback: [],
    };
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; frame-src 'self' https://*.firebaseapp.com https://*.google.com https://accounts.google.com https://apis.google.com; child-src 'self' https://*.firebaseapp.com https://*.google.com https://accounts.google.com https://apis.google.com; connect-src 'self' https: wss: http://localhost:8080 http://127.0.0.1:8080; frame-ancestors 'none';",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
