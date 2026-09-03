import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "postgres", "tesseract.js", "tesseract.js-core", "heic-convert"],
};

export default nextConfig;
