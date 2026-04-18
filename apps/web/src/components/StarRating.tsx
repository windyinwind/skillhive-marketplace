'use client'

import { useState } from 'react'
import { useWallet } from '@/hooks/useWalletAdapter'
import bs58 from 'bs58'
import { toast } from '@/hooks/use-toast'

interface StarRatingProps {
  callId: string
  skillId: string
  callerWallet: string
  onDone?: () => void
  size?: 'sm' | 'md'
}

export function StarRating({ callId, skillId, callerWallet, onDone, size = 'md' }: StarRatingProps) {
  const { signMessage } = useWallet()
  const [hovered, setHovered] = useState(0)
  const [selected, setSelected] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const starSize = size === 'sm' ? 'text-lg' : 'text-2xl'
  const gap = size === 'sm' ? 'gap-0.5' : 'gap-1'

  const submit = async (score: number) => {
    if (loading || submitted || !signMessage) return
    setSelected(score)
    setLoading(true)
    setError(null)
    try {
      // Sign the rating to prove wallet ownership — prevents spoofing
      const message = new TextEncoder().encode(`${callId}${score}${callerWallet}`)
      const sigBytes = await signMessage(message)
      const signature = bs58.encode(sigBytes)

      const res = await fetch('/api/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId, skillId, score, callerWallet, signature }),
      })
      if (!res.ok) {
        const { error: msg } = await res.json()
        setError(msg ?? 'Rating failed')
        return
      }
      setSubmitted(true)
      toast({ variant: 'success', title: 'Rating submitted', description: 'Thanks for helping the community!' })
      onDone?.()
    } catch {
      setError('Wallet signing cancelled')
      toast({ variant: 'destructive', title: 'Rating cancelled', description: 'Wallet signing was rejected.' })
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-[#14F195] text-sm">{'★'.repeat(selected)}</span>
        <span className="text-xs text-muted-foreground">Thanks for rating!</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs text-muted-foreground">Rate this result</p>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className={`flex ${gap}`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            disabled={loading}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => submit(n)}
            className={`${starSize} leading-none transition-colors disabled:cursor-wait ${
              n <= (hovered || selected)
                ? 'text-[#9945FF]'
                : 'text-[#2a3147] hover:text-[#9945FF]'
            }`}
            aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  )
}
