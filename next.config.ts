import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // 7ilni is almost entirely dynamic/realtime (live lobbies, live races,
  // per-user state) so the Cache Components model would mean wrapping
  // nearly every component in Suspense for little benefit. Use the
  // traditional dynamic-by-default rendering model instead.
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
