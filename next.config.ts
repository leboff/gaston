import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle (.next/standalone) for Docker/dokploy.
  // Gated to the Docker build (BUILD_STANDALONE=1) so the local
  // `npm run build && npm start` flow keeps using `next start` (standalone is
  // incompatible with `next start`).
  output: process.env.BUILD_STANDALONE === "1" ? "standalone" : undefined,
  // better-sqlite3 is a native module and must not be bundled by the server compiler.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
