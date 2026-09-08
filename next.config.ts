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
};

export default nextConfig;
