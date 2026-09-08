import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  transpilePackages: ["@onroad/shared"],
  outputFileTracingIncludes: {
    "/api/[[...path]]": [
      "../../apps/backend/dist/server/config/data/**",
      "../../apps/backend/dist/server/assets/**",
    ],
  },
  serverExternalPackages: [
    "@imgly/background-removal-node",
    "sharp",
    "exceljs",
    "@neondatabase/serverless",
  ],
  async rewrites() {
    // Local dev: proxy /api to the standalone Express process (npm run dev:backend).
    // On Vercel, vercel.json rewrites /api/* to api/index.ts (same deployment).
    const apiUrl = process.env.API_URL;
    if (!apiUrl) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
