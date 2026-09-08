import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Multipart uploads pass through the framework's form-action body guard.
  // Leave room for multipart headers above the app's 5 MiB image limit.
  experimental: { serverActions: { bodySizeLimit: '6mb' } },
};

export default nextConfig;
