import Link from 'next/link'

const EFFECTIVE_DATE = 'April 1, 2026'

export default function CookiesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="mb-10">
        <h1 className="font-heading text-3xl font-bold text-foreground">Cookie Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Effective date: {EFFECTIVE_DATE}</p>
      </div>

      <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
        <div>
          <h2 className="mb-3 font-heading text-lg font-bold text-foreground">What we use</h2>
          <p>SkillHive uses a minimal set of browser storage — only what is necessary to operate the platform. We do not use advertising cookies or third-party tracking.</p>
        </div>

        <div className="overflow-x-auto rounded-xl border bg-card" style={{ borderColor: 'var(--border-subtle)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground" style={{ borderColor: 'var(--border-subtle)' }}>
                <th className="px-5 py-3 font-medium">Storage key</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Purpose</th>
                <th className="px-5 py-3 font-medium">Expires</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              <tr>
                <td className="px-5 py-3 font-mono text-xs text-foreground">theme</td>
                <td className="px-5 py-3">localStorage</td>
                <td className="px-5 py-3">Stores your light/dark/system theme preference</td>
                <td className="px-5 py-3">Persistent</td>
              </tr>
              <tr>
                <td className="px-5 py-3 font-mono text-xs text-foreground">walletName</td>
                <td className="px-5 py-3">localStorage</td>
                <td className="px-5 py-3">Remembers which wallet adapter you last connected</td>
                <td className="px-5 py-3">Persistent</td>
              </tr>
              <tr>
                <td className="px-5 py-3 font-mono text-xs text-foreground">i18n locale</td>
                <td className="px-5 py-3">Cookie</td>
                <td className="px-5 py-3">Stores your language preference for next-intl</td>
                <td className="px-5 py-3">1 year</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div>
          <h2 className="mb-3 font-heading text-lg font-bold text-foreground">What we don't use</h2>
          <ul className="ml-4 list-disc space-y-1">
            <li>No advertising or retargeting cookies</li>
            <li>No third-party analytics pixels (Google Analytics, Meta Pixel, etc.)</li>
            <li>No cross-site tracking</li>
            <li>No fingerprinting</li>
          </ul>
        </div>

        <div>
          <h2 className="mb-3 font-heading text-lg font-bold text-foreground">Clearing your data</h2>
          <p>You can clear localStorage and cookies at any time through your browser settings. Doing so will reset your theme preference and wallet connection — you will not lose any on-chain assets or skill data.</p>
        </div>
      </div>

      <div className="mt-10 rounded-xl border bg-card px-6 py-4 text-sm text-muted-foreground" style={{ borderColor: 'var(--border-subtle)' }}>
        See also: <Link href="/privacy" className="text-[#9945FF] hover:underline">Privacy Policy</Link> · <Link href="/terms" className="text-[#9945FF] hover:underline">Terms of Service</Link>
      </div>
    </div>
  )
}
