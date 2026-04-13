import type { Metadata } from 'next'
import { ChatContainer } from '@/app/chat/ChatContainer'

export const metadata: Metadata = {
  title: 'SWARM Chat — Multi-Agent Orchestration',
  description:
    'Ask any question and SWARM automatically discovers and calls the best AI skills from the marketplace to answer it.',
}

export default function ChatPage() {
  return <ChatContainer />
}
