import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const nextConfig: NextConfig = {
  // Home has a stray package-lock.json; pin Turbopack to this repo.
  turbopack: {
    root: path.dirname(fileURLToPath(import.meta.url)),
  },
  // Dev bound to 0.0.0.0 for phones; without this, foreign-looking hosts
  // 403 /_next chunks (blank hero, Journey never activates).
  allowedDevOrigins: ["127.0.0.1", "localhost", "0.0.0.0"],
  // Browsers (and iOS when no link tag is found) probe the conventional
  // /apple-touch-icon.png path; the app/apple-icon.tsx route only serves at
  // /apple-icon, so rewrite the conventional path to it.
  async rewrites() {
    return [
      {
        source: "/apple-touch-icon.png",
        destination: "/apple-icon",
      },
    ];
  },
};

export default nextConfig;
