'use client'

import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Footer } from '@/components/layout/Footer'

const Navbar = dynamic(
  () => import('@/components/layout/Navbar').then((mod) => mod.Navbar),
  { ssr: false }
)

interface Props {
  children: React.ReactNode
  locale: string
}

const NO_FOOTER_PATHS = ['/arena', '/chat']

export function NavShell({ children, locale }: Props) {
  const pathname = usePathname()
  const showFooter = !NO_FOOTER_PATHS.some((p) => pathname.includes(p))

  // Set lang attribute dynamically for the locale
  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'
  }, [locale])

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      {showFooter && <Footer />}
    </div>
  )
}
