import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Production app runs as a Node server so Prisma + Route Handlers work.
  // GitHub Pages continues to use the standalone root index.html preview.
  images: { unoptimized: true }
};

export default nextConfig;
