import Link from 'next/link'

const PLATFORM_FEE_PCT = 5

export default function FeesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="mb-10">
        <h1 className="font-heading text-3xl font-bold text-foreground">Fee Schedule</h1>
        <p className="mt-2 text-muted-foreground">
          All fees are charged in SOL and settled on-chain. Last updated: April 2026.
        </p>
      </div>

      {/* Platform fee */}
      <div className="mb-8 rounded-2xl border bg-card p-6" style={{ borderColor: 'var(--border-subtle)' }}>
        <h2 className="font-heading text-lg font-bold text-foreground">Platform fee</h2>
        <p className="mt-1 text-sm text-muted-foreground">Applied on every paid skill call.</p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground" style={{ borderColor: 'var(--border-subtle)' }}>
                <th className="pb-2 font-medium">Party</th>
                <th className="pb-2 font-medium">Amount</th>
                <th className="pb-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              <tr>
                <td className="py-3 text-muted-foreground">Skill creator</td>
                <td className="py-3 font-semibold text-[#14F195]">{100 - PLATFORM_FEE_PCT}% of price</td>
                <td className="py-3 text-muted-foreground">Transferred directly to creator wallet</td>
              </tr>
              <tr>
                <td className="py-3 text-muted-foreground">SkillHive platform</td>
                <td className="py-3 text-foreground">{PLATFORM_FEE_PCT}% of price</td>
                <td className="py-3 text-muted-foreground">Covers infrastructure, executor, and proxy costs</td>
              </tr>
              <tr>
                <td className="py-3 text-muted-foreground">Solana network</td>
                <td className="py-3 text-foreground">~0.000005 SOL</td>
                <td className="py-3 text-muted-foreground">Transaction fee, goes to validators — not SkillHive</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-5 rounded-lg bg-background px-4 py-3">
          <p className="text-xs text-muted-foreground">Example — skill priced at <strong className="text-foreground">0.001 SOL</strong>:</p>
          <div className="mt-2 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border-subtle)' }}>
              <p className="text-xs text-muted-foreground">Caller pays</p>
              <p className="mt-0.5 font-semibold text-foreground">0.001 SOL</p>
            </div>
            <div className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border-subtle)' }}>
              <p className="text-xs text-muted-foreground">Platform fee</p>
              <p className="mt-0.5 font-semibold text-muted-foreground">0.00005 SOL</p>
            </div>
            <div className="rounded-lg border border-[#14F195]/20 bg-[#14F195]/5 px-3 py-2">
              <p className="text-xs text-muted-foreground">Creator earns</p>
              <p className="mt-0.5 font-semibold text-[#14F195]">0.00095 SOL</p>
            </div>
          </div>
        </div>
      </div>

      {/* Registration */}
      <div className="mb-8 rounded-2xl border bg-card p-6" style={{ borderColor: 'var(--border-subtle)' }}>
        <h2 className="font-heading text-lg font-bold text-foreground">Skill registration</h2>
        <p className="mt-1 text-sm text-muted-foreground">One-time costs to publish a skill.</p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground" style={{ borderColor: 'var(--border-subtle)' }}>
                <th className="pb-2 font-medium">Cost</th>
                <th className="pb-2 font-medium">Amount</th>
                <th className="pb-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              <tr>
                <td className="py-3 text-muted-foreground">SkillHive registration fee</td>
                <td className="py-3 font-semibold text-[#14F195]">Free</td>
                <td className="py-3 text-muted-foreground">No SkillHive fee to publish</td>
              </tr>
              <tr>
                <td className="py-3 text-muted-foreground">Solana account rent</td>
                <td className="py-3 text-foreground">~0.00002 SOL</td>
                <td className="py-3 text-muted-foreground">Rent-exempt deposit for SkillAccount storage. Reclaimable if account is closed.</td>
              </tr>
              <tr>
                <td className="py-3 text-muted-foreground">Solana tx fee</td>
                <td className="py-3 text-foreground">~0.000005 SOL</td>
                <td className="py-3 text-muted-foreground">Standard Solana network fee</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview */}
      <div className="mb-8 rounded-2xl border bg-card p-6" style={{ borderColor: 'var(--border-subtle)' }}>
        <h2 className="font-heading text-lg font-bold text-foreground">Preview subsidy</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Each skill can be previewed for free. The platform subsidises the LLM cost for previews — creators are not charged and callers are not charged.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div className="rounded-lg border px-4 py-3" style={{ borderColor: 'var(--border-subtle)' }}>
            <p className="text-xs text-muted-foreground">Rate limit</p>
            <p className="mt-1 font-semibold text-foreground">3 per IP / day</p>
          </div>
          <div className="rounded-lg border px-4 py-3" style={{ borderColor: 'var(--border-subtle)' }}>
            <p className="text-xs text-muted-foreground">Result length</p>
            <p className="mt-1 font-semibold text-foreground">~200 chars (truncated)</p>
          </div>
          <div className="rounded-lg border px-4 py-3" style={{ borderColor: 'var(--border-subtle)' }}>
            <p className="text-xs text-muted-foreground">Cost to you</p>
            <p className="mt-1 font-semibold text-[#14F195]">Free</p>
          </div>
        </div>
      </div>

      {/* Arena */}
      <div className="mb-8 rounded-2xl border bg-card p-6" style={{ borderColor: 'var(--border-subtle)' }}>
        <h2 className="font-heading text-lg font-bold text-foreground">Arena round pricing</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Deposit rules ensure creators are always compensated for compute, regardless of whether they're selected.
        </p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground" style={{ borderColor: 'var(--border-subtle)' }}>
                <th className="pb-2 font-medium">Tier</th>
                <th className="pb-2 font-medium">Upfront deposit</th>
                <th className="pb-2 font-medium">If selected</th>
                <th className="pb-2 font-medium">If not selected</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              <tr>
                <td className="py-3 text-muted-foreground">Tier 1 — Prompt Skill</td>
                <td className="py-3 text-[#14F195] font-medium">Free</td>
                <td className="py-3 text-foreground">Full price_lamports</td>
                <td className="py-3 text-muted-foreground">Nothing owed</td>
              </tr>
              <tr>
                <td className="py-3 text-muted-foreground">Tier 2 — MCP Skill</td>
                <td className="py-3 text-foreground">20% of price</td>
                <td className="py-3 text-foreground">Remaining 80%</td>
                <td className="py-3 text-muted-foreground">Creator keeps 20% deposit</td>
              </tr>
              <tr>
                <td className="py-3 text-muted-foreground">Tier 3 — Custom Agent</td>
                <td className="py-3 text-foreground">100% escrowed</td>
                <td className="py-3 text-foreground">Creator keeps full price</td>
                <td className="py-3 text-muted-foreground">10% run fee kept, rest refunded</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Chat */}
      <div className="mb-8 rounded-2xl border bg-card p-6" style={{ borderColor: 'var(--border-subtle)' }}>
        <h2 className="font-heading text-lg font-bold text-foreground">SkillHive Chat</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="rounded-lg border px-4 py-3" style={{ borderColor: 'var(--border-subtle)' }}>
            <p className="text-xs text-muted-foreground">Free uses per wallet</p>
            <p className="mt-1 font-semibold text-foreground">3 (lifetime)</p>
          </div>
          <div className="rounded-lg border px-4 py-3" style={{ borderColor: 'var(--border-subtle)' }}>
            <p className="text-xs text-muted-foreground">After free quota</p>
            <p className="mt-1 font-semibold text-foreground">Pay skill owners directly</p>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          After free quota is exhausted, your wallet pays skill owners in a single on-chain transaction at the end of each response. The 5% platform fee applies to each skill call included in that transaction.
        </p>
      </div>

      <p className="text-xs text-muted-foreground">
        Fees may change. Material changes will be announced on our{' '}
        <a href="https://x.com/skillhive.market" target="_blank" rel="noopener noreferrer" className="text-[#9945FF] hover:underline">
          X / Twitter
        </a>{' '}
        and in the <Link href="/faq" className="text-[#9945FF] hover:underline">FAQ</Link> with at least 7 days notice.
      </p>
    </div>
  )
}
