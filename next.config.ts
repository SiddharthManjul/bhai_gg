import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    '@prisma/client',
    '@prisma/adapter-pg',
    'thread-stream',
    'pino',
    'pino-abstract-transport',
    'pino-std-serializers',
  ],
  turbopack: {},
};

export default nextConfig;
