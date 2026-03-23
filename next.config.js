/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "anistars.xyz",
        port: "",
        pathname: "/assets/**",
      },
    ],
  },
};

module.exports = nextConfig;
