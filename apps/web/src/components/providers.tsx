'use client'

import { type ReactNode } from 'react'
import { ConnectionProvider } from '@solana/wallet-adapter-react'
import { clusterApiUrl } from '@solana/web3.js'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core'
import { SolanaWalletConnectors } from '@dynamic-labs/solana'
import { Toaster } from '@/components/ui/toast'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

export function Providers({ children }: { children: ReactNode }) {
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC ?? clusterApiUrl('devnet')

  return (
    <QueryClientProvider client={queryClient}>
      <DynamicContextProvider
        settings={{
          environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID!,
          walletConnectors: [SolanaWalletConnectors],

          // Branding — shown in the auth modal header
          appName: 'SkillHive',
          appLogoUrl: '/logo.png',

          // Show all social providers enabled in the Dynamic dashboard
          socialProvidersFilter: (providers) => providers,

          // Auth mode: show both social login and wallet connect options
          initialAuthenticationMode: 'connect-and-sign',

          // Surface auth events to console in dev so we can diagnose failures
          events: {
            onAuthSuccess: ({ user, primaryWallet }) => {
              if (process.env.NODE_ENV === 'development') {
                console.log('[Dynamic] auth success', user?.email ?? primaryWallet?.address)
              }
            },
            onAuthFailure: (data, reason) => {
              console.warn('[Dynamic] auth failure', data, reason)
            },
            onWalletConnectionFailed: (connector, error) => {
              console.warn('[Dynamic] wallet connection failed', connector?.name, error)
            },
          },
        }}
      >
        <ConnectionProvider endpoint={endpoint}>
          {children}
          <Toaster />
        </ConnectionProvider>
      </DynamicContextProvider>
    </QueryClientProvider>
  )
}
