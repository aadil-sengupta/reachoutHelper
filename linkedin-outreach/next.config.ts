import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable server-side rendering with better-sqlite3
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
