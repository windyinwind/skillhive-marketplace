import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: [
    '@solana/wallet-adapter-base',
    '@solana/wallet-adapter-react',
    '@solana/wallet-adapter-react-ui',
    '@solana/wallet-adapter-wallets',
  ],
  // Webpack config (used in dev and production builds)
  webpack: (config) => {
    // Required for Anchor / borsh serialization
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    }
    config.resolve.alias = { ...config.resolve.alias, 'pino-pretty': false }
    return config
  },
}

export default nextConfig
