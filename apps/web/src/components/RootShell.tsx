'use client'

import dynamic from 'next/dynamic'
import { ThemeProvider } from '@/components/providers/ThemeProvider'

// Load wallet/query providers client-side only to avoid SSR errors
const Providers = dynamic(
  () => import('@/components/providers').then((mod) => mod.Providers),
  { ssr: false }
)

export function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <Providers>
        {children}
      </Providers>
    </ThemeProvider>
  )
}
