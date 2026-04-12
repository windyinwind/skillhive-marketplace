'use client'

import dynamic from 'next/dynamic'

const Providers = dynamic(
  () => import('@/components/providers').then((mod) => mod.Providers),
  { ssr: false }
)

const Navbar = dynamic(
  () => import('@/components/layout/Navbar').then((mod) => mod.Navbar),
  { ssr: false }
)

export function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <Navbar />
      <main className="min-h-screen">{children}</main>
    </Providers>
  )
}
