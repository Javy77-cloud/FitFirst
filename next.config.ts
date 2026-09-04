import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  serverExternalPackages: ["pdf-parse", "postgres", "tesseract.js", "tesseract.js-core", "heic-convert"],
};

export default nextConfig;
