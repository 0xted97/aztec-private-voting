/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Polyfills for browser environment
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        buffer: require.resolve('buffer'),
      };
      
      // Add buffer polyfill
      config.plugins.push(
        new (require('webpack')).ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
        })
      );
    }
    return config;
  },
};

module.exports = nextConfig;
