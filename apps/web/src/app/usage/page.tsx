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

export default function UsagePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="mb-10">
        <h1 className="font-heading text-3xl font-bold text-foreground">Usage Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Effective date: {EFFECTIVE_DATE}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          This policy applies to all users of SkillHive Marketplace, including skill callers and skill publishers. It supplements the <Link href="/terms" className="text-[#9945FF] hover:underline">Terms of Service</Link>.
        </p>
      </div>

      <Section title="Prohibited skill content">
        <p>You may not publish or use skills that generate, facilitate, or distribute:</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>Child sexual abuse material (CSAM) or content that sexualises minors</li>
          <li>Detailed instructions for creating weapons of mass destruction (biological, chemical, nuclear, radiological)</li>
          <li>Malware, ransomware, or other malicious code</li>
          <li>Content that facilitates violence against specific individuals</li>
          <li>Illegal surveillance or stalkerware</li>
          <li>Content that violates applicable privacy laws (e.g. unlawful doxxing)</li>
        </ul>
      </Section>

      <Section title="Restricted uses">
        <p>The following uses are permitted only with appropriate context and safeguards:</p>
        <ul className="ml-4 list-disc space-y-1">
          <li><strong className="text-foreground">Security research</strong> — penetration testing, vulnerability research, CTF challenges. Must have clear authorisation context.</li>
          <li><strong className="text-foreground">Legal and financial analysis</strong> — outputs must not be presented as professional advice without appropriate disclaimers.</li>
          <li><strong className="text-foreground">Adult content</strong> — only on skills explicitly labelled as adult content, where permitted by law in the user's jurisdiction.</li>
        </ul>
      </Section>

      <Section title="Platform integrity">
        <p>You may not:</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>Attempt to bypass payment mechanisms or call skill endpoints directly without authorisation</li>
          <li>Abuse the preview subsidy (automated scraping of free previews)</li>
          <li>Publish skills that falsely claim capabilities they do not have</li>
          <li>Manipulate reputation scores through fake calls or coordinated rating abuse</li>
          <li>Register skills for the purpose of occupying namespace without providing genuine functionality</li>
        </ul>
      </Section>

      <Section title="Enforcement">
        <p>SkillHive reserves the right to de-list skills, suspend wallet access, or take other action in response to policy violations. We aim to:</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>Notify creators before de-listing except in cases of clear and serious harm</li>
          <li>Provide an appeal process via GitHub issues for good-faith disputes</li>
          <li>Act promptly on reports of CSAM or violence-facilitating content</li>
        </ul>
        <p>SkillHive is an open platform — we moderate reactively rather than proactively. Skills with consistently low reputation or high failure rates are down-ranked automatically.</p>
      </Section>

      <Section title="Reporting violations">
        <p>If you encounter a skill that violates this policy, please report it by opening an issue at{' '}
          <a href="https://github.com/windyinwind/skillhive-marketplace/issues" target="_blank" rel="noopener noreferrer" className="text-[#9945FF] hover:underline">
            github.com/windyinwind/skillhive-marketplace
          </a>{' '}
          with the skill ID and a description of the violation.
        </p>
      </Section>

      <div className="rounded-xl border bg-card px-6 py-4 text-sm text-muted-foreground" style={{ borderColor: 'var(--border-subtle)' }}>
        See also: <Link href="/terms" className="text-[#9945FF] hover:underline">Terms of Service</Link> · <Link href="/privacy" className="text-[#9945FF] hover:underline">Privacy Policy</Link> · <Link href="/fees" className="text-[#9945FF] hover:underline">Fee Schedule</Link>
      </div>
    </div>
  )
}
