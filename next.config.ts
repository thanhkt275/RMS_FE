import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  productionBrowserSourceMaps: true, // Enable source maps in production
  webpack: (config, { dev, isServer }) => {
    // Always generate source maps
    if (!dev) {
      config.devtool = 'source-map';
    }
    
    return config;
  },
  turbopack: {
    // Example: adding an alias and custom file extension
    resolveAlias: {
      underscore: 'lodash',
    },
    resolveExtensions: ['.mdx', '.tsx', '.ts', '.jsx', '.js', '.json'],
  },
};

export default nextConfig;
