import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // output: 'standalone', // Descomentar solo para deploy con Docker
};

export default nextConfig;
