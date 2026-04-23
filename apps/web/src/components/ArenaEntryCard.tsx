'use client'

import { useState } from 'react'
import { useWallet } from '@/hooks/useWalletAdapter'
import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Clock, Zap, Trophy, ChevronDown, ChevronUp, Loader2, CheckCircle2, Layers, ThumbsUp, ThumbsDown } from 'lucide-react'
import { tierLabel, tierColor, formatSol } from '@/lib/format'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ArenaEntry, ContributingSkill } from '@/components/arena/types'

interface ArenaEntryCardProps {
  entry: ArenaEntry
  rank: number
  roundStatus: 'running' | 'open' | 'closed'
  onPaid?: () => void
}

// Group contributing owners by wallet and sum amounts
function groupByWallet(owners: ContributingSkill[]): Record<string, number> {
  const grouped: Record<string, number> = {}
  for (const co of owners) {
    grouped[co.wallet] = (grouped[co.wallet] ?? 0) + co.amountLamports
  }
  return grouped
}

function synthesisLabel(type: string | null): string {
  if (type === 'comprehensive') return 'Full Analysis'
  if (type === 'key_insights')  return 'Key Insights'
  return ''
}

// Show analysis + Bottom Line verdict for free; lock ## Action Steps only
function splitResult(result: string): { preview: string; locked: string } {
  const actionStepsMarker = /^## Action Steps/im
  const match = actionStepsMarker.exec(result)
  if (match?.index !== undefined) {
    return {
      preview: result.slice(0, match.index).trimEnd(),
      locked: result.slice(match.index),
    }
  }
  // Fallback for old synthesis without Action Steps: split at ~75%
  const cut = Math.floor(result.length * 0.75)
  return { preview: result.slice(0, cut), locked: result.slice(cut) }
}

function helpfulPct(helpful: number, unhelpful: number): { pct: number; total: number } | null {
  const total = helpful + unhelpful
  if (total === 0) return null
  return { pct: Math.round((helpful / total) * 100), total }
}

interface AnswerBodyProps {
  result: string
  paid: boolean
  paying: boolean
  payError: string | null
  roundStatus: 'running' | 'open' | 'closed'
  totalCost: number
  isSynthesis: boolean
  uniqueOwnerCount: number
  owners: ContributingSkill[]
  helpfulPctData: { pct: number; total: number } | null
  onPay: () => void
  onRate: (helpful: boolean) => void
  rated: boolean
}

function AnswerBody({ result, paid, paying, payError, roundStatus, totalCost, isSynthesis, uniqueOwnerCount, owners, helpfulPctData, onPay, onRate, rated }: AnswerBodyProps) {
  const showPaywall = roundStatus === 'open' && !paid
  const { preview, locked } = splitResult(result)

  if (paid || roundStatus !== 'open') {
    return (
      <div className="space-y-3">
        <div className="prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed max-h-80 overflow-y-auto bg-muted rounded-lg p-3 border border-border">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
        </div>
        {paid && (
          <>
            <div className="flex items-start gap-2 text-sm text-[#14F195] bg-[#14F195]/5 border border-[#14F195]/20 rounded-lg px-3 py-2.5">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">
                  {formatSol(totalCost)} SOL sent to {isSynthesis ? `${uniqueOwnerCount} skill creator${uniqueOwnerCount !== 1 ? 's' : ''}` : 'skill owner'}.
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Your payment counts as a vote and boosts these skills&apos; leaderboard ranking.</p>
              </div>
            </div>
            {/* Post-payment rating */}
            {!rated ? (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
                <p className="flex-1 text-xs text-muted-foreground">Was this answer helpful?</p>
                <button onClick={() => onRate(true)} className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground border border-border hover:bg-[#14F195]/10 hover:text-[#14F195] hover:border-[#14F195]/30 transition-colors">
                  <ThumbsUp className="w-3.5 h-3.5" /> Yes
                </button>
                <button onClick={() => onRate(false)} className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground border border-border hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-colors">
                  <ThumbsDown className="w-3.5 h-3.5" /> No
                </button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground px-1">Thanks for your feedback.</p>
            )}
          </>
        )}
      </div>
    )
  }

  // Paywall mode — preview (includes Bottom Line verdict) + locked Action Steps
  return (
    <div className="space-y-0">
      <div className="prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed bg-muted rounded-t-lg px-3 pt-3 pb-2 border border-b-0 border-border">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{preview}</ReactMarkdown>
      </div>

      {showPaywall && locked && (
        <div className="relative overflow-hidden rounded-b-lg border border-t-0 border-[#9945FF]/30">
          <div className="select-none pointer-events-none px-3 py-3 bg-[#9945FF]/5">
            <div className="blur-[5px] opacity-60 prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed line-clamp-3">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{locked}</ReactMarkdown>
            </div>
          </div>

          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-transparent via-card/60 to-card/95 px-4 py-3 gap-1.5">
            {helpfulPctData && (
              <p className="text-[11px] text-muted-foreground">
                <span className="font-semibold text-[#14F195]">{helpfulPctData.pct}%</span> found this helpful ({helpfulPctData.total} paid)
              </p>
            )}
            <p className="text-xs text-muted-foreground text-center">
              {isSynthesis
                ? <>Pay <span className="text-foreground font-semibold">{formatSol(totalCost)} SOL</span> to unlock Action Steps — split among {owners.length} creators</>
                : <>Pay <span className="text-foreground font-semibold">{formatSol(totalCost)} SOL</span> to unlock Action Steps</>
              }
            </p>
            <Button
              onClick={onPay}
              disabled={paying}
              size="sm"
              className="bg-[#9945FF] hover:bg-[#8a3ee8] text-white font-semibold px-5"
            >
              {paying
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Sending…</>
                : <>Unlock Action Steps · {formatSol(totalCost)} SOL</>
              }
            </Button>
            {payError && <p className="text-xs text-red-400 mt-1.5">{payError}</p>}
          </div>
        </div>
      )}
    </div>
  )
}

export function ArenaEntryCard({ entry, rank, roundStatus, onPaid }: ArenaEntryCardProps) {
  const { publicKey, sendTransaction } = useWallet()
  const { openAuthModal: setVisible } = useWallet()
  const [expanded, setExpanded] = useState(rank <= 2)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)
  const [paid, setPaid] = useState(false)
  const [rated, setRated] = useState(false)

  const helpfulPctData = helpfulPct(entry.helpful_votes ?? 0, entry.unhelpful_votes ?? 0)

  const isWinner = rank === 1 && roundStatus === 'closed'
  const owners = entry.contributing_owners ?? []
  const isSynthesis = owners.length > 0

  // For synthesis entries, totalCost = sum of each contributing owner's amount
  // For single-skill entries, totalCost = entry.cost_lamports
  const contributingByWallet = isSynthesis ? groupByWallet(owners) : {}
  const totalCost = isSynthesis
    ? Object.values(contributingByWallet).reduce((s, v) => s + v, 0)
    : entry.cost_lamports

  const uniqueOwnerCount = Object.keys(contributingByWallet).length

  async function handleRate(helpful: boolean) {
    setRated(true)
    try {
      await fetch(`/api/arena/${entry.round_id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId: entry.id, helpful }),
      })
    } catch {
      // rating is best-effort — don't show an error to the user
    }
  }

  function handlePayClick() {
    if (!publicKey) { setVisible(true); return }
    setConfirmOpen(true)
  }

  async function handlePay() {
    if (!publicKey) return
    setConfirmOpen(false)
    setPaying(true)
    setPayError(null)
    try {
      const connection = new Connection(
        process.env.NEXT_PUBLIC_SOLANA_RPC ?? 'https://api.devnet.solana.com',
        'confirmed'
      )
      const { blockhash } = await connection.getLatestBlockhash('confirmed')
      const tx = new Transaction({ recentBlockhash: blockhash, feePayer: publicKey })

      if (isSynthesis) {
        // One transfer instruction per unique contributing owner wallet
        for (const [wallet, lamports] of Object.entries(contributingByWallet)) {
          tx.add(
            SystemProgram.transfer({
              fromPubkey: publicKey,
              toPubkey:   new PublicKey(wallet),
              lamports,
            })
          )
        }
      } else {
        tx.add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey:   new PublicKey(entry.owner_wallet),
            lamports:   totalCost,
          })
        )
      }

      const sig = await sendTransaction(tx, connection)
      await connection.confirmTransaction(sig, 'confirmed')

      const res = await fetch(`/api/arena/${entry.round_id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId:        entry.id,
          voterWallet:    publicKey.toBase58(),
          txSignature:    sig,
          amountLamports: totalCost,
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
    <>
    <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Confirm Payment</DialogTitle>
          <DialogDescription>
            You are about to pay skill creator{isSynthesis && Object.keys(contributingByWallet).length !== 1 ? 's' : ''} on Solana.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          {isSynthesis ? (
            Object.entries(contributingByWallet).map(([wallet, lamports]) => {
              const owner = owners.find(o => o.wallet === wallet)
              return (
                <div key={wallet} className="flex items-center justify-between rounded-lg border border-border bg-muted px-3 py-2 text-sm">
                  <span className="text-foreground font-medium truncate max-w-[160px]">{owner?.skillName ?? wallet.slice(0, 8) + '…'}</span>
                  <span className="font-mono text-[#14F195] shrink-0">{formatSol(lamports)} SOL</span>
                </div>
              )
            })
          ) : (
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted px-3 py-2 text-sm">
              <span className="text-foreground font-medium">{entry.skill_name}</span>
              <span className="font-mono text-[#14F195]">{formatSol(totalCost)} SOL</span>
            </div>
          )}
          <div className="flex items-center justify-between px-1 pt-1 text-sm font-semibold">
            <span>Total</span>
            <span className="font-mono text-[#14F195]">{formatSol(totalCost)} SOL</span>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={paying}>Cancel</Button>
          <Button onClick={handlePay} disabled={paying} className="bg-[#9945FF] hover:bg-[#8535EF] text-white">
            {paying ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Sending…</> : 'Confirm & Pay'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

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

            {/* Synthesis type badge */}
            {entry.synthesis_type && (
              <Badge className="text-xs bg-[#9945FF]/15 text-[#9945FF] border-[#9945FF]/30">
                <Layers className="w-3 h-3 mr-1 inline" />
                {synthesisLabel(entry.synthesis_type)}
              </Badge>
            )}

            {/* Single-skill tier badge (only for non-synthesis entries) */}
            {!isSynthesis && entry.skill_tier > 0 && (
              <Badge className={`text-xs ${tierColor(entry.skill_tier)}`}>
                {tierLabel(entry.skill_tier)}
              </Badge>
            )}

            {paid && (
              <Badge className="text-xs bg-[#14F195]/15 text-[#14F195] border-[#14F195]/30">
                <CheckCircle2 className="w-3 h-3 mr-1 inline" />Paid
              </Badge>
            )}
            {entry.error && (
              <Badge variant="destructive" className="text-xs">Error</Badge>
            )}
          </div>

          {/* Contributing skills chips */}
          {isSynthesis && owners.length > 0 && (
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              <span className="text-xs text-muted-foreground">from:</span>
              {owners.map((co) => (
                <span
                  key={co.skillId}
                  className="text-xs px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground border border-border"
                >
                  {co.skillName}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
            {entry.response_ms != null && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />{entry.response_ms}ms
              </span>
            )}
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />{formatSol(totalCost)}
            </span>
            {helpfulPctData && (
              <span className="flex items-center gap-1 text-[#14F195]">
                <ThumbsUp className="w-3 h-3" />{helpfulPctData.pct}% helpful
              </span>
            )}
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
            <AnswerBody
              result={entry.result}
              paid={paid}
              paying={paying}
              payError={payError}
              roundStatus={roundStatus}
              totalCost={totalCost}
              isSynthesis={isSynthesis}
              uniqueOwnerCount={uniqueOwnerCount}
              owners={owners}
              helpfulPctData={helpfulPctData}
              onPay={handlePayClick}
              onRate={handleRate}
              rated={rated}
            />
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />Processing…
            </div>
          )}
        </div>
      )}
    </div>
    </>
  )
}
