import Link from 'next/link'
import { useTranslations } from 'next-intl'

export default function CookiePolicyPage() {
  const t = useTranslations('cookies')

  const cookieTypes = [
    {
      nameKey: 'cat1Name' as const,
      requiredKey: 'cat1Required' as const,
      required: true,
      cookies: [
        { nameKey: 'cookie1Name' as const, purposeKey: 'cookie1Purpose' as const, durationKey: 'cookie1Duration' as const },
        { nameKey: 'cookie2Name' as const, purposeKey: 'cookie2Purpose' as const, durationKey: 'cookie2Duration' as const },
        { nameKey: 'cookie3Name' as const, purposeKey: 'cookie3Purpose' as const, durationKey: 'cookie3Duration' as const },
      ],
    },
    {
      nameKey: 'cat2Name' as const,
      requiredKey: 'cat2Required' as const,
      required: false,
      cookies: [
        { nameKey: 'cookie4Name' as const, purposeKey: 'cookie4Purpose' as const, durationKey: 'cookie4Duration' as const },
      ],
    },
  ]

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      {/* Header */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#9945FF]/30 bg-[#9945FF]/10 px-3 py-1 text-xs font-medium text-[#9945FF] mb-4">
          {t('badge')}
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('effectiveDate')}</p>
      </div>

      <div className="space-y-8 text-sm text-muted-foreground leading-relaxed">

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">{t('s1Title')}</h2>
          <p>
            {t('s1Body').split('localStorage')[0]}
            <code className="text-xs bg-muted px-1 rounded">localStorage</code>
            {t('s1Body').split('localStorage')[1]}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">{t('s2Title')}</h2>
          <p className="mb-4">
            {t('s2Intro').split('very few')[0]}
            <strong className="text-foreground">very few</strong>
            {t('s2Intro').split('very few')[1]}
          </p>

          {cookieTypes.map((type) => (
            <div key={type.nameKey} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-semibold text-foreground">{t(type.nameKey)}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${
                  type.required
                    ? 'bg-[#9945FF]/10 text-[#9945FF] border-[#9945FF]/30'
                    : 'bg-secondary text-muted-foreground border-border'
                }`}>
                  {t(type.requiredKey)}
                </span>
              </div>
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted">
                      <th className="text-left px-3 py-2 font-semibold text-foreground">{t('colName')}</th>
                      <th className="text-left px-3 py-2 font-semibold text-foreground">{t('colPurpose')}</th>
                      <th className="text-left px-3 py-2 font-semibold text-foreground hidden sm:table-cell">{t('colDuration')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {type.cookies.map((c) => (
                      <tr key={c.nameKey}>
                        <td className="px-3 py-2 font-mono text-foreground align-top">{t(c.nameKey)}</td>
                        <td className="px-3 py-2 text-muted-foreground align-top">{t(c.purposeKey)}</td>
                        <td className="px-3 py-2 text-muted-foreground align-top hidden sm:table-cell">{t(c.durationKey)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">{t('s3Title')}</h2>
          <ul className="space-y-1.5">
            <li className="flex gap-2"><span className="text-[#14F195]">✓</span> {t('s3Item1')}</li>
            <li className="flex gap-2"><span className="text-[#14F195]">✓</span> {t('s3Item2')}</li>
            <li className="flex gap-2"><span className="text-[#14F195]">✓</span> {t('s3Item3')}</li>
            <li className="flex gap-2"><span className="text-[#14F195]">✓</span> {t('s3Item4')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">{t('s4Title')}</h2>
          <p className="mb-3">{t('s4Intro')}</p>
          <ul className="space-y-1.5">
            <li><strong className="text-foreground">Chrome:</strong> {t('s4Chrome')}</li>
            <li><strong className="text-foreground">Firefox:</strong> {t('s4Firefox')}</li>
            <li><strong className="text-foreground">Safari:</strong> {t('s4Safari')}</li>
          </ul>
          <p className="mt-3">{t('s4Footer')}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">{t('s5Title')}</h2>
          <p>
            {t('s5Body')}{' '}
            <a href="https://x.com/swarm_market" target="_blank" rel="noopener noreferrer" className="text-[#9945FF] hover:underline">
              {t('s5Twitter')}
            </a>.
          </p>
        </section>

        <div className="pt-4 border-t border-border flex flex-wrap gap-4 text-xs">
          <Link href="/privacy" className="text-[#9945FF] hover:underline">{t('privacyLink')}</Link>
          <Link href="/terms" className="text-[#9945FF] hover:underline">{t('termsLink')}</Link>
          <Link href="/usage" className="text-[#9945FF] hover:underline">{t('usageLink')}</Link>
        </div>
      </div>
    </div>
  )
}
