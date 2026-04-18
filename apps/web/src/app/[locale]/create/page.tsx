'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWallet } from '@/hooks/useWalletAdapter'
import { useConnection } from '@solana/wallet-adapter-react'
import { Transaction, SendTransactionError } from '@solana/web3.js'
import bs58 from 'bs58'
import { Loader2, Sparkles } from 'lucide-react'
import { lamportsToSol, lamportsToUsd } from '@/lib/format'
import { useSolPrice } from '@/hooks/useSkills'

type Step = 1 | 2 | 3

export default function CreatePage() {
  const router = useRouter()
  const { wallet, publicKey, signTransaction, signMessage, connected } = useWallet()
  const { connection } = useConnection()
  const { data: priceData } = useSolPrice()

  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tier, setTier] = useState<1 | 2>(1)
  const [systemPrompt, setSystemPrompt] = useState('')
  const [priceSol, setPriceSol] = useState('0.001')
  const [mcpUrl, setMcpUrl] = useState('')
  const [mcpToken, setMcpToken] = useState('')
  const [assistLoading, setAssistLoading] = useState(false)
  const [assistError, setAssistError] = useState<string | null>(null)
  const [tagError, setTagError] = useState<string | null>(null)

  const priceLamports = Math.round(parseFloat(priceSol || '0') * 1_000_000_000)

  const addTag = () => {
    const t = tagInput.trim().toLowerCase()
    if (!t) return
    if (tags.length >= 8) {
      setTagError('Maximum 8 tags allowed')
      return
    }
    if (t.length > 20) {
      setTagError('Tags must be 20 characters or fewer')
      return
    }
    if (tags.includes(t)) {
      setTagError('Tag already added')
      return
    }
    setTagError(null)
    setTags([...tags, t])
    setTagInput('')
  }

  const aiAssist = async () => {
    setAssistLoading(true)
    setAssistError(null)
    try {
      const res = await fetch('/api/prompt-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, tags, draft: systemPrompt }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      if (data.suggestion) setSystemPrompt(data.suggestion)
    } catch {
      setAssistError("Couldn't generate suggestion — try again")
    } finally {
      setAssistLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!publicKey || !signTransaction || !signMessage || !connected) return
    setLoading(true)
    setError(null)
    try {
      // Generate nonce, sign it to prove wallet ownership (transparent to user — one wallet popup)
      const nonce = String(Date.now())
      const sigBytes = await signMessage(new TextEncoder().encode(nonce))
      const signature = bs58.encode(sigBytes)

      const res = await fetch('/api/create-skill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          tags,
          priceLamports,
          ownerWallet: publicKey.toBase58(),
          systemPrompt,
          nonce,
          signature,
          ...(tier === 2 && mcpUrl ? { mcpConfig: { mcpUrl, ...(mcpToken ? { mcpToken } : {}) } } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Create failed')

      if (!wallet?.adapter?.connected) throw new Error('Wallet disconnected — please reconnect and try again')
      const txBuffer = Buffer.from(data.unsignedTx, 'base64')
      const tx = Transaction.from(txBuffer)
      const signed = await signTransaction(tx)
      await connection.sendRawTransaction(signed.serialize())

      router.push(`/skill/${data.skillId}`)
    } catch (e) {
      if (e instanceof SendTransactionError) {
        const logs = e.logs ?? await e.getLogs(connection).catch(() => [])
        const detail = logs.length ? `\n${logs.join('\n')}` : ''
        setError(`Transaction failed: ${e.message}${detail}`)
      } else {
        setError((e as Error).message)
      }
    } finally {
      setLoading(false)
    }
  }

  const canProceed1 = name.trim().length > 0 && description.trim().length > 0
  const canProceed2 = systemPrompt.trim().length > 0 && priceLamports > 0 && (tier === 1 || mcpUrl.trim().length > 0)
  const canSubmit = canProceed1 && canProceed2 && connected

  const inputCls = 'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-[#9945FF] focus:ring-1 focus:ring-[#9945FF]'
  const labelCls = 'mb-1.5 block text-sm font-medium text-muted-foreground'

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="mb-1 font-heading text-3xl font-bold text-foreground">Create a Skill</h1>
      <p className="mb-2 text-muted-foreground">Register your AI skill and start earning SOL per call.</p>
      <p className="mb-8 text-xs text-muted-foreground">
        No server? Use a <span className="text-foreground">Prompt Skill</span>. Have an MCP server? Use an <span className="text-foreground">MCP Skill</span>. Building an autonomous agent?{' '}
        <a href="/register" className="text-[#9945FF] hover:underline">Register a Custom Agent</a>.
      </p>

      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-2">
        {([1, 2, 3] as Step[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                step === s
                  ? 'bg-[#9945FF] text-white'
                  : step > s
                  ? 'bg-[#2a3147] text-muted-foreground'
                  : 'bg-card border border-border text-muted-foreground'
              }`}
            >
              {s}
            </div>
            {s < 3 && <div className={`h-px w-12 ${step > s ? 'bg-[#2a3147]' : 'bg-card'}`} />}
          </div>
        ))}
        <span className="ml-2 text-sm text-muted-foreground">
          {step === 1 ? 'Basics' : step === 2 ? 'Configuration' : 'Review'}
        </span>
      </div>

      {/* Step 1: Basics */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <label className={labelCls}>Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Stock Analyst"
              className={inputCls}
              maxLength={64}
            />
          </div>

          <div>
            <label className={labelCls}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this skill do?"
              className={`${inputCls} min-h-[80px] resize-none`}
              maxLength={256}
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className={labelCls.replace('mb-1.5 ', '')}>Tags</label>
              <span className={`text-xs ${tags.length >= 8 ? 'text-red-400' : 'text-muted-foreground'}`}>
                {tags.length}/8 tags
              </span>
            </div>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={(e) => { setTagInput(e.target.value); setTagError(null) }}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="finance, stocks…"
                className={inputCls}
              />
              <button
                type="button"
                onClick={addTag}
                className="rounded-lg border border-border bg-card px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-[#9945FF40] hover:text-foreground"
              >
                Add
              </button>
            </div>
            {tagError && (
              <p className="mt-1 text-xs text-red-400">{tagError}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTags(tags.filter((x) => x !== t))}
                  className="rounded-md border border-border bg-secondary px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-red-500/30 hover:text-red-400"
                >
                  {t} ×
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Skill type</label>
            <div className="space-y-2">
              {/* Tier 1 */}
              <button
                type="button"
                onClick={() => setTier(1)}
                className={`w-full rounded-lg border p-4 text-left transition-colors ${
                  tier === 1 ? 'border-[#9945FF] bg-[#9945FF]/10' : 'border-border bg-card hover:border-[#9945FF40]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-semibold ${tier === 1 ? 'text-foreground' : 'text-muted-foreground'}`}>
                    Prompt Skill
                  </span>
                  <span className="rounded-md bg-[#14F195]/10 px-2 py-0.5 text-xs text-[#14F195]">No code</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Write a system prompt — the platform handles the LLM call. Perfect for Q&A assistants, analysts, writers, and summarizers.
                </p>
                <p className="mt-1.5 text-xs text-[#9945FF]">e.g. Stock Analyst, Legal Summarizer, Tweet Writer</p>
              </button>

              {/* Tier 2 */}
              <button
                type="button"
                onClick={() => setTier(2)}
                className={`w-full rounded-lg border p-4 text-left transition-colors ${
                  tier === 2 ? 'border-[#9945FF] bg-[#9945FF]/10' : 'border-border bg-card hover:border-[#9945FF40]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-semibold ${tier === 2 ? 'text-foreground' : 'text-muted-foreground'}`}>
                    MCP Skill
                  </span>
                  <span className="rounded-md bg-[#9945FF]/10 px-2 py-0.5 text-xs text-[#9945FF]">MCP</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Connect your MCP server. The platform discovers your tools automatically and lets the LLM call them to fetch real data.
                </p>
                <p className="mt-1.5 text-xs text-[#9945FF]">e.g. Live Price Feed, Database Query, Search API</p>
              </button>

              {/* Tier 3 callout */}
              <div className="rounded-lg border border-dashed border-border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-muted-foreground">Custom Agent</span>
                  <span className="rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">Self-hosted</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Deploy your own ElizaOS agent and register its endpoint. Full autonomy — browse the web, run code, call any API.
                </p>
                <a
                  href="/register"
                  className="mt-2 inline-block text-xs text-[#9945FF] hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Register a custom agent instead →
                </a>
              </div>
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!canProceed1}
            className="w-full rounded-lg bg-[#9945FF] py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.97] hover:bg-[#8535EF] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      )}

      {/* Step 2: Configuration */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className={labelCls.replace('mb-1.5 ', '')}>System prompt</label>
              <button
                type="button"
                onClick={aiAssist}
                disabled={assistLoading}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[#9945FF] transition-colors hover:bg-[#9945FF]/10 disabled:opacity-50"
              >
                {assistLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                AI Assist
              </button>
            </div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="You are a financial analyst. Given a stock ticker, provide…"
              className={`${inputCls} min-h-[120px] resize-none`}
            />
            {assistError && (
              <p className="mt-1 text-xs text-red-400">{assistError}</p>
            )}
          </div>

          <div>
            <label className={labelCls}>Price per call (SOL)</label>
            <input
              type="number"
              value={priceSol}
              onChange={(e) => setPriceSol(e.target.value)}
              min="0.000001"
              step="0.001"
              className={inputCls}
            />
            {priceData?.solUsd && priceLamports > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                ≈ {lamportsToUsd(priceLamports, priceData.solUsd)} USD
              </p>
            )}
          </div>

          {tier === 2 && (
            <>
              <div>
                <label className={labelCls}>MCP Server URL</label>
                <input
                  value={mcpUrl}
                  onChange={(e) => setMcpUrl(e.target.value)}
                  placeholder="https://your-server.com/mcp"
                  className={inputCls}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Must be an MCP-compatible endpoint (Streamable HTTP or SSE transport).
                  The platform will call <code className="text-[#9945FF]">tools/list</code> to discover your tools automatically.
                </p>
              </div>
              <div>
                <label className={labelCls}>Bearer Token <span className="text-muted-foreground/60">(optional)</span></label>
                <input
                  type="password"
                  value={mcpToken}
                  onChange={(e) => setMcpToken(e.target.value)}
                  placeholder="sk-… or your server's API key"
                  className={inputCls}
                  autoComplete="off"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Sent as <code className="text-[#9945FF]">Authorization: Bearer &lt;token&gt;</code> on every MCP request. Stored encrypted, never exposed to callers.
                </p>
              </div>
            </>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 rounded-lg border border-border bg-card py-2.5 text-sm text-muted-foreground transition-colors hover:border-[#9945FF40] hover:text-foreground"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!canProceed2}
              className="flex-1 rounded-lg bg-[#9945FF] py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.97] hover:bg-[#8535EF] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review + Submit */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h3 className="font-heading font-semibold text-foreground">Review</h3>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-muted-foreground">Name</span>
              <span className="text-muted-foreground">{name}</span>
              <span className="text-muted-foreground">Type</span>
              <span className="text-muted-foreground">Tier {tier} — {tier === 1 ? 'Prompt' : 'MCP'}</span>
              <span className="text-muted-foreground">Price</span>
              <span className="font-semibold text-[#14F195]">
                {lamportsToSol(priceLamports)} SOL
                {priceData?.solUsd ? ` (${lamportsToUsd(priceLamports, priceData.solUsd)})` : ''}
              </span>
            </div>
          </div>

          {!connected && (
            <p className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3 text-sm text-yellow-400">
              Connect your wallet to sign the on-chain registration transaction.
            </p>
          )}

          {error && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 rounded-lg border border-border bg-card py-2.5 text-sm text-muted-foreground transition-colors hover:border-[#9945FF40] hover:text-foreground"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || loading}
              className="flex-1 rounded-lg bg-skillhive-gradient py-2.5 text-sm font-semibold text-[#0f1117] transition-all active:scale-[0.97] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Create & Register'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
