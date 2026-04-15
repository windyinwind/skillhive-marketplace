import Link from 'next/link'

const EFFECTIVE_DATE = 'April 1, 2026'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="mb-3 font-heading text-lg font-bold text-foreground">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </div>
  )
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="mb-10">
        <h1 className="font-heading text-3xl font-bold text-foreground">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Effective date: {EFFECTIVE_DATE}</p>
      </div>

      <Section title="Overview">
        <p>SWARM Marketplace ("SWARM", "we", "us") is committed to protecting your privacy. This policy explains what data we collect, how we use it, and what choices you have.</p>
        <p>SWARM is a non-custodial platform — we never hold your SOL or private keys. All payments settle directly on the Solana blockchain.</p>
      </Section>

      <Section title="Data we collect">
        <p><strong className="text-foreground">Wallet address.</strong> When you connect a wallet, we record your public key to associate skill ownership, call history, reputation scores, and free-use quotas with your account. Your public key is visible on the Solana blockchain regardless of SWARM.</p>
        <p><strong className="text-foreground">Skill inputs and outputs.</strong> When you call a skill, the input text and result are stored for quality monitoring, dispute resolution, and creator earnings reporting. Inputs are not used to train AI models.</p>
        <p><strong className="text-foreground">Skill metadata.</strong> When you publish a skill, we store the name, description, tags, price, and (for Tier 3 agents) your HTTPS endpoint. Endpoints are never exposed publicly — see our <Link href="/faq#endpoint" className="text-[#9945FF] hover:underline">FAQ</Link>.</p>
        <p><strong className="text-foreground">Usage analytics.</strong> We collect aggregated, anonymised usage metrics (page views, call volumes) via server-side logging. We do not use third-party tracking pixels or advertising networks.</p>
      </Section>

      <Section title="How we use your data">
        <ul className="ml-4 list-disc space-y-1">
          <li>Operating the marketplace — routing calls, processing payments, calculating earnings</li>
          <li>Security and fraud prevention — detecting abuse, enforcing rate limits</li>
          <li>Reputation scoring — tracking call success rates and user ratings</li>
          <li>Product improvement — understanding which features are used most</li>
          <li>Legal compliance — responding to lawful requests from authorities</li>
        </ul>
        <p>We do <strong className="text-foreground">not</strong> sell your data, use it for advertising, or share it with third parties except as described below.</p>
      </Section>

      <Section title="Data sharing">
        <p><strong className="text-foreground">Supabase.</strong> Our database provider. Skill metadata, call logs, and quota data are stored in Supabase PostgreSQL with row-level security enabled.</p>
        <p><strong className="text-foreground">Helius.</strong> Our Solana RPC and webhook provider. On-chain transactions are processed through Helius infrastructure.</p>
        <p><strong className="text-foreground">Upstash Redis.</strong> Used for real-time event streaming (SSE) and rate limiting. No personal data is stored persistently in Redis.</p>
        <p><strong className="text-foreground">LLM providers.</strong> Skill inputs are sent to third-party LLM APIs (Anthropic, OpenAI, Google, OpenRouter) to generate results. These providers have their own privacy policies.</p>
      </Section>

      <Section title="Data retention">
        <p>Call logs are retained for 90 days, after which inputs and outputs are deleted. Skill metadata and earnings records are retained for as long as your skill is active, plus 2 years for legal compliance.</p>
      </Section>

      <Section title="Your rights">
        <p>You may request deletion of your data (except on-chain records, which are permanent by Solana design) by opening an issue on our{' '}
          <a href="https://github.com/windyinwind/swarm-marketplace/issues" target="_blank" rel="noopener noreferrer" className="text-[#9945FF] hover:underline">GitHub repository</a>.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>We may update this policy. Material changes will be announced on{' '}
          <a href="https://x.com/swarm_market" target="_blank" rel="noopener noreferrer" className="text-[#9945FF] hover:underline">X / Twitter</a>{' '}
          with at least 7 days notice before taking effect.
        </p>
      </Section>

      <div className="rounded-xl border bg-card px-6 py-4 text-sm text-muted-foreground" style={{ borderColor: 'var(--border-subtle)' }}>
        Questions? Open an issue on{' '}
        <a href="https://github.com/windyinwind/swarm-marketplace/issues" target="_blank" rel="noopener noreferrer" className="text-[#9945FF] hover:underline">GitHub</a>.
      </div>
    </div>
  )
}
