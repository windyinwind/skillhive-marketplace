'use client'

import * as React from 'react'
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast, type ToasterToast } from '@/hooks/use-toast'

function ToastItem({ toast, onDismiss }: { toast: ToasterToast; onDismiss: (id: string) => void }) {
  const icon =
    toast.variant === 'success' ? (
      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
    ) : toast.variant === 'destructive' ? (
      <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
    ) : (
      <Info className="h-4 w-4 text-blue-400 shrink-0" />
    )

  return (
    <div
      className={cn(
        'pointer-events-auto flex items-start gap-3 w-full max-w-sm rounded-xl border p-4 shadow-2xl transition-all',
        'bg-background border-border',
        toast.variant === 'destructive' && 'border-red-600/40 bg-red-950/60',
        toast.variant === 'success' && 'border-emerald-600/40',
        !toast.open && 'opacity-0 translate-x-4'
      )}
    >
      {icon}
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="text-sm font-semibold text-white leading-tight">{toast.title}</p>
        )}
        {toast.description && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{toast.description}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
      >
        <X className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    </div>
  )
}

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts
        .filter((t) => t.open)
        .map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
    </div>
  )
}
