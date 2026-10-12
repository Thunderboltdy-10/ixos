import type { NextConfig } from 'next';
import path from 'path';
const config: NextConfig = {
  experimental: { externalDir: true },
  turbopack: { root: path.resolve(__dirname, '../..') },
  transpilePackages: ['lucide-react', '@ixos/ui', '@ixos/ixos-ui'],
};
export default config;
