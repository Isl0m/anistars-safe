/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["devislom.a.pinggy.link"],
  images: {
    minimumCacheTTL: 604800,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8080",
        pathname: "/assets/**",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        port: "",
        pathname: "/anistars/**",
      },
    ],
  },
};

module.exports = nextConfig;
