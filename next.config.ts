import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root: a stray package-lock.json in the user home dir
  // otherwise makes Turbopack infer C:\Users\<user> as root (build warning).
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
