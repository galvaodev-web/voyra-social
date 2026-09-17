import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const repoName = "voyra-social";
const isGithubPages =
  process.env.NEXT_PUBLIC_DEPLOY_TARGET === "github-pages";
const basePath = isGithubPages ? `/${repoName}` : "";
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://images.unsplash.com https://*.supabase.co",
  "media-src 'self' blob: https://*.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.ingest.sentry.io",
].join("; ");

const config: NextConfig = {
  poweredByHeader: false,
  turbopack: { root },
  outputFileTracingRoot: root,
  ...(isGithubPages
    ? {
        output: "export" as const,
        trailingSlash: true,
        basePath,
        assetPrefix: basePath,
      }
    : {}),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
    ...(isGithubPages ? { unoptimized: true } : {}),
  },
  ...(isGithubPages
    ? {}
    : {
        async headers() {
          return [
            {
              source: "/:path*",
              headers: [
                { key: "X-Content-Type-Options", value: "nosniff" },
                {
                  key: "Referrer-Policy",
                  value: "strict-origin-when-cross-origin",
                },
                { key: "X-Frame-Options", value: "DENY" },
                {
                  key: "Permissions-Policy",
                  value: "geolocation=(), camera=(), microphone=()",
                },
                { key: "Content-Security-Policy", value: contentSecurityPolicy },
                ...(process.env.NODE_ENV === "production"
                  ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
                  : []),
              ],
            },
          ];
        },
      }),
};

export default config;
