'use client'

import dynamic from 'next/dynamic'
import { useEffect } from 'react'

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
    <>
      <Navbar />
      <main className="min-h-screen">{children}</main>
    </>
  )
}
