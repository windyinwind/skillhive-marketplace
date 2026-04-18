'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[GlobalError]', error)
    }
  }, [error])

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-500/10 ring-1 ring-red-500/20">
        <AlertTriangle className="h-9 w-9 text-red-400" />
      </div>
      <h1 className="mb-2 font-heading text-2xl font-bold text-foreground">Something went wrong</h1>
      <p className="mb-8 max-w-sm text-sm text-muted-foreground">
        An unexpected error occurred. Try refreshing the page or head back to the marketplace.
        {error.digest && (
          <span className="mt-1 block font-mono text-xs opacity-50">ref: {error.digest}</span>
        )}
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-[#9945FF] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#8535EF] active:scale-[0.97]"
        >
          Try again
        </button>
        <Link
          href="/marketplace"
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:border-[#9945FF]/30 hover:text-foreground"
        >
          Browse marketplace
        </Link>
      </div>
    </div>
  )
}
