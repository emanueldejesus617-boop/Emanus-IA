import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(process.cwd(), "../"),
  async rewrites() {
    return {
      // Regras "beforeFiles": aplicadas ANTES de verificar rotas reais do Next.js
      beforeFiles: [],
      // Regras "afterFiles": aplicadas APÓS verificar rotas reais do Next.js (Route Handlers têm prioridade)
      afterFiles: [
        {
          // Proxia /api/* para o backend, MAS as rotas reais do Next.js têm prioridade
          source: '/api/:path*',
          destination: `${process.env.BACKEND_URL || 'http://127.0.0.1:8080'}/api/:path*`,
        },
      ],
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
