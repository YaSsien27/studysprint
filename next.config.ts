import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/securityHeaders";

const nextConfig: NextConfig = {
  // Don't announce "X-Powered-By: Next.js" to every visitor.
  poweredByHeader: false,

  // Security headers on every page and file (see src/lib/securityHeaders.ts).
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders({
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
          isDev: process.env.NODE_ENV === "development",
        }),
      },
    ];
  },

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
