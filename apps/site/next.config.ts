import type { NextConfig } from "next";
import path from "path";

const config: NextConfig = {
  // The workspace's packages are installed at the repository root.
  turbopack: { root: path.resolve(__dirname, "../..") },
  transpilePackages: ["@ixos/ui"],
};

export default config;
