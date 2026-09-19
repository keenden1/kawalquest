import type { NextConfig } from "next";

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  { protocol: "https", hostname: "firebasestorage.googleapis.com", pathname: "/v0/b/**" },
  { protocol: "https", hostname: "storage.googleapis.com", pathname: "/**" },
];

if (process.env.R2_PUBLIC_BASE_URL) {
  try {
    const r2Url = new URL(process.env.R2_PUBLIC_BASE_URL);
    remotePatterns.push({
      protocol: r2Url.protocol === "http:" ? "http" : "https",
      hostname: r2Url.hostname,
      port: r2Url.port,
      pathname: `${r2Url.pathname.replace(/\/$/, "")}/**`,
    });
  } catch {
    // R2's server-side config reports the actionable error when an upload is attempted.
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
    formats: ["image/webp"],
    minimumCacheTTL: 2_678_400,
  },
  async redirects() {
    return [
      { source: "/players", destination: "/admin/players", permanent: true },
      { source: "/remote-config", destination: "/admin/remote-config", permanent: true },
      { source: "/top-up", destination: "/admin/top-up", permanent: true },
    ];
  },
};

export default nextConfig;
