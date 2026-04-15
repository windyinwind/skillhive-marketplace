export interface ToolStep {
  id: string
  toolName: string
  args: Record<string, unknown>
  result?: Record<string, unknown>
  state: 'calling' | 'done' | 'error'
}

export interface SkillDebt {
  skillId: string
  skillName: string
  ownerWallet: string
  costLamports: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolSteps?: ToolStep[]
  skillDebts?: SkillDebt[]   // skills used but not yet paid — shown after response
  paid?: boolean
}

export type SSEEvent =
  | { type: 'tool-call'; toolCallId: string; toolName: string; args: Record<string, unknown> }
  | { type: 'tool-result'; toolCallId?: string; toolName: string; result: Record<string, unknown> }
  | { type: 'text-delta'; text: string }
  | { type: 'done'; text?: string; isFree?: boolean; freeUsesRemaining?: number }
  | { type: 'error'; error: string }
