/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "vlgeowyxhyugmqyhrmyq.supabase.co",
        port: "",
      },
      {
        protocol: "https",
        hostname: "dlrfohlfddqdbrguzwbc.supabase.co",
        port: "",
      },
      {
        protocol: "https",
        hostname: "anistars-photos.s3.eu-north-1.amazonaws.com",
        port: "",
      },
    ],
  },
};

module.exports = nextConfig;
