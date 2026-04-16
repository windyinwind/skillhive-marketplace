import Link from 'next/link'
import { ArrowRight, Sparkles, Wrench, Bot, Zap, Trophy, Shield } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function PublishPage() {
  const t = useTranslations('publish')

  const tiers = [
    {
      id: 1,
      icon: <Sparkles className="w-5 h-5" />,
      name: t('tier1Name'),
      tag: t('tier1Tag'),
      color: 'border-[#9945FF]/30 bg-[#9945FF]/5',
      iconColor: 'text-[#9945FF]',
      description: t('tier1Desc'),
      steps: [t('tier1Step1'), t('tier1Step2'), t('tier1Step3'), t('tier1Step4')],
      bestFor: t('tier1BestFor'),
    },
    {
      id: 2,
      icon: <Wrench className="w-5 h-5" />,
      name: t('tier2Name'),
      tag: t('tier2Tag'),
      color: 'border-blue-500/30 bg-blue-500/5',
      iconColor: 'text-blue-500',
      description: t('tier2Desc'),
      steps: [t('tier2Step1'), t('tier2Step2'), t('tier2Step3'), t('tier2Step4')],
      bestFor: t('tier2BestFor'),
    },
    {
      id: 3,
      icon: <Bot className="w-5 h-5" />,
      name: t('tier3Name'),
      tag: t('tier3Tag'),
      color: 'border-[#14F195]/30 bg-[#14F195]/5',
      iconColor: 'text-[#14F195]',
      description: t('tier3Desc'),
      steps: [t('tier3Step1'), t('tier3Step2'), t('tier3Step3'), t('tier3Step4'), t('tier3Step5'), t('tier3Step6')],
      bestFor: t('tier3BestFor'),
      sdkLink: true,
    },
  ]

  const earningTips = [
    { icon: <Trophy className="w-4 h-4" />, title: t('earn1Title'), body: t('earn1Body') },
    { icon: <Zap className="w-4 h-4" />, title: t('earn2Title'), body: t('earn2Body') },
    { icon: <Shield className="w-4 h-4" />, title: t('earn3Title'), body: t('earn3Body') },
  ]

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      {/* Header */}
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#9945FF]/30 bg-[#9945FF]/10 px-3 py-1 text-xs font-medium text-[#9945FF] mb-4">
          {t('badge')}
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-4">{t('title')}</h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          {t('subtitle')}
        </p>
      </div>

      {/* How payment works */}
      <div className="rounded-xl border border-border bg-card p-6 mb-12">
        <h2 className="font-semibold text-foreground mb-3">{t('paymentTitle')}</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2"><span className="text-[#14F195] font-bold">→</span> {t('payBullet1')}</li>
          <li className="flex gap-2"><span className="text-[#14F195] font-bold">→</span> {t('payBullet2')}</li>
          <li className="flex gap-2"><span className="text-[#14F195] font-bold">→</span> {t('payBullet3')}</li>
          <li className="flex gap-2"><span className="text-[#14F195] font-bold">→</span> {t('payBullet4')}</li>
        </ul>
      </div>

      {/* Tiers */}
      <div className="mb-12">
        <h2 className="text-xl font-bold text-foreground mb-6">{t('tiersTitle')}</h2>
        <div className="space-y-6">
          {tiers.map((tier) => (
            <div key={tier.id} className={`rounded-xl border p-6 ${tier.color}`}>
              <div className="flex items-start gap-4">
                <div className={`mt-0.5 ${tier.iconColor}`}>{tier.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <h3 className="font-semibold text-foreground">{tier.name}</h3>
                    <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{tier.tag}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{tier.description}</p>
                  <ol className="space-y-1.5 mb-4">
                    {tier.steps.map((step, i) => (
                      <li key={i} className="flex gap-2.5 text-sm text-muted-foreground">
                        <span className="text-xs font-bold text-foreground/50 mt-0.5 shrink-0">{i + 1}.</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{t('bestForLabel')}</span> {tier.bestFor}
                  </p>
                  {tier.sdkLink && (
                    <Link href="/agent-sdk" className="mt-3 inline-flex items-center gap-1 text-xs text-[#14F195] hover:underline">
                      {t('tier3SdkLink')}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Earning tips */}
      <div className="mb-12">
        <h2 className="text-xl font-bold text-foreground mb-6">{t('earningsTitle')}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {earningTips.map((tip) => (
            <div key={tip.title} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-[#9945FF] mb-2">
                {tip.icon}
                <span className="text-sm font-semibold text-foreground">{tip.title}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{tip.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Skill quality */}
      <div className="rounded-xl border border-border bg-card p-6 mb-12">
        <h2 className="font-semibold text-foreground mb-3">{t('qualityTitle')}</h2>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p><span className="font-medium text-foreground">{t('qual1Label')}</span> {t('qual1Body')}</p>
          <p><span className="font-medium text-foreground">{t('qual2Label')}</span> {t('qual2Body')}</p>
          <p><span className="font-medium text-foreground">{t('qual3Label')}</span> {t('qual3Body')}</p>
          <p><span className="font-medium text-foreground">{t('qual4Label')}</span> {t('qual4Body')}</p>
        </div>
      </div>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/create"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#9945FF] hover:bg-[#8a3ee8] text-white font-semibold px-6 py-3 transition-colors"
        >
          {t('ctaPrompt')} <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/register"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card hover:border-[#9945FF]/40 text-foreground font-semibold px-6 py-3 transition-colors"
        >
          {t('ctaAgent')} <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
