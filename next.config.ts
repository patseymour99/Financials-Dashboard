import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow yahoo-finance2 to run in API routes
  serverExternalPackages: ["yahoo-finance2"],
  // Expose only public env vars to the client
  env: {},
};

export default nextConfig;
