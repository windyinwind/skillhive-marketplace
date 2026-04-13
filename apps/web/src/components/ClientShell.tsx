'use client'

// ClientShell is kept for backwards compatibility but is no longer used
// for the main layout. The locale layout uses NavShell instead.
// Providers and ThemeProvider are now in RootShell (root layout).

export function ClientShell({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
