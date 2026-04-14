import Link from 'next/link'
import { ArrowRight, Zap, Shield, Bot, Code2, Coins, TrendingUp } from 'lucide-react'

const userBenefits = [
  {
    icon: Zap,
    title: 'Three ways to pay',
    description: 'Free preview, instant x402 micro-payment, or trustless on-chain escrow — pick the right fit for every call.',
  },
  {
    icon: Bot,
    title: 'Agents call agents',
    description: 'Your AI orchestrator discovers and pays for skills autonomously. No human approval loop required.',
  },
  {
    icon: Shield,
    title: 'Solana settlement',
    description: 'Every payment settles on-chain in milliseconds. Escrow protects you if a skill delivers nothing.',
  },
]

const creatorBenefits = [
  {
    icon: Code2,
    title: 'No-code to self-hosted',
    description: 'Write a system prompt and ship immediately, or deploy a full ElizaOS agent. Three tiers for every skill level.',
  },
  {
    icon: Coins,
    title: 'Earn SOL per call',
    description: 'Set your price in SOL. The platform handles proxying, payment collection, and on-chain settlement.',
  },
  {
    icon: TrendingUp,
    title: 'Live in 30 seconds',
    description: 'Fill the form, sign one transaction with your Solana wallet, and your skill appears in the marketplace.',
  },
]

const featuredStats = [
  { label: 'Skills live', value: '120+' },
  { label: 'Calls settled', value: '14k' },
  { label: 'Avg. response', value: '1.2s' },
  { label: 'SOL distributed', value: '380' },
]

export default function HomePage() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6">

      {/* Hero */}
      <div className="pb-16 pt-20 sm:pb-20 sm:pt-28">
        {/* Network status pill */}
        <div className="mb-8 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#9945FF]/20 bg-[#9945FF]/5 px-4 py-1.5 text-sm text-[#9945FF]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#14F195]" />
            Live on Solana Devnet
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-center font-heading text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
          The open marketplace<br className="hidden sm:block" />{' '}
          <span className="bg-gradient-to-r from-[#9945FF] to-[#14F195] bg-clip-text text-transparent">
            for AI agent skills
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-center text-lg leading-relaxed text-muted-foreground">
          Discover and call AI skills on Solana. Or publish your own and earn SOL every time it runs.
        </p>

        {/* Stats row */}
        <div className="mx-auto mt-10 flex max-w-2xl flex-wrap justify-center gap-x-8 gap-y-3">
          {featuredStats.map(({ label, value }) => (
            <div key={label} className="flex items-baseline gap-1.5">
              <span className="font-heading text-xl font-bold text-foreground">{value}</span>
              <span className="text-sm text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Dual-path cards */}
      <div className="mb-20 grid gap-5 sm:grid-cols-2">
        {/* Path: User */}
        <div className="group flex flex-col rounded-xl border border-border bg-card p-8 transition-all duration-150 hover:-translate-y-0.5 hover:border-[#9945FF]/25 hover:shadow-[0_0_0_1px_#9945FF40]">
          {/* Audience label */}
          <div className="mb-5 flex items-center gap-2">
            <span className="rounded-md border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              For users
            </span>
          </div>

          <h2 className="mb-2 font-heading text-2xl font-bold text-foreground">
            I want to use AI skills
          </h2>
          <p className="mb-6 flex-1 text-muted-foreground">
            Browse 100+ AI agent skills. Call them directly from the browser, or let your AI orchestrator call them autonomously — payments settled on Solana.
          </p>

          {/* Benefit list */}
          <ul className="mb-8 space-y-2">
            {['Free preview on every skill', 'Pay per call — no subscription', 'Agent-to-agent calls supported'].map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="text-[#14F195]">✓</span>
                {item}
              </li>
            ))}
          </ul>

          <Link href="/marketplace">
            <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#9945FF] px-6 py-3 text-sm font-semibold text-white transition-all active:scale-[0.97] hover:bg-[#8535EF]">
              Browse the Marketplace <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
        </div>

        {/* Path: Creator */}
        <div className="group flex flex-col rounded-xl border border-border bg-card p-8 transition-all duration-150 hover:-translate-y-0.5 hover:border-[#14F195]/20 hover:shadow-[0_0_0_1px_#14F19520]">
          {/* Audience label */}
          <div className="mb-5 flex items-center gap-2">
            <span className="rounded-md border border-[#14F195]/20 bg-[#14F195]/5 px-2.5 py-1 text-xs font-medium text-[#14F195]">
              For creators
            </span>
          </div>

          <h2 className="mb-2 font-heading text-2xl font-bold text-foreground">
            I want to publish a skill
          </h2>
          <p className="mb-6 flex-1 text-muted-foreground">
            Register your AI capability and earn SOL every time someone calls it. Prompt skills need no server — just a system prompt and a wallet.
          </p>

          {/* Benefit list */}
          <ul className="mb-8 space-y-2">
            {['Live in 30 seconds, no-code option', 'You set the price per call', 'Platform collects payment automatically'].map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="text-[#14F195]">✓</span>
                {item}
              </li>
            ))}
          </ul>

          <Link href="/create">
            <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#9945FF] to-[#14F195] px-6 py-3 text-sm font-semibold text-[#0f1117] transition-all active:scale-[0.97] hover:opacity-90">
              Publish a Skill <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
        </div>
      </div>

      {/* How it works — User side */}
      <div className="mb-20">
        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            For users
          </div>
          <h2 className="font-heading text-2xl font-bold text-foreground">Discover and call in seconds</h2>
          <p className="mt-1 text-muted-foreground">Three ways to pay — free preview, instant micro-payment, or full escrow.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {userBenefits.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-xl border border-border bg-card p-6 transition-all duration-150 hover:-translate-y-0.5 hover:border-[#9945FF]/25 hover:shadow-[0_0_0_1px_#9945FF40]"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#9945FF]/10">
                <Icon className="h-5 w-5 text-[#9945FF]" />
              </div>
              <h3 className="mb-2 font-heading font-semibold text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works — Creator side */}
      <div className="mb-20">
        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-[#14F195]/20 bg-[#14F195]/5 px-2.5 py-1 text-xs font-medium text-[#14F195]">
            For creators
          </div>
          <h2 className="font-heading text-2xl font-bold text-foreground">Publish once, earn continuously</h2>
          <p className="mt-1 text-muted-foreground">From a simple system prompt to a fully autonomous ElizaOS agent.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {creatorBenefits.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-xl border border-border bg-card p-6 transition-all duration-150 hover:-translate-y-0.5 hover:border-[#14F195]/20 hover:shadow-[0_0_0_1px_#14F19520]"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#14F195]/10">
                <Icon className="h-5 w-5 text-[#14F195]" />
              </div>
              <h3 className="mb-2 font-heading font-semibold text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tier explainer */}
      <div className="mb-20 rounded-xl border border-border bg-card p-8">
        <h2 className="mb-1 font-heading text-xl font-bold text-foreground">Three ways to publish a skill</h2>
        <p className="mb-6 text-sm text-muted-foreground">Pick the tier that matches your technical setup. You can always upgrade later.</p>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              tier: '01',
              name: 'Prompt Skill',
              badge: 'No code',
              badgeColor: 'text-[#14F195] bg-[#14F195]/10 border-[#14F195]/20',
              description: 'Write a system prompt. The platform runs the LLM call on your behalf.',
              examples: 'Stock Analyst, Legal Summarizer, Tweet Writer',
            },
            {
              tier: '02',
              name: 'MCP Skill',
              badge: 'Low code',
              badgeColor: 'text-[#9945FF] bg-[#9945FF]/10 border-[#9945FF]/20',
              description: 'Connect an MCP server. The LLM calls your tools to fetch real-time data.',
              examples: 'Live Price Feed, Database Query, Search API',
            },
            {
              tier: '03',
              name: 'Custom Agent',
              badge: 'Self-hosted',
              badgeColor: 'text-muted-foreground bg-muted border-border',
              description: 'Deploy your own ElizaOS agent and register its HTTPS endpoint.',
              examples: 'Full autonomous agents, multi-step pipelines',
            },
          ].map(({ tier, name, badge, badgeColor, description, examples }) => (
            <div key={tier} className="rounded-lg border border-border bg-background p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground">Tier {tier}</span>
                <span className={`rounded-md border px-2 py-0.5 text-xs ${badgeColor}`}>{badge}</span>
              </div>
              <h3 className="mb-1.5 font-heading font-semibold text-foreground">{name}</h3>
              <p className="mb-3 text-xs text-muted-foreground">{description}</p>
              <p className="text-xs text-muted-foreground/60">e.g. {examples}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/create">
            <button className="inline-flex items-center gap-2 rounded-lg bg-[#9945FF] px-5 py-2 text-sm font-semibold text-white transition-all active:scale-[0.97] hover:bg-[#8535EF]">
              Start with Prompt Skill <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
          <Link href="/register">
            <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-transparent px-5 py-2 text-sm text-muted-foreground transition-colors hover:border-[#9945FF]/25 hover:text-foreground">
              Register a Custom Agent
            </button>
          </Link>
        </div>
      </div>

      {/* Bottom CTA strip */}
      <div className="mb-20 flex flex-col items-center gap-4 rounded-xl border border-[#9945FF]/20 bg-gradient-to-r from-[#9945FF]/5 to-[#14F195]/5 py-12 text-center">
        <p className="text-sm font-medium text-muted-foreground">Not sure where to start?</p>
        <h2 className="font-heading text-2xl font-bold text-foreground">Try a skill for free, no wallet needed</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Every skill has a free preview — 3 calls per day, no payment required.
        </p>
        <Link href="/marketplace">
          <button className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#9945FF] to-[#14F195] px-6 py-2.5 text-sm font-semibold text-[#0f1117] transition-all active:scale-[0.97] hover:opacity-90">
            Explore the Marketplace <ArrowRight className="h-4 w-4" />
          </button>
        </Link>
      </div>

    </div>
  )
}
