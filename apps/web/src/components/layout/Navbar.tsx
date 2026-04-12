'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { cn } from '@/lib/utils'

// Links grouped by audience so the nav communicates purpose at a glance.
const userLinks = [
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/arena', label: 'Arena' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/chat', label: 'Chat' },
]

const creatorLinks = [
  { href: '/create', label: 'Publish Skill' },
  { href: '/register', label: 'Register Agent' },
  { href: '/dashboard', label: 'Dashboard' },
]

export function Navbar() {
  const pathname = usePathname()

  const isActive = (href: string) => pathname?.startsWith(href)

  return (
    <nav className="sticky top-0 z-50 border-b border-[#2a3147] bg-[#0f1117]/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-6 px-4 sm:px-6">

        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <Image src="/logo.png" alt="SWARM" width={32} height={32} className="rounded-md" />
          <span className="font-heading text-xl font-bold tracking-tight text-[#F8FAFC]">
            SWARM<span className="text-[#9945FF]">.</span>
          </span>
        </Link>

        {/* Nav groups */}
        <div className="hidden flex-1 items-center gap-1 sm:flex">

          {/* Divider label: Use */}
          <span className="mr-1 text-xs font-medium text-[#4A5568]">Use</span>
          {userLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm transition-colors',
                isActive(href)
                  ? 'bg-[#1e2435] text-[#F8FAFC]'
                  : 'text-[#8B9BB4] hover:bg-[#1e2435] hover:text-[#F8FAFC]'
              )}
            >
              {label}
            </Link>
          ))}

          {/* Separator */}
          <div className="mx-3 h-4 w-px bg-[#2a3147]" />

          {/* Divider label: Build */}
          <span className="mr-1 text-xs font-medium text-[#4A5568]">Build</span>
          {creatorLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm transition-colors',
                isActive(href)
                  ? 'bg-[#9945FF]/15 text-[#9945FF]'
                  : 'text-[#8B9BB4] hover:bg-[#9945FF]/10 hover:text-[#F8FAFC]'
              )}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Wallet */}
        <WalletMultiButton
          style={{
            background: 'linear-gradient(135deg, #9945FF, #14F195)',
            borderRadius: '8px',
            fontSize: '14px',
            height: '36px',
            padding: '0 16px',
            color: '#0f1117',
            fontWeight: '600',
            flexShrink: 0,
          }}
        />
      </div>
    </nav>
  )
}
