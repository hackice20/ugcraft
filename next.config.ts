import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "fluent-ffmpeg",
    "ffmpeg-static",
    "@resvg/resvg-js",
  ],
  outputFileTracingIncludes: {
    "/api/generate": [
      "./assets/fonts/**",
      "./node_modules/ffmpeg-static/**",
      "./node_modules/@resvg/resvg-js-linux-x64-gnu/**",
      "./node_modules/@resvg/resvg-js-linux-x64-musl/**",
    ],
  },
};

export default nextConfig;
