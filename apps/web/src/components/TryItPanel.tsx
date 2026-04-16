'use client'

import { useState, useEffect } from 'react'
import { Loader2, Share2 } from 'lucide-react'

interface TryItPanelProps {
  skillId: string
}

export function TryItPanel({ skillId }: TryItPanelProps) {
  const [input, setInput] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [truncated, setTruncated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const encoded = params.get('input')
    if (encoded) {
      try { setInput(atob(encoded)) } catch { setInput(encoded) }
    }
  }, [])

  const copyResultLink = () => {
    if (!input.trim()) return
    const url = new URL(window.location.href)
    url.searchParams.set('input', btoa(input))
    navigator.clipboard.writeText(url.toString()).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const runPreview = async () => {
    if (!input.trim()) return
    setLoading(true)
    setResult(null)
    setTruncated(false)
    setError(null)
    try {
      const res = await fetch('/api/call/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId, input, preview: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Preview failed')
      setResult(data.result)
      setTruncated(data.truncated ?? false)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-4 font-heading font-semibold text-foreground">Try it</h3>

      <textarea
        placeholder="Enter your input..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="mb-3 min-h-[80px] w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-[#9945FF] focus:ring-1 focus:ring-[#9945FF]"
      />

      <button
        onClick={runPreview}
        disabled={loading || !input.trim()}
        className="w-full rounded-lg border border-border bg-secondary py-2 text-sm font-medium text-muted-foreground transition-all active:scale-[0.97] hover:border-[#9945FF]/40 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Try for free'}
      </button>

      {/* Loading skeleton */}
      {loading && !result && (
        <div className="mt-4 space-y-2 rounded-lg border border-border bg-background p-4">
          <div className="h-3 w-3/4 animate-pulse rounded bg-secondary" />
          <div className="h-3 w-full animate-pulse rounded bg-secondary" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-secondary" />
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="mt-4 rounded-lg border border-border bg-background p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Result</p>
            {!truncated && (
              <button
                onClick={copyResultLink}
                className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-[#9945FF]"
                title="Copy shareable link with this input"
              >
                <Share2 className="h-3 w-3" />
                {copied ? 'Copied!' : 'Share'}
              </button>
            )}
          </div>

          {truncated ? (
            <div className="relative">
              <p className="whitespace-pre-wrap text-sm text-muted-foreground line-clamp-4">{result}</p>
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
              <p className="mt-6 text-center text-xs text-muted-foreground pt-2">
                Preview shows the first ~200 characters
              </p>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{result}</p>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
    </div>
  )
}
