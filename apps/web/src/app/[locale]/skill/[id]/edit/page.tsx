'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import { Loader2 } from 'lucide-react'
import bs58 from 'bs58'
import { lamportsToSol } from '@/lib/format'

interface SkillEditData {
  id: string
  name: string
  description: string
  tags: string[]
  price_lamports: number
  tier: number
  is_active: boolean
  system_prompt: string
  tool_config: { webhookUrl?: string } | null
}

export default function EditSkillPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const { wallet, publicKey, signMessage, connected } = useWallet()

  const [fetching, setFetching] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [systemPrompt, setSystemPrompt] = useState('')
  const [priceSol, setPriceSol] = useState('0.001')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [tier, setTier] = useState(1)

  // Load skill data for this owner
  useEffect(() => {
    if (!publicKey || !id) return
    setFetching(true)
    fetch(`/api/skills/${id}/edit?wallet=${publicKey.toBase58()}`)
      .then((r) => r.json())
      .then((data: Partial<SkillEditData> & { error?: string }) => {
        if (data.error) { setNotFound(true); return }
        setName(data.name ?? '')
        setDescription(data.description ?? '')
        setTags(data.tags ?? [])
        setSystemPrompt(data.system_prompt ?? '')
        setPriceSol(lamportsToSol(data.price_lamports ?? 0))
        setWebhookUrl(data.tool_config?.webhookUrl ?? '')
        setTier(data.tier ?? 1)
      })
      .catch(() => setNotFound(true))
      .finally(() => setFetching(false))
  }, [publicKey, id])

  const addTag = () => {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t) && tags.length < 8) {
      setTags([...tags, t])
      setTagInput('')
    }
  }

  const handleSave = async () => {
    if (!publicKey || !signMessage || !wallet?.adapter?.connected) return
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      if (!wallet?.adapter?.connected) throw new Error('Wallet disconnected — please reconnect and try again')
      const nonce = Date.now()
      const msgBytes = new TextEncoder().encode(`${id}${nonce}`)
      const sigBytes = await signMessage(msgBytes)
      const signature = bs58.encode(sigBytes)

      const priceLamports = Math.round(parseFloat(priceSol || '0') * 1_000_000_000)

      const res = await fetch(`/api/skills/${id}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          tags,
          priceLamports,
          systemPrompt,
          ...(tier === 2 && webhookUrl ? { webhookUrl } : {}),
          walletAddress: publicKey.toBase58(),
          signature,
          nonce,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      setSuccess(true)
      setTimeout(() => router.push(`/skill/${id}`), 1200)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-[#9945FF] focus:ring-1 focus:ring-[#9945FF]'
  const labelCls = 'mb-1.5 block text-sm font-medium text-muted-foreground'

  if (!connected) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-muted-foreground">Connect your wallet to edit this skill.</p>
      </div>
    )
  }

  if (fetching) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#9945FF]" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-muted-foreground">Skill not found or you don't own it.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Edit Skill</h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{id}</p>
        </div>
        <button
          onClick={() => router.push(`/skill/${id}`)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back
        </button>
      </div>

      <div className="space-y-5">
        <div>
          <label className={labelCls}>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={64} className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={256}
            className={`${inputCls} min-h-[80px] resize-none`}
          />
        </div>

        <div>
          <label className={labelCls}>Tags</label>
          <div className="flex gap-2">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              placeholder="add a tag…"
              className={inputCls}
            />
            <button
              type="button"
              onClick={addTag}
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm text-muted-foreground hover:border-[#9945FF40] hover:text-foreground transition-colors"
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
                className="rounded-md border border-border bg-secondary px-2 py-0.5 text-xs text-muted-foreground hover:border-red-500/30 hover:text-red-400 transition-colors"
              >
                {t} ×
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelCls}>System prompt</label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className={`${inputCls} min-h-[120px] resize-none`}
          />
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
        </div>

        {tier === 2 && (
          <div>
            <label className={labelCls}>Webhook URL</label>
            <input
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-api.com/webhook"
              className={inputCls}
            />
          </div>
        )}

        {error && (
          <p className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{error}</p>
        )}
        {success && (
          <p className="rounded-lg border border-[#14F195]/20 bg-[#14F195]/10 p-3 text-sm text-[#14F195]">
            Saved — redirecting…
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push(`/skill/${id}`)}
            className="flex-1 rounded-lg border border-border bg-card py-2.5 text-sm text-muted-foreground hover:border-[#9945FF40] hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name || !systemPrompt}
            className="flex-1 rounded-lg bg-[#9945FF] py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.97] hover:bg-[#8535EF] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
