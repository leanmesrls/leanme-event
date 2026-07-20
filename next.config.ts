import type { NextConfig } from "next";

const crossOriginIsolationHeaders = [
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  {
    key: "Cross-Origin-Embedder-Policy",
    value: "require-corp",
  },
];

// Build locale (`npm run build`) usa `.next-prod` per non corrompere la cache dev.
// Su Vercel resta sempre `.next` (output atteso dalla piattaforma).
const useLocalProdDistDir =
  process.env.LEAN_EVENT_PROD_BUILD === "1" && process.env.VERCEL !== "1";

const nextConfig: NextConfig = {
  distDir: useLocalProdDistDir ? ".next-prod" : ".next",
  devIndicators: false,
  experimental: {
    middlewareClientMaxBodySize: "35mb",
  },
  async redirects() {
    return [
      {
        source: "/leanyou/:path*",
        destination: "/lean-event/:path*",
        permanent: true,
      },
      {
        source: "/api/leanyou/:path*",
        destination: "/api/lean-event/:path*",
        permanent: true,
      },
      {
        source: "/lean-event/login",
        destination: "/lean-event",
        permanent: true,
      },
      {
        source: "/lean-event/:tenant/leonardo",
        destination: "/lean-event/:tenant",
        permanent: true,
      },
      {
        source: "/lean-event/:tenant/leonardo/:path*",
        destination: "/lean-event/:tenant/:path*",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/lean-event/:path*",
        destination: "/leanyou/:path*",
      },
      {
        source: "/api/lean-event/:path*",
        destination: "/api/leanyou/:path*",
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1440, 1920],
  },
  async headers() {
    return [
      {
        source: "/assets/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400",
          },
        ],
      },
      {
        source: "/llms.txt",
        headers: [
          {
            key: "Content-Type",
            value: "text/plain; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=86400",
          },
        ],
      },
      {
        source: "/ffmpeg/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
          {
            key: "Cross-Origin-Resource-Policy",
            value: "same-origin",
          },
        ],
      },
      {
        source: "/_next/static/chunks/:path*",
        headers: crossOriginIsolationHeaders,
      },
      {
        source: "/lean-event/:path*",
        headers: crossOriginIsolationHeaders,
      },
    ];
  },
};

export default nextConfig;
