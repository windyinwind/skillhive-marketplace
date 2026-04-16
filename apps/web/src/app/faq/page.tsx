'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface FaqItemProps {
  q: string
  children: React.ReactNode
}

function FaqItem({ q, children }: FaqItemProps) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b last:border-0" style={{ borderColor: 'var(--border-subtle)' }}>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-start justify-between gap-6 py-5 text-left text-sm font-medium text-foreground transition-colors hover:text-[#9945FF]"
      >
        <span>{q}</span>
        {open
          ? <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          : <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>
      {open && (
        <div className="pb-5 text-sm leading-relaxed text-muted-foreground space-y-3">
          {children}
        </div>
      )}
    </div>
  )
}

interface SectionProps {
  title: string
  children: React.ReactNode
}

function Section({ title, children }: SectionProps) {
  return (
    <div className="mb-10">
      <h2 className="mb-1 font-heading text-lg font-bold text-foreground">{title}</h2>
      <div className="rounded-xl border bg-card overflow-hidden" style={{ borderColor: 'var(--border-subtle)' }}>
        {children}
      </div>
    </div>
  )
}

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="mb-10">
        <h1 className="font-heading text-3xl font-bold text-foreground">Frequently Asked Questions</h1>
        <p className="mt-2 text-muted-foreground">
          Answers to common questions about using SkillHive, payments, fees, and publishing skills.
          See also the <Link href="/publish" className="text-[#9945FF] hover:underline">Provider Guide</Link> for detailed setup tutorials.
        </p>
      </div>

      {/* General */}
      <Section title="General">
        <FaqItem q="What is SkillHive Marketplace?">
          <p>SkillHive is an open marketplace for AI agent skills built on Solana. Anyone can browse and pay for AI skills — from stock analysis to code review — and anyone can publish a skill and earn SOL every time it's called.</p>
          <p>Skills range from simple prompt-based assistants (no-code) to fully autonomous ElizaOS agents that can browse the web, call APIs, and chain tool calls.</p>
        </FaqItem>
        <FaqItem q="Do I need a crypto wallet to use SkillHive?">
          <p>To <strong className="text-foreground">browse the marketplace</strong> and try skill previews, no wallet is required.</p>
          <p>To <strong className="text-foreground">pay for full results</strong>, run Arena rounds, or use SkillHive Chat you need a Solana wallet — Phantom, Solflare, or Backpack. These are free browser extensions.</p>
          <p>To <strong className="text-foreground">publish a skill</strong>, you also need a wallet to sign the on-chain registration transaction.</p>
        </FaqItem>
        <FaqItem q="Which blockchains does SkillHive support?">
          <p>SkillHive is built entirely on <strong className="text-foreground">Solana</strong>. All payments settle in SOL. The smart contracts use the Anchor framework and are currently deployed on Devnet, with a Mainnet launch planned.</p>
        </FaqItem>
        <FaqItem q="What is the Arena?">
          <p>Arena lets you ask one question and get answers from multiple AI skills in parallel. You read all the answers, then pay only for the one that actually helped. SOL goes directly to that skill's creator.</p>
          <p>It's useful for comparing different approaches — for example, pitting a conservative stock analyst against an aggressive one on the same query.</p>
        </FaqItem>
        <FaqItem q="What is SkillHive Chat?">
          <p>Chat is the SkillHive Orchestrator — an AI that automatically discovers relevant skills from the marketplace and calls them on your behalf. It also fetches live market data and runs web searches before synthesising a final answer.</p>
          <p>Each wallet gets 3 free Chat responses. After that, your wallet pays skill owners directly at the end of each response (one transaction covering all skills used).</p>
        </FaqItem>
      </Section>

      {/* Payments & Fees */}
      <Section title="Payments & Fees">
        <FaqItem q="How much does SkillHive charge?">
          <p>SkillHive takes a <strong className="text-foreground">5% platform fee</strong> on every paid skill call. The remaining 95% goes directly to the skill creator's wallet.</p>
          <p>There is no subscription, no monthly fee, and no charge for browsing or previewing skills.</p>
        </FaqItem>
        <FaqItem q="How do I pay for a skill?">
          <p>There are three payment paths:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li><strong className="text-foreground">Preview</strong> — free, up to 3 times per IP per day. The platform subsidises the cost. Results are truncated.</li>
            <li><strong className="text-foreground">Quick Pay (x402)</strong> — instant micro-payment via the x402 protocol. Fast and no lock-up period.</li>
            <li><strong className="text-foreground">Secure Escrow</strong> — SOL is locked on-chain before the skill runs. Released to the creator after delivery. Refundable if the skill fails to respond.</li>
          </ul>
        </FaqItem>
        <FaqItem q="When is payment taken?">
          <p>For <strong className="text-foreground">escrow calls</strong>: SOL is locked when you sign the transaction (before the skill runs) and released immediately after a result is delivered.</p>
          <p>For <strong className="text-foreground">x402 calls</strong>: payment is verified and settled in the same request, typically within 1–2 seconds.</p>
          <p>For <strong className="text-foreground">Chat responses</strong>: skills run first, then your wallet is prompted for a single payment covering all skills used in that response.</p>
        </FaqItem>
        <FaqItem q="What if a skill doesn't return a result?">
          <p>For escrow payments, the <code className="text-[#9945FF]">CallAccount</code> on Solana will time out and your SOL becomes refundable. You can claim the refund from your dashboard.</p>
          <p>For x402 payments, the facilitator only settles if a valid result is returned — if the skill fails, the payment is not charged.</p>
        </FaqItem>
        <FaqItem q="Are there any gas fees?">
          <p>Yes — Solana charges a small network fee per transaction, typically <strong className="text-foreground">0.000005 SOL</strong> (~$0.001). This goes to Solana validators, not to SkillHive.</p>
          <p>Registering a skill also costs a one-time account rent fee (~0.00002 SOL) to store the <code className="text-[#9945FF]">SkillAccount</code> on-chain. SkillHive charges no registration fee.</p>
        </FaqItem>
        <FaqItem q="How do Arena deposits work?">
          <p>Arena pricing varies by skill tier to ensure creators are always compensated for compute costs:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li><strong className="text-foreground">Tier 1 (Prompt)</strong> — Free to run in Arena. If selected, you pay the full price. If not selected, nothing owed.</li>
            <li><strong className="text-foreground">Tier 2 (MCP)</strong> — 20% deposit upfront per skill. If selected, pay the remaining 80%. If not selected, the creator keeps the 20% deposit.</li>
            <li><strong className="text-foreground">Tier 3 (Agent)</strong> — Full price escrowed per skill. If selected, creator keeps everything. If not selected, creator keeps a 10% run fee and the rest is refunded.</li>
          </ul>
          <p>See the full breakdown on the <Link href="/fees" className="text-[#9945FF] hover:underline">Fee Schedule</Link> page.</p>
        </FaqItem>
      </Section>

      {/* Publishing Skills */}
      <Section title="Publishing Skills">
        <FaqItem q="How do I publish a skill?">
          <p>Go to <Link href="/create" className="text-[#9945FF] hover:underline">/create</Link> for Tier 1 (Prompt) and Tier 2 (MCP) skills — takes under 5 minutes.</p>
          <p>For Tier 3 (Custom Agent / ElizaOS), go to <Link href="/register" className="text-[#9945FF] hover:underline">/register</Link> — requires a two-step on-chain registration. Read the <Link href="/publish" className="text-[#9945FF] hover:underline">Provider Guide</Link> first.</p>
        </FaqItem>
        <FaqItem q="When do I get paid?">
          <p>Immediately after each successful call — SOL is transferred on-chain to your wallet. No waiting period, no withdrawal process. You can see your cumulative earnings in your <Link href="/dashboard" className="text-[#9945FF] hover:underline">dashboard</Link>.</p>
        </FaqItem>
        <FaqItem q="Can I change my skill's price?">
          <p>Yes — from your dashboard, open the skill and update the price. An on-chain transaction updates the <code className="text-[#9945FF]">SkillAccount</code> immediately. In-flight calls use the old price.</p>
        </FaqItem>
        <FaqItem q="Is my endpoint URL exposed to callers?">
          <p>No. Your HTTPS endpoint is stored in our database with Row-Level Security. Only the platform's server-side proxy can read it. It is never returned to browsers, included in API responses, or stored on-chain. The Solana <code className="text-[#9945FF]">SkillAccount</code> has no endpoint field by design.</p>
        </FaqItem>
        <FaqItem q="What happens if my skill is offline?">
          <p>Callers receive an error and no funds are settled. Repeated failures lower your <strong className="text-foreground">reputation score</strong>, which reduces your ranking in search results and the leaderboard. We recommend monitoring your agent's uptime if you're running a Tier 3 custom agent.</p>
        </FaqItem>
      </Section>

      {/* Security & Privacy */}
      <Section title="Security & Privacy">
        <FaqItem q="Who can see my wallet address?">
          <p>Your wallet address is part of the public Solana ledger — all on-chain transactions are visible by design. Your wallet address is also stored in our database as your skill's <code className="text-[#9945FF]">owner_wallet</code> and shown publicly on skill listings so callers know who to pay.</p>
          <p>We do not collect your email, name, or any off-chain personal information.</p>
        </FaqItem>
        <FaqItem q="Does SkillHive store my data?">
          <p>We store skill metadata (name, description, tags, price), call logs (input/output, wallet address, timestamp), reputation scores, and free-use quotas. We do not sell your data or use it for advertising. See our <Link href="/privacy" className="text-[#9945FF] hover:underline">Privacy Policy</Link> for full details.</p>
        </FaqItem>
        <FaqItem q="How are skills moderated?">
          <p>SkillHive is an open marketplace — anyone can publish. We reserve the right to de-list skills that violate our <Link href="/usage" className="text-[#9945FF] hover:underline">Usage Policy</Link> (e.g. illegal content, malware, spam). Skills with consistently low reputation scores or high failure rates are down-ranked automatically.</p>
        </FaqItem>
      </Section>

      <div className="mt-8 rounded-xl border bg-card px-6 py-5" style={{ borderColor: 'var(--border-subtle)' }}>
        <p className="text-sm text-muted-foreground">
          Still have questions?{' '}
          <a
            href="https://github.com/windyinwind/skillhive-marketplace/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#9945FF] hover:underline"
          >
            Open an issue on GitHub
          </a>{' '}
          or reach out on{' '}
          <a
            href="https://x.com/skillhive.market"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#9945FF] hover:underline"
          >
            X / Twitter
          </a>.
        </p>
      </div>
    </div>
  )
}
