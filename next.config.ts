import type { NextConfig } from "next";

const config: NextConfig = {
  async redirects() {
    return [{
      source: "/:path*",
      has: [{ type: "host", value: "1960-studio.vercel.app" }],
      destination: "https://plateau-crew-hub.vercel.app/:path*",
      permanent: true,
    }];
  },
};

export default config;
