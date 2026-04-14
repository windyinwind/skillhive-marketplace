'use client'

import { formatSol } from '@/lib/format'
import type { ToolStep } from './types'

interface CostTallyProps {
  toolSteps: ToolStep[]
}

export function CostTally({ toolSteps }: CostTallyProps) {
  const total = toolSteps
    .filter((s) => s.toolName === 'call_skill' && s.state === 'done')
    .reduce((sum, s) => sum + ((s.result?.costLamports as number) ?? 0), 0)

  if (total === 0) return null

  return (
    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
      <span>Total skill cost:</span>
      <span className="font-mono text-[#14F195]">{formatSol(total)}</span>
    </div>
  )
}
