import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  // Vercel's `builds` pipeline cannot patch preview comments into Next 16's
  // immutable static uploads ("Cannot patch preview comments when immutable
  // static file upload is enabled"). Opt out so deployments use the classic
  // asset upload path that Vercel can patch.
  supportsImmutableAssets: false,
};

export default nextConfig;
