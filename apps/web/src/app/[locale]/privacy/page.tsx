import Link from 'next/link'
import { useTranslations } from 'next-intl'

export default function PrivacyPage() {
  const t = useTranslations('privacy')
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
          <p>{t('s1Body')}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">{t('s2Title')}</h2>

          <h3 className="font-semibold text-foreground mb-2 mt-4">{t('s2aTitle')}</h3>
          <ul className="space-y-2">
            <li><strong className="text-foreground">{t('s2aItem1Label')}</strong> {t('s2aItem1')}</li>
            <li><strong className="text-foreground">{t('s2aItem2Label')}</strong> {t('s2aItem2')}</li>
            <li><strong className="text-foreground">{t('s2aItem3Label')}</strong> {t('s2aItem3')}</li>
            <li><strong className="text-foreground">{t('s2aItem4Label')}</strong> {t('s2aItem4')}</li>
            <li><strong className="text-foreground">{t('s2aItem5Label')}</strong> {t('s2aItem5')}</li>
          </ul>

          <h3 className="font-semibold text-foreground mb-2 mt-4">{t('s2bTitle')}</h3>
          <ul className="space-y-2">
            <li><strong className="text-foreground">{t('s2bItem1Label')}</strong> {t('s2bItem1')}</li>
            <li><strong className="text-foreground">{t('s2bItem2Label')}</strong> {t('s2bItem2')}</li>
          </ul>

          <h3 className="font-semibold text-foreground mb-2 mt-4">{t('s2cTitle')}</h3>
          <ul className="space-y-2">
            <li>{t('s2cItem1')}</li>
            <li>{t('s2cItem2')}</li>
            <li>{t('s2cItem3')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">{t('s3Title')}</h2>
          <ul className="space-y-2">
            <li>{t('s3Item1')}</li>
            <li>{t('s3Item2')}</li>
            <li>{t('s3Item3')}</li>
            <li>{t('s3Item4')}</li>
            <li>{t('s3Item5')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">{t('s4Title')}</h2>
          <ul className="space-y-2">
            <li><strong className="text-foreground">{t('s4Item1Label')}</strong> {t('s4Item1')}</li>
            <li><strong className="text-foreground">{t('s4Item2Label')}</strong> {t('s4Item2')}</li>
            <li><strong className="text-foreground">{t('s4Item3Label')}</strong> {t('s4Item3')}</li>
            <li><strong className="text-foreground">{t('s4Item4Label')}</strong> {t('s4Item4')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">{t('s5Title')}</h2>
          <ul className="space-y-2">
            <li><strong className="text-foreground">{t('s5Item1Label')}</strong> {t('s5Item1')}</li>
            <li><strong className="text-foreground">{t('s5Item2Label')}</strong> {t('s5Item2')}</li>
            <li><strong className="text-foreground">{t('s5Item3Label')}</strong> {t('s5Item3')}</li>
            <li><strong className="text-foreground">{t('s5Item4Label')}</strong> {t('s5Item4')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">{t('s6Title')}</h2>
          <p>
            {t('s6Body')}{' '}
            <Link href="/cookies" className="text-[#9945FF] hover:underline">{t('s6Link')}</Link>{' '}
            {t('s6Body2')}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">{t('s7Title')}</h2>
          <p>{t('s7Body1')}</p>
          <ul className="space-y-2 mt-2">
            <li>{t('s7Item1')}</li>
            <li>{t('s7Item2')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">{t('s8Title')}</h2>
          <p>{t('s8Body')}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">{t('s9Title')}</h2>
          <p>
            {t('s9Body')}{' '}
            <a href="https://x.com/skillhive.market" target="_blank" rel="noopener noreferrer" className="text-[#9945FF] hover:underline">
              {t('s9Twitter')}
            </a>{' '}
            {t('s9Body2')}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">{t('s10Title')}</h2>
          <p>
            {t('s10Body')}{' '}
            <a href="https://github.com/windyinwind/skillhive-marketplace/issues" target="_blank" rel="noopener noreferrer" className="text-[#9945FF] hover:underline">
              {t('s10GitHub')}
            </a>{' '}
            {t('s10Mid')}{' '}
            <a href="https://x.com/skillhive.market" target="_blank" rel="noopener noreferrer" className="text-[#9945FF] hover:underline">
              {t('s10Twitter')}
            </a>.
          </p>
        </section>

        <div className="pt-4 border-t border-border flex flex-wrap gap-4 text-xs">
          <Link href="/terms" className="text-[#9945FF] hover:underline">{t('termsLink')}</Link>
          <Link href="/cookies" className="text-[#9945FF] hover:underline">{t('cookiesLink')}</Link>
          <Link href="/usage" className="text-[#9945FF] hover:underline">{t('usageLink')}</Link>
        </div>
      </div>
    </div>
  )
}
