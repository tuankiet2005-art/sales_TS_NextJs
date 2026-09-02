import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  outputFileTracingIncludes: {
    "/api/export-quote": ["./src/server/assets/quote-report/**"],
    "/api/quote-report": ["./src/server/assets/quote-report/**"],
  },
};

export default nextConfig;
