import Link from 'next/link'
import { useTranslations } from 'next-intl'

export default function UsagePolicyPage() {
  const t = useTranslations('usage')
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

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-8 text-muted-foreground">

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">{t('s1Title')}</h2>
          <p>{t('s1Body')}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">{t('s2Title')}</h2>
          <ul className="space-y-2">
            <li>{t('s2Item1')}</li>
            <li>{t('s2Item2')}</li>
            <li>{t('s2Item3')}</li>
            <li>{t('s2Item4')}</li>
            <li>{t('s2Item5')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">{t('s3Title')}</h2>
          <p className="mb-3">{t('s3Intro')}</p>
          <ul className="space-y-2">
            <li><strong className="text-foreground">{t('s3Item1Label')}</strong> {t('s3Item1')}</li>
            <li><strong className="text-foreground">{t('s3Item2Label')}</strong> {t('s3Item2')}</li>
            <li><strong className="text-foreground">{t('s3Item3Label')}</strong> {t('s3Item3')}</li>
            <li><strong className="text-foreground">{t('s3Item4Label')}</strong> {t('s3Item4')}</li>
            <li><strong className="text-foreground">{t('s3Item5Label')}</strong> {t('s3Item5')}</li>
            <li><strong className="text-foreground">{t('s3Item6Label')}</strong> {t('s3Item6')}</li>
            <li><strong className="text-foreground">{t('s3Item7Label')}</strong> {t('s3Item7')}</li>
            <li><strong className="text-foreground">{t('s3Item8Label')}</strong> {t('s3Item8')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">{t('s4Title')}</h2>
          <ul className="space-y-2">
            <li><strong className="text-foreground">{t('s4Item1Label')}</strong> {t('s4Item1')}</li>
            <li><strong className="text-foreground">{t('s4Item2Label')}</strong> {t('s4Item2')}</li>
            <li><strong className="text-foreground">{t('s4Item3Label')}</strong> {t('s4Item3')}</li>
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
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">{t('s6Title')}</h2>
          <p>{t('s6Body')}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">{t('s7Title')}</h2>
          <p>{t('s7Body1')}</p>
          <p className="mt-2">
            {t('s7Body2')}{' '}
            <a href="https://github.com/windyinwind/skillhive-marketplace/issues" target="_blank" rel="noopener noreferrer" className="text-[#9945FF] hover:underline">{t('s7GitHub')}</a>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">{t('s8Title')}</h2>
          <p>
            {t('s8Body')}{' '}
            <a href="https://x.com/skillhive.market" target="_blank" rel="noopener noreferrer" className="text-[#9945FF] hover:underline">{t('s8Twitter')}</a>{' '}
            {t('s8Body2')}
          </p>
        </section>

        <div className="pt-4 border-t border-border flex flex-wrap gap-4 text-xs">
          <Link href="/terms" className="text-[#9945FF] hover:underline">{t('termsLink')}</Link>
          <Link href="/privacy" className="text-[#9945FF] hover:underline">{t('privacyLink')}</Link>
          <Link href="/faq" className="text-[#9945FF] hover:underline">{t('faqLink')}</Link>
        </div>
      </div>
    </div>
  )
}
