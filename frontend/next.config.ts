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
