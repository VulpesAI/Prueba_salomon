if (typeof process.env.NEXT_TELEMETRY_DISABLED === "undefined") {
  process.env.NEXT_TELEMETRY_DISABLED = "1";
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: {
    domains: ['localhost']
  }
};

module.exports = nextConfig;
