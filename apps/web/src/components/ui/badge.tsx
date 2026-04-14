import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-blue-600/20 text-blue-400 border-blue-600/30',
        secondary:
          'border-transparent bg-slate-700 text-foreground',
        destructive:
          'border-transparent bg-red-600/20 text-red-400 border-red-600/30',
        outline:
          'text-foreground border-border',
        // Tier-specific badges
        tier1:
          'border-transparent bg-emerald-600/20 text-emerald-400 border-emerald-600/30',
        tier2:
          'border-transparent bg-violet-600/20 text-violet-400 border-violet-600/30',
        tier3:
          'border-transparent bg-orange-600/20 text-orange-400 border-orange-600/30',
        // Tag style
        tag:
          'border-transparent bg-slate-700/80 text-foreground hover:bg-slate-600/80 cursor-pointer',
        // Status
        success:
          'border-transparent bg-emerald-600/20 text-emerald-400 border-emerald-600/30',
        warning:
          'border-transparent bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
        error:
          'border-transparent bg-red-600/20 text-red-400 border-red-600/30',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
