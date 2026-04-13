'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { Transaction, SendTransactionError } from '@solana/web3.js'
import { Loader2, Shield, Server, CheckCircle2 } from 'lucide-react'
import bs58 from 'bs58'

type Step = 1 | 2 | 3

const inputCls =
  'w-full rounded-lg border border-[#2a3147] bg-[#161b27] px-3 py-2 text-sm text-[#F8FAFC] placeholder:text-[#4A5568] outline-none transition-colors focus:border-[#9945FF] focus:ring-1 focus:ring-[#9945FF]'
const labelCls = 'mb-1.5 block text-sm font-medium text-[#8B9BB4]'

export default function RegisterPage() {
  const router = useRouter()
  const { wallet, publicKey, signTransaction, signMessage, connected } = useWallet()
  const { connection } = useConnection()

  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1 fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [priceSol, setPriceSol] = useState('0.001')

  // Step 2 / Step 3 state (from prepare response)
  const [skillId, setSkillId] = useState<string | null>(null)
  const [nonce, setNonce] = useState<number | null>(null)

  // Step 3 field
  const [agentEndpoint, setAgentEndpoint] = useState('')

  const priceLamports = Math.round(parseFloat(priceSol || '0') * 1_000_000_000)

  const addTag = () => {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t) && tags.length < 8) {
      setTags([...tags, t])
      setTagInput('')
    }
  }

  const canProceed1 = name.trim().length > 0 && description.trim().length > 0

  // Step 2: call prepare, sign tx, send it
  const handleOnChainRegister = async () => {
    if (!publicKey || !signTransaction || !connected) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/register/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          tags,
          priceLamports,
          ownerWallet: publicKey.toBase58(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Prepare failed')

      if (!wallet?.adapter?.connected) throw new Error('Wallet disconnected — please reconnect and try again')
      const txBuffer = Buffer.from(data.unsignedTx, 'base64')
      const tx = Transaction.from(txBuffer)
      const signed = await signTransaction(tx)
      await connection.sendRawTransaction(signed.serialize())

      // Generate nonce client-side (timestamp used for anti-replay)
      const clientNonce = Date.now()
      setSkillId(data.skillId)
      setNonce(clientNonce)
      setStep(3)
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

  // Step 3: sign message + call complete
  const handleCompleteRegistration = async () => {
    if (!publicKey || !signMessage || !skillId || nonce === null || !connected) return
    setLoading(true)
    setError(null)
    try {
      if (!wallet?.adapter?.connected) throw new Error('Wallet disconnected — please reconnect and try again')
      const message = `${skillId}${agentEndpoint}${String(nonce)}`
      const messageBytes = new TextEncoder().encode(message)
      const sig = await signMessage(messageBytes)
      const walletSignature = bs58.encode(sig)

      const res = await fetch('/api/register/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillId,
          skillEndpoint: agentEndpoint,
          nonce,
          walletSignature,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Registration failed')

      router.push(`/skill/${skillId}`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const stepLabels: Record<Step, string> = {
    1: 'Skill Details',
    2: 'On-chain Registration',
    3: 'Register Endpoint',
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="mb-1 font-heading text-3xl font-bold text-[#F8FAFC]">Register Custom Agent</h1>
      <p className="mb-3 text-[#8B9BB4]">
        For developers deploying their own ElizaOS agent. Your agent runs on your server — the platform routes payments and proxies calls to it.
      </p>

      {/* Who should use this */}
      <div className="mb-6 rounded-xl border border-[#2a3147] bg-[#161b27] p-4 space-y-2">
        <p className="text-xs font-semibold text-[#8B9BB4] uppercase tracking-wider">Use this if you…</p>
        <div className="space-y-1.5 text-xs text-[#4A5568]">
          <p>✓ Have a running ElizaOS agent at a public HTTPS URL</p>
          <p>✓ Want full control — your own logic, APIs, tools, memory</p>
          <p>✓ Are comfortable deploying and operating a server</p>
        </div>
        <p className="pt-1 text-xs text-[#4A5568]">
          No server?{' '}
          <a href="/create" className="text-[#9945FF] hover:underline">Create a Prompt or Tool Skill instead</a>
          {' '}— no infrastructure needed.
        </p>
      </div>

      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-2">
        {([1, 2, 3] as Step[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                step === s
                  ? 'bg-[#9945FF] text-white'
                  : step > s
                  ? 'bg-[#2a3147] text-[#8B9BB4]'
                  : 'bg-[#161b27] border border-[#2a3147] text-[#4A5568]'
              }`}
            >
              {s}
            </div>
            {s < 3 && (
              <div className={`h-px w-12 transition-colors ${step > s ? 'bg-[#9945FF]/40' : 'bg-[#2a3147]'}`} />
            )}
          </div>
        ))}
        <span className="ml-2 text-sm text-[#4A5568]">{stepLabels[step]}</span>
      </div>

      {/* ── Step 1: Skill Details ─────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <label className={labelCls}>Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sentiment Analyst Agent"
              className={inputCls}
              maxLength={64}
            />
          </div>

          <div>
            <label className={labelCls}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this agent do? What inputs does it accept?"
              className={`${inputCls} min-h-[80px] resize-none`}
              maxLength={256}
            />
          </div>

          <div>
            <label className={labelCls}>Tags</label>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="finance, sentiment…"
                className={inputCls}
              />
              <button
                type="button"
                onClick={addTag}
                className="rounded-lg border border-[#2a3147] bg-[#161b27] px-4 py-2 text-sm text-[#8B9BB4] transition-colors hover:border-[#9945FF40] hover:text-[#F8FAFC]"
              >
                Add
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTags(tags.filter((x) => x !== t))}
                  className="rounded-md border border-[#2a3147] bg-[#1e2435] px-2 py-0.5 text-xs text-[#8B9BB4] transition-colors hover:border-red-500/30 hover:text-red-400"
                >
                  {t} ×
                </button>
              ))}
            </div>
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
            <p className="mt-1 text-xs text-[#4A5568]">
              Callers pay this amount per invocation via on-chain escrow.
            </p>
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

      {/* ── Step 2: On-chain Registration ────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-5">
          {/* Info banner */}
          <div className="flex gap-3 rounded-xl border border-[#2a3147] bg-[#161b27] p-4">
            <Shield className="mt-0.5 h-5 w-5 shrink-0 text-[#9945FF]" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-[#F8FAFC]">On-chain registration</p>
              <p className="text-xs text-[#8B9BB4]">
                This creates your <code className="text-[#9945FF]">SkillAccount</code> on Solana.
                No endpoint URL is stored on-chain — only your skill metadata and price.
              </p>
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-xl border border-[#2a3147] bg-[#161b27] p-5 space-y-3">
            <h3 className="font-heading text-sm font-semibold text-[#8B9BB4] uppercase tracking-wider">
              What will be registered
            </h3>
            <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <span className="text-[#4A5568]">Name</span>
              <span className="text-[#F8FAFC]">{name}</span>

              <span className="text-[#4A5568]">Description</span>
              <span className="text-[#8B9BB4] break-words">{description}</span>

              {tags.length > 0 && (
                <>
                  <span className="text-[#4A5568]">Tags</span>
                  <div className="flex flex-wrap gap-1">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-md border border-[#2a3147] bg-[#1e2435] px-2 py-0.5 text-xs text-[#8B9BB4]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </>
              )}

              <span className="text-[#4A5568]">Price</span>
              <span className="font-semibold text-[#14F195]">
                {(priceLamports / 1_000_000_000).toFixed(4)} SOL
              </span>

              <span className="text-[#4A5568]">Tier</span>
              <span className="text-[#8B9BB4]">3 — Custom Agent</span>
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
              onClick={() => { setError(null); setStep(1) }}
              disabled={loading}
              className="flex-1 rounded-lg border border-[#2a3147] bg-[#161b27] py-2.5 text-sm text-[#8B9BB4] transition-colors hover:border-[#9945FF40] hover:text-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Back
            </button>
            <button
              onClick={handleOnChainRegister}
              disabled={!connected || loading}
              className="flex-1 rounded-lg bg-[#9945FF] py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.97] hover:bg-[#8535EF] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              ) : (
                'Sign & Register On-Chain'
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Register Endpoint ─────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-5">
          {/* Success banner for step 2 */}
          <div className="flex gap-3 rounded-xl border border-[#14F195]/20 bg-[#14F195]/5 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#14F195]" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-[#F8FAFC]">On-chain registration complete</p>
              <p className="text-xs text-[#8B9BB4]">
                Your <code className="text-[#14F195]">SkillAccount</code> is live on Solana.
                Now register your agent's private endpoint — it is stored server-side only and never exposed.
              </p>
            </div>
          </div>

          {/* Info callout */}
          <div className="flex gap-3 rounded-xl border border-[#2a3147] bg-[#161b27] p-4">
            <Server className="mt-0.5 h-5 w-5 shrink-0 text-[#9945FF]" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-[#F8FAFC]">Endpoint privacy</p>
              <p className="text-xs text-[#8B9BB4]">
                Your HTTPS endpoint is stored in Supabase behind Row-Level Security and is
                only accessible to the platform's server-side proxy. Callers never see it.
              </p>
            </div>
          </div>

          <div>
            <label className={labelCls}>Agent endpoint URL</label>
            <input
              value={agentEndpoint}
              onChange={(e) => setAgentEndpoint(e.target.value)}
              placeholder="https://your-agent.example.com"
              className={inputCls}
              type="url"
            />
            <p className="mt-1 text-xs text-[#4A5568]">
              Must be HTTPS. The platform will POST call inputs here and return results to callers.
            </p>
          </div>

          {skillId && (
            <div className="rounded-lg border border-[#2a3147] bg-[#1e2435] px-3 py-2">
              <p className="text-xs text-[#4A5568]">Skill ID</p>
              <p className="mt-0.5 font-mono text-xs text-[#8B9BB4] break-all">{skillId}</p>
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            onClick={handleCompleteRegistration}
            disabled={!agentEndpoint.trim() || !agentEndpoint.startsWith('https://') || !connected || loading}
            className="w-full rounded-lg bg-[#9945FF] py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.97] hover:bg-[#8535EF] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
            ) : (
              'Complete Registration'
            )}
          </button>

          <p className="text-center text-xs text-[#4A5568]">
            You will be asked to sign a message with your wallet to prove endpoint ownership.
          </p>
        </div>
      )}
    </div>
  )
}
