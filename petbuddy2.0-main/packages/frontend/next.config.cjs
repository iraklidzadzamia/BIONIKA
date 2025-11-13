const nextConfig = {
  reactStrictMode: true,
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  compiler: {
    styledComponents: true,
  },
  experimental: {},
  async rewrites() {
    const backendOrigin = process.env.BACKEND_ORIGIN || "http://localhost:4000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
