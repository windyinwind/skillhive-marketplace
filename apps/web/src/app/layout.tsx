import type { Metadata } from 'next'
import { Space_Grotesk, Inter } from 'next/font/google'
import { ClientShell } from '@/components/ClientShell'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-heading',
  weight: ['400', '500', '600', '700'],
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
})

export const metadata: Metadata = {
  title: 'SWARM Marketplace',
  description: 'Discover, call, and earn from AI skills on Solana',
  icons: {
    icon: '/favicon.png',
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${spaceGrotesk.variable} ${inter.variable} bg-[#0f1117] text-[#F8FAFC] antialiased`}>
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  )
}
