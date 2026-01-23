/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'img.clerk.com',
            },
            {
                protocol: 'https',
                hostname: 'images.clerk.dev',
            },
        ],
    },
    experimental: {
        optimizePackageImports: ['lucide-react', 'framer-motion', '@react-three/drei'],
    },
};

export default nextConfig;
