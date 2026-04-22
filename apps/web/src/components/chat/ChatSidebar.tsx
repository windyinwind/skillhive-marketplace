'use client'

import { Plus, MessageSquare, Trash2, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useEffect } from 'react'

interface Conversation {
  id: string
  title: string
  created_at: string
}

interface ChatSidebarProps {
  wallet: string
  currentId?: string
  onSelect: (id: string) => void
  onNew: () => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

export function ChatSidebar({
  wallet,
  currentId,
  onSelect,
  onNew,
  isOpen,
  setIsOpen
}: ChatSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!wallet) return
    fetchConversations()
  }, [wallet])

  async function fetchConversations() {
    setLoading(true)
    try {
      const res = await fetch(`/api/chat/conversations?wallet=${wallet}`)
      const data = await res.json()
      if (data.conversations) {
        setConversations(data.conversations)
      }
    } catch (err) {
      console.error('Failed to fetch conversations', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-20 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-[#9945FF] text-white shadow-lg sm:hidden"
      >
        <MessageSquare className="h-5 w-5" />
      </button>

      {/* Desktop sidebar — collapses via width transition */}
      <div
        className={`hidden sm:flex flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'w-64' : 'w-0'
        }`}
      >
        <div className="w-64 flex-shrink-0 h-full flex flex-col border-r border-border bg-card overflow-hidden">
          <div className="p-4">
            <button
              onClick={onNew}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background py-2.5 text-sm font-semibold text-foreground transition-all hover:border-[#9945FF]/40 hover:bg-secondary"
            >
              <Plus className="h-4 w-4" />
              New Chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
            {loading && conversations.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : conversations.length === 0 ? (
              <p className="px-3 py-4 text-xs text-muted-foreground text-center">No recent chats</p>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onSelect(c.id)}
                  className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    currentId === c.id
                      ? 'bg-[#9945FF]/10 text-[#9945FF]'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <span className="truncate flex-1">{c.title}</span>
                </button>
              ))
            )}
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-center p-4 border-t border-border hover:bg-secondary text-muted-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            <span className="text-xs">Collapse</span>
          </button>
        </div>
      </div>

      {/* Desktop expand tab — shown when collapsed */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="hidden sm:flex absolute left-0 top-1/2 z-10 -translate-y-1/2 h-16 w-6 items-center justify-center rounded-r-lg border border-l-0 border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* Mobile sidebar — overlay */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 flex flex-col border-r border-border bg-card transform transition-transform duration-300 ease-in-out sm:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4">
          <button
            onClick={onNew}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background py-2.5 text-sm font-semibold text-foreground transition-all hover:border-[#9945FF]/40 hover:bg-secondary"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => { onSelect(c.id); setIsOpen(false) }}
              className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                currentId === c.id
                  ? 'bg-[#9945FF]/10 text-[#9945FF]'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <MessageSquare className="h-4 w-4 shrink-0" />
              <span className="truncate flex-1">{c.title}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
