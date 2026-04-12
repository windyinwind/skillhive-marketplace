/**
 * SWARM Marketplace — Multi-provider LLM routing
 *
 * Returns a Vercel AI SDK LanguageModel for a given provider + model string.
 * Import from API routes only — requires server-side env vars.
 */

import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { google } from '@ai-sdk/google'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import type { LanguageModel } from 'ai'

export type Provider = 'anthropic' | 'openai' | 'google' | 'openrouter'

export interface ModelConfig {
  provider?: Provider
  model?: string
  temperature?: number
  maxTokens?: number
}

// Canonical model list — shown in the create-skill UI and enforced here.
export const DEFAULT_PROVIDER: Provider = (process.env.LLM_DEFAULT_PROVIDER as Provider) ?? 'openrouter'
export const DEFAULT_MODEL = process.env.LLM_DEFAULT_MODEL ?? 'meta-llama/llama-4-maverick'

export const PROVIDER_MODELS: Record<Provider, { id: string; label: string }[]> = {
  anthropic: [
    { id: 'claude-sonnet-4-6',         label: 'Claude Sonnet 4.6' },
    { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
    { id: 'claude-opus-4-6',           label: 'Claude Opus 4.6' },
  ],
  openai: [
    { id: 'gpt-4o',      label: 'GPT-4o' },
    { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
    { id: 'o3-mini',     label: 'o3-mini' },
  ],
  google: [
    { id: 'gemini-2.0-flash',             label: 'Gemini 2.0 Flash' },
    { id: 'gemini-2.5-pro-preview-05-06', label: 'Gemini 2.5 Pro' },
  ],
  openrouter: [
    { id: 'meta-llama/llama-4-maverick',        label: 'Llama 4 Maverick' },
    { id: 'meta-llama/llama-4-scout',           label: 'Llama 4 Scout' },
    { id: 'deepseek/deepseek-r1',               label: 'DeepSeek R1' },
    { id: 'deepseek/deepseek-chat-v3-0324',     label: 'DeepSeek V3' },
    { id: 'mistralai/mistral-large',            label: 'Mistral Large' },
    { id: 'x-ai/grok-3-beta',                  label: 'Grok 3' },
    { id: 'qwen/qwen3-235b-a22b',               label: 'Qwen3 235B' },
  ],
}

function getOpenRouter(): ReturnType<typeof createOpenRouter> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('[ai-providers] OPENROUTER_API_KEY is not configured')
  }
  return createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY })
}

const PROVIDER_KEY_ENV: Record<Provider, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai:    'OPENAI_API_KEY',
  google:    'GOOGLE_GENERATIVE_AI_API_KEY',
  openrouter:'OPENROUTER_API_KEY',
}

function hasKey(provider: Provider): boolean {
  return !!process.env[PROVIDER_KEY_ENV[provider]]
}

/**
 * Returns a Vercel AI SDK LanguageModel for the given config.
 * If the requested provider has no API key configured, falls back to the
 * platform default so skills never hard-crash due to misconfigured model_config.
 */
export function getModel(config: ModelConfig | null): LanguageModel {
  let provider = config?.provider ?? DEFAULT_PROVIDER
  let modelId  = config?.model   ?? DEFAULT_MODEL

  // Fall back to platform default if the requested provider has no key
  if (config?.provider && !hasKey(provider)) {
    provider = DEFAULT_PROVIDER
    modelId  = DEFAULT_MODEL
  }

  switch (provider) {
    case 'anthropic':
      return anthropic(modelId)
    case 'openai':
      return openai(modelId)
    case 'google':
      return google(modelId)
    case 'openrouter':
      return getOpenRouter()(modelId)
    default:
      return getOpenRouter()(DEFAULT_MODEL)
  }
}
