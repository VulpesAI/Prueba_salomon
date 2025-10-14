const fs = require("node:fs");
const path = require("node:path");

const parsedFiles = new Set();

const loadEnvFile = (envPath) => {
  if (parsedFiles.has(envPath)) {
    return;
  }
  parsedFiles.add(envPath);

  const loader = process.loadEnvFile;
  if (typeof loader === "function") {
    try {
      loader(envPath);
      return;
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.warn(`No se pudo cargar ${envPath}:`, error.message);
      }
    }
  }

  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }
    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key]) {
      continue;
    }
    let value = trimmed.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
};

const rootEnvPath = path.resolve(__dirname, "..", ".env");
loadEnvFile(rootEnvPath);
loadEnvFile(path.resolve(__dirname, ".env"));

const shouldExport = process.env.NEXT_SHOULD_EXPORT === "true";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: shouldExport ? "export" : "standalone",
  reactStrictMode: true,
  productionBrowserSourceMaps: true,
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  experimental: {
    typedRoutes: true,
  },
  images: {
    domains: ["localhost"],
    unoptimized: shouldExport,
  },
  async redirects() {
    return [
      {
        source: "/integraciones",
        destination: "/seguridad",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
