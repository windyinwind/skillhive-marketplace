'use client'

import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, Zap, Trophy, ChevronDown, ChevronUp, Loader2, CheckCircle2 } from 'lucide-react'
import { tierLabel, tierColor, formatSol } from '@/lib/format'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ArenaEntry } from '@/app/arena/types'

interface ArenaEntryCardProps {
  entry: ArenaEntry
  rank: number
  roundStatus: 'running' | 'open' | 'closed'
  onPaid?: () => void
}

export function ArenaEntryCard({ entry, rank, roundStatus, onPaid }: ArenaEntryCardProps) {
  const { publicKey, sendTransaction } = useWallet()
  const { setVisible } = useWalletModal()
  const [expanded, setExpanded] = useState(rank <= 2)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)
  const [paid, setPaid] = useState(false)

  const isWinner = rank === 1 && roundStatus === 'closed'
  const skillPrice = entry.cost_lamports

  async function handlePay() {
    if (!publicKey) { setVisible(true); return }

    setPaying(true)
    setPayError(null)
    try {
      const connection = new Connection(
        process.env.NEXT_PUBLIC_SOLANA_RPC ?? 'https://api.devnet.solana.com',
        'confirmed'
      )
      const recipientKey = new PublicKey(entry.owner_wallet)
      const { blockhash } = await connection.getLatestBlockhash('confirmed')
      const tx = new Transaction({ recentBlockhash: blockhash, feePayer: publicKey }).add(
        SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: recipientKey, lamports: skillPrice })
      )

      const sig = await sendTransaction(tx, connection)
      await connection.confirmTransaction(sig, 'confirmed')

      const res = await fetch(`/api/arena/${entry.round_id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId: entry.id,
          voterWallet: publicKey.toBase58(),
          txSignature: sig,
          amountLamports: skillPrice,
        }),
      })

      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error ?? 'Payment failed')
      }

      setPaid(true)
      onPaid?.()
    } catch (err) {
      setPayError((err as Error).message)
    } finally {
      setPaying(false)
    }
  }

  return (
    <div className={`rounded-xl border transition-all ${
      paid
        ? 'border-[#14F195]/40 bg-[#14F195]/5'
        : isWinner
        ? 'border-yellow-500/40 bg-yellow-500/5'
        : rank === 1
        ? 'border-[#9945FF]/40 bg-[#9945FF]/5'
        : 'border-border bg-card'
    }`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Rank badge */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
          rank === 1 ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/40' :
          rank === 2 ? 'bg-muted text-foreground border border-border' :
          rank === 3 ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30' :
          'bg-muted text-muted-foreground border border-border'
        }`}>
          {isWinner ? <Trophy className="w-4 h-4" /> : rank}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground truncate">{entry.skill_name}</span>
            <Badge className={`text-xs ${tierColor(entry.skill_tier)}`}>
              {tierLabel(entry.skill_tier)}
            </Badge>
            {paid && (
              <Badge className="text-xs bg-[#14F195]/15 text-[#14F195] border-[#14F195]/30">
                <CheckCircle2 className="w-3 h-3 mr-1 inline" />Paid
              </Badge>
            )}
            {entry.error && (
              <Badge variant="destructive" className="text-xs">Error</Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
            {entry.response_ms != null && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />{entry.response_ms}ms
              </span>
            )}
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />{formatSol(skillPrice)}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Result body */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
          {entry.error ? (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              {entry.error}
            </div>
          ) : entry.result ? (
            <div className="prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed max-h-80 overflow-y-auto bg-muted rounded-lg p-3 border border-border">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.result}</ReactMarkdown>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />Processing…
            </div>
          )}

          {/* Pay CTA */}
          {roundStatus === 'open' && entry.result && !entry.error && (
            <div className="pt-1">
              {paid ? (
                <div className="flex items-start gap-2 text-sm text-[#14F195] bg-[#14F195]/5 border border-[#14F195]/20 rounded-lg px-3 py-2.5">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p>You paid for this answer — SOL sent to the skill owner.</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Your payment counts as a vote and contributes to this skill&apos;s leaderboard ranking.</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 flex-wrap">
                  <Button
                    onClick={handlePay}
                    disabled={paying}
                    className="bg-[#9945FF] hover:bg-[#8a3ee8] text-white font-semibold h-10 px-5"
                  >
                    {paying ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" />Sending…</>
                    ) : (
                      <>Pay {formatSol(skillPrice)} · This answer helped me</>
                    )}
                  </Button>
                  <span className="text-xs text-muted-foreground">SOL goes directly to the skill owner</span>
                </div>
              )}
              {payError && (
                <p className="text-xs text-red-400 mt-2">{payError}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
