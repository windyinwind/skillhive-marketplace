'use client'

import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { Footer } from '@/components/layout/Footer'

const Navbar = dynamic(
  () => import('@/components/layout/Navbar').then((mod) => mod.Navbar),
  { ssr: false }
)

interface Props {
  children: React.ReactNode
  locale: string
}

export function NavShell({ children, locale }: Props) {
  // Set lang attribute dynamically for the locale
  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'
  }, [locale])

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
