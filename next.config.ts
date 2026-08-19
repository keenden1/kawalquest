import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/players", destination: "/admin/players", permanent: true },
      { source: "/remote-config", destination: "/admin/remote-config", permanent: true },
      { source: "/top-up", destination: "/admin/top-up", permanent: true },
    ];
  },
};

export default nextConfig;
