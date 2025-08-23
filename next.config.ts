import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  // productionBrowserSourceMaps: true, // Temporarily disable
  // webpack: (config, { dev, isServer }) => {
  //   if (!dev) {
  //     config.devtool = 'source-map';
  //   }
  //   return config;
  // },
  turbopack: {
    resolveAlias: {
      underscore: 'lodash',
    },
    resolveExtensions: ['.mdx', '.tsx', '.ts', '.jsx', '.js', '.json'],
  },
};

module.exports = nextConfig