'use client'

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type Provider = 'anthropic' | 'openai' | 'google' | 'openrouter'

const MODEL_OPTIONS: { provider: Provider; label: string; models: { id: string; label: string }[] }[] = [
  {
    provider: 'anthropic',
    label: 'Anthropic',
    models: [
      { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
      { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
      { id: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
    ],
  },
  {
    provider: 'openai',
    label: 'OpenAI',
    models: [
      { id: 'gpt-4o', label: 'GPT-4o' },
      { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
      { id: 'o3-mini', label: 'o3-mini' },
    ],
  },
  {
    provider: 'google',
    label: 'Google',
    models: [
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
      { id: 'gemini-2.5-pro-preview-05-06', label: 'Gemini 2.5 Pro' },
    ],
  },
  {
    provider: 'openrouter',
    label: 'OpenRouter',
    models: [
      { id: 'nvidia/nemotron-3-super-120b-a12b:free', label: 'Nemotron 120B (Free)' },
      { id: 'meta-llama/llama-4-maverick', label: 'Llama 4 Maverick' },
      { id: 'deepseek/deepseek-r1', label: 'DeepSeek R1' },
      { id: 'deepseek/deepseek-chat-v3-0324', label: 'DeepSeek V3' },
      { id: 'x-ai/grok-3-beta', label: 'Grok 3' },
    ],
  },
]

// Sentinel value meaning "use whatever LLM_DEFAULT_* says on the server"
export const SERVER_DEFAULT = 'server::default'

interface ModelSelectorProps {
  value: string // "provider::modelId" or SERVER_DEFAULT
  onChange: (provider: Provider | null, model: string | null) => void
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (v === SERVER_DEFAULT) {
          onChange(null, null)
          return
        }
        const [provider, model] = v.split('::') as [Provider, string]
        onChange(provider, model)
      }}
    >
      <SelectTrigger className="h-8 w-[200px] border-border bg-card text-xs text-foreground focus:ring-[#9945FF]/50">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="border-border bg-card">
        <SelectGroup>
          <SelectItem
            value={SERVER_DEFAULT}
            className="cursor-pointer text-xs text-[#14F195] focus:bg-[#9945FF]/10 focus:text-foreground"
          >
            Server default
          </SelectItem>
        </SelectGroup>
        <SelectSeparator className="bg-[#2a3147]" />
        {MODEL_OPTIONS.map(({ provider, label, models }) => (
          <SelectGroup key={provider}>
            <SelectLabel className="text-xs text-muted-foreground">{label}</SelectLabel>
            {models.map((m) => (
              <SelectItem
                key={`${provider}::${m.id}`}
                value={`${provider}::${m.id}`}
                className="cursor-pointer text-xs text-muted-foreground focus:bg-[#9945FF]/10 focus:text-foreground"
              >
                {m.label}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}
