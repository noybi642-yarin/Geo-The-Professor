/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@anthropic-ai/sdk"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
