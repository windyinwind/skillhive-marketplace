import Link from 'next/link'
import { useTranslations } from 'next-intl'

export default function TermsPage() {
  const t = useTranslations('terms')
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

        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-300">
          <strong>{t('devnetNotice')}</strong> {t('devnetBody')}
        </div>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">{t('s1Title')}</h2>
          <p>
            {t('s1Body')}{' '}
            <Link href="/usage" className="text-[#9945FF] hover:underline">{t('s1UsageLink')}</Link>.{' '}
            {t('s1Body2')}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">{t('s2Title')}</h2>
          <p>{t('s2Intro')}</p>
          <ul className="space-y-1.5 mt-2">
            <li><strong className="text-foreground">{t('s2Item1Label')}</strong> {t('s2Item1')}</li>
            <li><strong className="text-foreground">{t('s2Item2Label')}</strong> {t('s2Item2')}</li>
            <li><strong className="text-foreground">{t('s2Item3Label')}</strong> {t('s2Item3')}</li>
          </ul>
          <p className="mt-3">{t('s2Footer')}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">{t('s3Title')}</h2>
          <ul className="space-y-2">
            <li>{t('s3Item1')}</li>
            <li>{t('s3Item2')}</li>
            <li>{t('s3Item3')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">{t('s4Title')}</h2>
          <ul className="space-y-2">
            <li>{t('s4Item1')}</li>
            <li>
              {t('s4Item2Pre')}{' '}
              <Link href="/fees" className="text-[#9945FF] hover:underline">{t('s4Item2Link')}</Link>.
            </li>
            <li>{t('s4Item3')}</li>
            <li>{t('s4Item4')}</li>
            <li>{t('s4Item5')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">{t('s5Title')}</h2>
          <p>{t('s5Intro')}</p>
          <ul className="space-y-2 mt-2">
            <li>{t('s5Item1')}</li>
            <li>{t('s5Item2')}</li>
            <li>{t('s5Item3')}</li>
            <li>{t('s5Item4')}</li>
          </ul>
          <p className="mt-3">{t('s5Footer')}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">{t('s6Title')}</h2>
          <p>{t('s6Body')}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">{t('s7Title')}</h2>
          <ul className="space-y-2">
            <li><strong className="text-foreground">{t('s7Item1Label')}</strong> {t('s7Item1')}</li>
            <li><strong className="text-foreground">{t('s7Item2Label')}</strong> {t('s7Item2')}</li>
            <li><strong className="text-foreground">{t('s7Item3Label')}</strong> {t('s7Item3')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">{t('s8Title')}</h2>
          <p>{t('s8Body')}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">{t('s9Title')}</h2>
          <p>{t('s9Body')}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">{t('s10Title')}</h2>
          <p>{t('s10Body')}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">{t('s11Title')}</h2>
          <p>
            {t('s11Body')}{' '}
            <a href="https://x.com/swarm_market" target="_blank" rel="noopener noreferrer" className="text-[#9945FF] hover:underline">
              {t('s11Twitter')}
            </a>{' '}
            {t('s11Body2')}
          </p>
        </section>

        <div className="pt-4 border-t border-border flex flex-wrap gap-4 text-xs">
          <Link href="/privacy" className="text-[#9945FF] hover:underline">{t('privacyLink')}</Link>
          <Link href="/usage" className="text-[#9945FF] hover:underline">{t('usageLink')}</Link>
          <Link href="/cookies" className="text-[#9945FF] hover:underline">{t('cookiesLink')}</Link>
          <Link href="/fees" className="text-[#9945FF] hover:underline">{t('feesLink')}</Link>
        </div>
      </div>
    </div>
  )
}
