import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: ['lucide-react', '@ixos/ui'],
};

export default nextConfig;
