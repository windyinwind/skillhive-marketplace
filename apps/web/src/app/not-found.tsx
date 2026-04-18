import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#9945FF]/10 ring-1 ring-[#9945FF]/20">
        <span className="font-heading text-3xl font-bold text-[#9945FF]">404</span>
      </div>
      <h1 className="mb-2 font-heading text-2xl font-bold text-foreground">Page not found</h1>
      <p className="mb-8 max-w-sm text-sm text-muted-foreground">
        This page doesn&apos;t exist or may have been moved. Browse the marketplace to find what you&apos;re looking for.
      </p>
      <div className="flex items-center gap-3">
        <Link
          href="/marketplace"
          className="rounded-lg bg-[#9945FF] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#8535EF] active:scale-[0.97]"
        >
          Browse marketplace
        </Link>
        <Link
          href="/"
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:border-[#9945FF]/30 hover:text-foreground"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
