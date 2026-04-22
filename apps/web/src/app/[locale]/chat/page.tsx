import type { Metadata } from 'next'
import { ChatContainer } from '@/components/chat/ChatContainer'

export const metadata: Metadata = {
  title: 'SkillHive Chat — Multi-Agent Orchestration',
  description:
    'Ask any question and SkillHive automatically discovers and calls the best AI skills from the marketplace to answer it.',
}

export default function ChatPage() {
  return <ChatContainer />
}
