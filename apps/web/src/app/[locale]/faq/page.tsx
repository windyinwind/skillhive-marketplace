'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useTranslations } from 'next-intl'

function StaticFaqs({ t }: { t: ReturnType<typeof useTranslations<'faq'>> }) {
  const items: { q: string; a: React.ReactNode }[] = [
    {
      q: t('q_whatIsSwarm'),
      a: <p>{t('a_whatIsSwarm')}</p>,
    },
    {
      q: t('q_wallet'),
      a: <p>{t('a_wallet')}</p>,
    },
    {
      q: t('q_arena'),
      a: <p>{t('a_arena')}</p>,
    },
    {
      q: t('q_earn'),
      a: (
        <ul className="space-y-1 list-disc list-inside">
          <li>{t('a_earn1')}</li>
          <li>{t('a_earn2')}</li>
          <li>{t('a_earn3')}</li>
        </ul>
      ),
    },
    {
      q: t('q_wallets'),
      a: (
        <p>
          {t('a_wallets').split('@solana/wallet-adapter')[0]}
          <code className="text-xs bg-muted px-1 rounded">@solana/wallet-adapter</code>
          {t('a_wallets').split('@solana/wallet-adapter')[1]}
        </p>
      ),
    },
    {
      q: t('q_network'),
      a: (
        <p>
          {t('a_network').split('Solana Devnet')[0]}
          <strong>Solana Devnet</strong>
          {t('a_network').split('Solana Devnet')[1]}
        </p>
      ),
    },
    {
      q: t('q_mcpVsAgent'),
      a: (
        <div className="space-y-3">
          <p>{t('a_mcpVsAgent_intro')}</p>
          <div className="space-y-2">
            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <p className="font-semibold text-foreground mb-1">{t('a_mcpVsAgent_tier2_title')}</p>
              <p>{t('a_mcpVsAgent_tier2_body')}</p>
              <p className="mt-1 text-muted-foreground/70">{t('a_mcpVsAgent_tier2_example')}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <p className="font-semibold text-foreground mb-1">{t('a_mcpVsAgent_tier3_title')}</p>
              <p>{t('a_mcpVsAgent_tier3_body')}</p>
              <p className="mt-1 text-muted-foreground/70">{t('a_mcpVsAgent_tier3_example')}</p>
            </div>
          </div>
          <p>{t('a_mcpVsAgent_rule')}</p>
        </div>
      ),
    },
    {
      q: t('q_tiers'),
      a: (
        <ul className="space-y-1.5">
          <li><strong>{'Tier 1'}</strong>{' — '}{t('a_tier1').split('—')[1]?.trim()}</li>
          <li><strong>{'Tier 2'}</strong>{' — '}{t('a_tier2').split('—')[1]?.trim()}</li>
          <li><strong>{'Tier 3'}</strong>{' — '}{t('a_tier3').split('—')[1]?.trim()}</li>
        </ul>
      ),
    },
    {
      q: t('q_endpoint'),
      a: (
        <p>
          {t('a_endpoint').split('never')[0]}
          <strong>never</strong>
          {t('a_endpoint').split('never').slice(1).join('never')}
        </p>
      ),
    },
    {
      q: t('q_fee'),
      a: (
        <p>
          {t('a_fee')}{' '}
          <Link href="/fees" className="text-[#9945FF] hover:underline">{t('a_feeLink')}</Link>.
        </p>
      ),
    },
    {
      q: t('q_agentDiscovery'),
      a: (
        <div className="space-y-2 text-sm">
          <p>{t('a_agentDiscovery')}</p>
          <div className="rounded-lg bg-muted border border-border p-3 font-mono text-xs space-y-1">
            <div className="text-muted-foreground"># discover all skills</div>
            <div>GET /api/skills</div>
            <div className="text-muted-foreground mt-2"># filter by tag or query</div>
            <div>GET /api/skills?q=stock+analysis</div>
          </div>
        </div>
      ),
    },
    {
      q: t('q_externalTools'),
      a: (
        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-muted/50 p-3">
            <p className="font-semibold text-foreground mb-1">REST API <span className="text-xs font-normal text-[#14F195]">— works today</span></p>
            <p>{t('a_externalTools_rest')}</p>
            <pre className="mt-2 rounded bg-muted border border-border p-2 font-mono text-xs overflow-x-auto">{`GET  /api/skills?q=stock+analysis
POST /api/call/x402/{skillId}
     { "input": "Should I buy NVIDIA?" }`}</pre>
          </div>
          <div className="rounded-lg border border-border bg-muted/50 p-3">
            <p className="font-semibold text-foreground mb-1">MCP server <span className="text-xs font-normal text-[#14F195]">— available now</span></p>
            <p>{t('a_externalTools_mcp')}</p>
            <pre className="mt-2 rounded bg-muted border border-border p-2 font-mono text-xs overflow-x-auto">{`# Claude Code CLI
claude mcp add swarm https://swarm.market/api/mcp

# Gemini CLI / Cursor / Windsurf
# → add MCP server: https://swarm.market/api/mcp`}</pre>
          </div>
          <div className="rounded-lg border border-border bg-muted/50 p-3">
            <p className="font-semibold text-foreground mb-1">ElizaOS plugin <span className="text-xs font-normal text-[#14F195]">— available now</span></p>
            <p>{t('a_externalTools_plugin')}</p>
            <Link href="/agent-sdk" className="mt-2 inline-block text-xs text-[#9945FF] hover:underline">
              plugin-swarm setup guide →
            </Link>
          </div>
        </div>
      ),
    },
    {
      q: t('q_agents'),
      a: (
        <p>
          {t('a_agents').split('plugin-swarm')[0]}
          <code className="text-xs bg-muted px-1 mx-1 rounded">plugin-swarm</code>
          {t('a_agents').split('plugin-swarm')[1]}
        </p>
      ),
    },
    {
      q: t('q_arenaError'),
      a: <p>{t('a_arenaError')}</p>,
    },
    {
      q: t('q_support'),
      a: (
        <p>
          {t('a_supportPre')}{' '}
          <a href="https://github.com/windyinwind/swarm-marketplace/issues" target="_blank" rel="noopener noreferrer" className="text-[#9945FF] hover:underline">
            {t('a_supportGitHub')}
          </a>{' '}
          {t('a_supportMid')}{' '}
          <a href="https://x.com/swarm_market" target="_blank" rel="noopener noreferrer" className="text-[#9945FF] hover:underline">
            {t('a_supportTwitter')}
          </a>.
        </p>
      ),
    },
  ]
  return <>{items.map((item) => <FAQItem key={item.q} q={item.q} a={item.a} />)}</>
}

function FAQItem({ q, a }: { q: string; a: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 py-4 text-left text-foreground font-medium hover:text-[#9945FF] transition-colors"
      >
        <span>{q}</span>
        {open ? <ChevronUp className="w-4 h-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />}
      </button>
      {open && (
        <div className="pb-4 text-sm text-muted-foreground leading-relaxed space-y-2">
          {a}
        </div>
      )}
    </div>
  )
}

export default function FAQPage() {
  const t = useTranslations('faq')
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      {/* Header */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#9945FF]/30 bg-[#9945FF]/10 px-3 py-1 text-xs font-medium text-[#9945FF] mb-4">
          {t('badge')}
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-4">{t('title')}</h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          {t('subtitle')}
        </p>
      </div>

      {/* FAQ list */}
      <div className="rounded-xl border border-border bg-card px-6 mb-10">
        <StaticFaqs t={t} />
      </div>

      {/* Bottom links */}
      <div className="flex flex-wrap gap-4 text-sm">
        <Link href="/publish" className="text-[#9945FF] hover:underline">{t('providerGuideLink')}</Link>
        <Link href="/fees" className="text-[#9945FF] hover:underline">{t('feeScheduleLink')}</Link>
        <Link href="/usage" className="text-[#9945FF] hover:underline">{t('usagePolicyLink')}</Link>
        <a href="https://github.com/windyinwind/swarm-marketplace" target="_blank" rel="noopener noreferrer" className="text-[#9945FF] hover:underline">{t('githubLink')}</a>
      </div>
    </div>
  )
}
