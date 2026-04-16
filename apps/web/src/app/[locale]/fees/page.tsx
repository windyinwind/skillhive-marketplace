import Link from 'next/link'
import { useTranslations } from 'next-intl'

export default function FeesPage() {
  const t = useTranslations('fees')

  const feeRows = [
    { actionKey: 'row1Action', feeKey: 'row1Fee', payerKey: 'row1Payer', notesKey: 'row1Notes' },
    { actionKey: 'row2Action', feeKey: 'row2Fee', payerKey: 'row2Payer', notesKey: 'row2Notes' },
    { actionKey: 'row3Action', feeKey: 'row3Fee', payerKey: 'row3Payer', notesKey: 'row3Notes' },
    { actionKey: 'row4Action', feeKey: 'row4Fee', payerKey: 'row4Payer', notesKey: 'row4Notes' },
    { actionKey: 'row5Action', feeKey: 'row5Fee', payerKey: 'row5Payer', notesKey: 'row5Notes' },
    { actionKey: 'row6Action', feeKey: 'row6Fee', payerKey: 'row6Payer', notesKey: 'row6Notes' },
    { actionKey: 'row7Action', feeKey: 'row7Fee', payerKey: 'row7Payer', notesKey: 'row7Notes' },
  ] as const

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      {/* Header */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#9945FF]/30 bg-[#9945FF]/10 px-3 py-1 text-xs font-medium text-[#9945FF] mb-4">
          {t('badge')}
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-4">{t('title')}</h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          {t('subtitle')}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3 mb-10">
        <div className="rounded-xl border border-[#9945FF]/30 bg-[#9945FF]/5 p-5">
          <p className="text-2xl font-bold text-[#9945FF] mb-1">{t('card1Value')}</p>
          <p className="text-sm font-medium text-foreground">{t('card1Label')}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('card1Note')}</p>
        </div>
        <div className="rounded-xl border border-[#14F195]/30 bg-[#14F195]/5 p-5">
          <p className="text-2xl font-bold text-[#14F195] mb-1">{t('card2Value')}</p>
          <p className="text-sm font-medium text-foreground">{t('card2Label')}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('card2Note')}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-2xl font-bold text-foreground mb-1">{t('card3Value')}</p>
          <p className="text-sm font-medium text-foreground">{t('card3Label')}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('card3Note')}</p>
        </div>
      </div>

      {/* Fee table */}
      <div className="rounded-xl border border-border overflow-hidden mb-10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted">
              <th className="text-left px-4 py-3 font-semibold text-foreground">{t('colAction')}</th>
              <th className="text-left px-4 py-3 font-semibold text-foreground">{t('colFee')}</th>
              <th className="text-left px-4 py-3 font-semibold text-foreground hidden sm:table-cell">{t('colPaidBy')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {feeRows.map((row) => (
              <tr key={row.actionKey} className="hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3 text-foreground font-medium align-top">
                  {t(row.actionKey)}
                  <p className="font-normal text-xs text-muted-foreground mt-0.5 leading-relaxed">{t(row.notesKey)}</p>
                </td>
                <td className="px-4 py-3 align-top">
                  <span className={`font-semibold ${t(row.feeKey) === t('row3Fee') || t(row.feeKey) === 'None' || t(row.feeKey) === '无' ? 'text-[#14F195]' : 'text-foreground'}`}>
                    {t(row.feeKey)}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground align-top hidden sm:table-cell">{t(row.payerKey)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* How platform fee works */}
      <div className="rounded-xl border border-border bg-card p-6 mb-10">
        <h2 className="font-semibold text-foreground mb-3">{t('howItWorksTitle')}</h2>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>{t('howItWorksIntro')}</p>
          <div className="rounded-lg bg-muted border border-border p-3 font-mono text-xs space-y-1">
            <div>Caller pays:       0.010000 SOL</div>
            <div>Platform fee (5%): 0.000500 SOL → SkillHive treasury</div>
            <div>Skill owner gets:  0.009500 SOL → owner wallet</div>
          </div>
          <p>
            {t('howItWorksNote')}
          </p>
        </div>
      </div>

      {/* Future */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold text-foreground mb-3">{t('roadmapTitle')}</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2"><span className="text-[#9945FF]">•</span> {t('roadmap1')}</li>
          <li className="flex gap-2"><span className="text-[#9945FF]">•</span> {t('roadmap2')}</li>
          <li className="flex gap-2"><span className="text-[#9945FF]">•</span> {t('roadmap3')}</li>
        </ul>
        <div className="mt-4 pt-4 border-t border-border">
          <Link href="/faq" className="text-sm text-[#9945FF] hover:underline">
            {t('faqLink')}
          </Link>
        </div>
      </div>
    </div>
  )
}
