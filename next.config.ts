import type { NextConfig } from "next";

const canonicalHost = "plateau-crew-hub.vercel.app";
const alternateHosts = [
  "1960-studio.vercel.app",
  "1960-studio-studio-1961.vercel.app",
  "1960-studio-git-feat-supervisor-dashboard-ta-20aab5-studio-1961.vercel.app",
];

const config: NextConfig = {
  async redirects() {
    return alternateHosts.map(host => ({
      source: "/:path*",
      has: [{ type: "host" as const, value: host }],
      destination: `https://${canonicalHost}/:path*`,
      permanent: true,
    }));
  },
};

export default config;
