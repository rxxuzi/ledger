import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages: fully static, no server runtime.
  output: "export",
  // The default image loader needs a server; disable it for static export.
  images: { unoptimized: true },
};

export default nextConfig;
