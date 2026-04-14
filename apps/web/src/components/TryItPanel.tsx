'use client'

import { useState, useEffect } from 'react'
import { Buffer } from 'buffer'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { Transaction, SystemProgram, PublicKey } from '@solana/web3.js'
import { Zap, Lock, Eye, Loader2, ExternalLink, Share2 } from 'lucide-react'
import { lamportsToSol, lamportsToUsd } from '@/lib/format'
import { useSolPrice } from '@/hooks/useSkills'
import { StarRating } from '@/components/StarRating'

type PanelMode = 'preview' | 'x402' | 'escrow'

interface TryItPanelProps {
  skillId: string
  priceLamports: number
}

export function TryItPanel({ skillId, priceLamports }: TryItPanelProps) {
  const [mode, setMode] = useState<PanelMode>('preview')
  const [input, setInput] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txSig, setTxSig] = useState<string | null>(null)
  const [callId, setCallId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const { wallet, publicKey, signTransaction, connected } = useWallet()
  const { connection } = useConnection()
  const { data: priceData } = useSolPrice()

  // Pre-fill input from URL ?input= query param (enables shareable try-it links)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const encoded = params.get('input')
    if (encoded) {
      try {
        setInput(atob(encoded))
      } catch {
        setInput(encoded)
      }
    }
  }, [])

  const reset = () => { setResult(null); setError(null); setTxSig(null); setCallId(null) }

  const copyResultLink = () => {
    if (!input.trim()) return
    const url = new URL(window.location.href)
    url.searchParams.set('input', btoa(input))
    navigator.clipboard.writeText(url.toString()).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const runX402 = async () => {
    if (!input.trim() || !publicKey || !signTransaction || !connected) return
    setLoading(true); reset()
    try {
      // Step 1: probe — get 402 payment requirements
      const probeRes = await fetch(`/api/call/x402/${skillId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      })
      if (probeRes.status !== 402) throw new Error('Expected 402 payment response')
      const payReq = await probeRes.json() as { accepts?: { maxAmountRequired: string; payTo: string }[] }
      const accept = payReq.accepts?.[0]
      if (!accept) throw new Error('No payment terms in 402 response')
      const lamports = Number(accept.maxAmountRequired)
      if (!isFinite(lamports) || lamports <= 0) throw new Error('Invalid payment amount in 402 response')

      // Step 2: build + sign SOL transfer to skill owner
      const { blockhash } = await connection.getLatestBlockhash('confirmed')
      const tx = new Transaction({ recentBlockhash: blockhash, feePayer: publicKey })
      tx.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(accept.payTo),
          lamports,
        })
      )
      const signed = await signTransaction(tx)
      const sig = await connection.sendRawTransaction(signed.serialize())

      // Step 3: re-call with x402-Payment header carrying the tx proof
      const payment = btoa(JSON.stringify({
        x402Version: 1,
        scheme: 'exact',
        network: 'solana-devnet',
        payload: { signature: sig, transaction: Buffer.from(signed.serialize()).toString('base64') },
      }))

      const callRes = await fetch(`/api/call/x402/${skillId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x402-payment': payment },
        body: JSON.stringify({ input }),
      })
      const callData = await callRes.json() as { result?: string; error?: string }
      if (!callRes.ok) throw new Error(callData.error ?? 'x402 call failed')
      setResult(callData.result ?? '')
      setTxSig(sig)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const runPreview = async () => {
    if (!input.trim()) return
    setLoading(true); reset()
    try {
      const res = await fetch('/api/call/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId, input, preview: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Preview failed')
      setResult(data.result)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const runEscrow = async () => {
    if (!input.trim() || !publicKey || !signTransaction || !connected) return
    setLoading(true); reset()
    try {
      const prepRes = await fetch('/api/call/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId, input, callerWallet: publicKey.toBase58() }),
      })
      const prepData = await prepRes.json()
      if (!prepRes.ok) throw new Error(prepData.error ?? 'Prepare failed')

      if (!wallet?.adapter?.connected) throw new Error('Wallet disconnected — please reconnect and try again')
      const txBuffer = Buffer.from(prepData.unsignedTx, 'base64')
      const tx = Transaction.from(txBuffer)
      const signed = await signTransaction(tx)

      const execRes = await fetch('/api/call/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId: prepData.callId,
          signedTx: signed.serialize().toString('base64'),
          input,
          skillId,
        }),
      })
      const execData = await execRes.json()
      if (!execRes.ok) throw new Error(execData.error ?? 'Execute failed')

      const evtSource = new EventSource(`/api/events?callId=${prepData.callId}`)
      evtSource.onmessage = (e) => {
        const payload = JSON.parse(e.data)
        if (payload.result) { setResult(payload.result); evtSource.close() }
        if (payload.txSignature) setTxSig(payload.txSignature)
        if (payload.status === 'timeout') { setError('Timed out waiting for result — the skill may still be processing.'); evtSource.close() }
      }
      evtSource.onerror = () => {
        setError('Lost connection to result stream — please try again.')
        evtSource.close()
      }

      if (execData.result) { setResult(execData.result); setTxSig(execData.txSignature) }
      setCallId(prepData.callId)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const tabs: { mode: PanelMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'preview', label: 'Preview', icon: <Eye className="h-3.5 w-3.5" /> },
    { mode: 'x402',   label: 'Quick Pay', icon: <Zap className="h-3.5 w-3.5" /> },
    { mode: 'escrow', label: 'Escrow', icon: <Lock className="h-3.5 w-3.5" /> },
  ]

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-4 font-heading font-semibold text-foreground">Try it</h3>

      {/* Mode tabs */}
      <div className="mb-4 flex rounded-lg bg-background p-1">
        {tabs.map((t) => (
          <button
            key={t.mode}
            onClick={() => { setMode(t.mode); reset() }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all ${
              mode === t.mode
                ? 'bg-secondary text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-muted-foreground'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Mode description */}
      {mode === 'preview' && (
        <p className="mb-3 text-xs text-muted-foreground">Free preview · rate limited to 3/day per IP</p>
      )}
      {mode === 'x402' && (
        <p className="mb-3 text-xs text-muted-foreground">
          x402 instant payment · no lock-up · {lamportsToSol(priceLamports)} SOL
          {priceData?.solUsd ? ` (${lamportsToUsd(priceLamports, priceData.solUsd)})` : ''}
        </p>
      )}
      {mode === 'escrow' && (
        <p className="mb-3 text-xs text-muted-foreground">
          On-chain escrow · refundable · {lamportsToSol(priceLamports)} SOL
          {priceData?.solUsd ? ` (${lamportsToUsd(priceLamports, priceData.solUsd)})` : ''}
        </p>
      )}

      {/* Input */}
      <textarea
        placeholder="Enter your input..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="mb-3 min-h-[80px] w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-[#9945FF] focus:ring-1 focus:ring-[#9945FF]"
      />

      {/* Action button */}
      {mode === 'preview' && (
        <button
          onClick={runPreview}
          disabled={loading || !input.trim()}
          className="w-full rounded-lg border border-border bg-secondary py-2 text-sm font-medium text-muted-foreground transition-all active:scale-[0.97] hover:border-[#9945FF40] hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Try for free'}
        </button>
      )}

      {mode === 'x402' && (
        <button
          onClick={runX402}
          disabled={loading || !input.trim() || !connected}
          className="w-full rounded-lg bg-swarm-gradient py-2 text-sm font-semibold text-[#0f1117] transition-all active:scale-[0.97] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="mx-auto h-4 w-4 animate-spin" />
          ) : !connected ? (
            'Connect wallet to pay'
          ) : (
            <span className="flex items-center justify-center gap-1.5">
              <Zap className="h-4 w-4" />
              Quick Pay x402 ({lamportsToSol(priceLamports)} SOL)
            </span>
          )}
        </button>
      )}

      {mode === 'escrow' && (
        <button
          onClick={runEscrow}
          disabled={loading || !input.trim() || !connected}
          className="w-full rounded-lg bg-swarm-gradient py-2 text-sm font-semibold text-[#0f1117] transition-all active:scale-[0.97] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="mx-auto h-4 w-4 animate-spin" />
          ) : !connected ? (
            'Connect wallet to pay'
          ) : (
            <span className="flex items-center justify-center gap-1.5">
              <Lock className="h-4 w-4" />
              Pay & Run ({lamportsToSol(priceLamports)} SOL)
            </span>
          )}
        </button>
      )}

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
            <button
              onClick={copyResultLink}
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-[#9945FF]"
              title="Copy shareable link with this input"
            >
              <Share2 className="h-3 w-3" />
              {copied ? 'Copied!' : 'Share'}
            </button>
          </div>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{result}</p>
          {txSig && (
            <a
              href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs text-[#9945FF] transition-colors hover:text-[#8535EF]"
            >
              View tx <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {/* Inline rating — only shown for paid calls where we have a callId */}
          {callId && publicKey && mode !== 'preview' && (
            <div className="mt-3 border-t border-border pt-3">
              <StarRating
                callId={callId}
                skillId={skillId}
                callerWallet={publicKey.toBase58()}
                size="sm"
              />
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}
    </div>
  )
}
