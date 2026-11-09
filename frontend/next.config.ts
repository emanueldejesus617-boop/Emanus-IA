import type { NextConfig } from "next";
import path from "path";

const monorepoRoot = process.cwd().endsWith("frontend")
  ? path.resolve(process.cwd(), "..")
  : process.cwd();

const isVercel = !!process.env.VERCEL;
const backendUrl = process.env.BACKEND_URL;
const shouldRewrite = backendUrl && (!isVercel || (!backendUrl.includes("localhost") && !backendUrl.includes("127.0.0.1")));

const nextConfig: NextConfig = {
  outputFileTracingRoot: monorepoRoot,
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Estes pacotes Node.js devem permanecer externos (não bundled) nas funções serverless da Vercel
  serverExternalPackages: [
    'firebase-admin',
    'fastify',
    '@fastify/cors',
  ],
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: shouldRewrite
        ? [
            {
              source: '/api/:path*',
              destination: `${backendUrl}/api/:path*`,
            },
          ]
        : [],
      fallback: [],
    };
  },
  async headers() {
    return [
      // ── Service Worker: sem cache para garantir atualização imediata ──
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        ],
      },
      // ── Manifest PWA ──
      {
        source: '/manifest.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Content-Type', value: 'application/manifest+json; charset=utf-8' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
      // ── assetlinks.json para TWA Android ──
      {
        source: '/.well-known/assetlinks.json',
        headers: [
          { key: 'Content-Type', value: 'application/json; charset=utf-8' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
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
