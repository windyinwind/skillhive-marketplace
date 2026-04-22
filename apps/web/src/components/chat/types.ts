export interface ToolStep {
  id: string
  toolName: string
  args: Record<string, any>
  result?: any
  // AI SDK v6 states: input-streaming, input-available, output-available, output-error
  // Legacy states: call, partial-call, result, calling, done, error
  state: string
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
  skillDebts?: SkillDebt[]
  paid?: boolean
  isFree?: boolean
}
