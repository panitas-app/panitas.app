"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { MessageCircle, Pencil, Plus, Search, Trash2, X } from "lucide-react"

import { cn } from "@/lib/utils"
import type { AssistantChat } from "@/hooks/use-assistant-chat"

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const min = Math.floor(diff / 60000)
  if (min < 1) return "ahora"
  if (min < 60) return `hace ${min} min`
  const hours = Math.floor(min / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `hace ${days} d`
  return new Date(iso).toLocaleDateString("es-VE", { day: "numeric", month: "short" })
}

interface ChatHistorySidebarProps {
  chat: AssistantChat
  onClose: () => void
  className?: string
}

/**
 * Historial de conversaciones (FASE 5C) — estilo ChatGPT: nueva conversación,
 * búsqueda, lista con título automático, renombrar y eliminar.
 */
export function ChatHistorySidebar({ chat, onClose, className }: ChatHistorySidebarProps) {
  const [query, setQuery] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      void chat.searchConversations(query)
    }, 250)
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
    }
  }, [query, chat])

  const items = useMemo(() => chat.conversations, [chat.conversations])

  const startRename = (id: string, title: string) => {
    setEditingId(id)
    setDraft(title)
  }

  const saveRename = async (id: string) => {
    const ok = await chat.renameConversation(id, draft)
    if (ok) setEditingId(null)
  }

  return (
    <aside
      className={cn(
        "flex h-full w-full flex-col border-r border-border/60 bg-background",
        "transition-all duration-300",
        className,
      )}
    >
      <div className="flex shrink-0 items-center gap-2 p-3">
        <button
          type="button"
          onClick={chat.startNewConversation}
          className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-background text-sm font-semibold text-foreground transition-colors hover:bg-muted/50"
        >
          <Plus className="size-4" /> Nueva conversación
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar historial"
          className="flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="shrink-0 px-3 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar conversaciones…"
            className="h-9 w-full rounded-xl border border-border bg-muted/40 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none px-2 pb-3">
        {items.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            {query ? "Sin resultados" : "Sin conversaciones todavía"}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {items.map((conversation) => {
              const isActive = conversation.id === chat.activeConversationId
              const isEditing = editingId === conversation.id
              return (
                <li key={conversation.id}>
                  {isEditing ? (
                    <div className="flex items-center gap-1 rounded-xl p-1">
                      <input
                        autoFocus
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void saveRename(conversation.id)
                          if (e.key === "Escape") setEditingId(null)
                        }}
                        onBlur={() => {
                          if (editingId) void saveRename(editingId)
                        }}
                        className="h-8 min-w-0 flex-1 rounded-lg border border-primary/40 bg-background px-2 text-sm text-foreground focus:outline-none"
                      />
                    </div>
                  ) : (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setQuery("")
                        void chat.openConversation(conversation.id)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          setQuery("")
                          void chat.openConversation(conversation.id)
                        }
                      }}
                      className={cn(
                        "group flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-2 text-sm transition-colors",
                        isActive ? "bg-gray-100 text-gray-900" : "text-foreground/75 hover:bg-muted/50 hover:text-foreground",
                      )}
                    >
                      <MessageCircle className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{conversation.title}</span>
                        <span className="block text-[10px] text-muted-foreground">{relativeTime(conversation.updatedAt)}</span>
                      </span>
                      <span className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
                        <button
                          type="button"
                          aria-label="Renombrar"
                          onClick={(e) => {
                            e.stopPropagation()
                            startRename(conversation.id, conversation.title)
                          }}
                          className="flex size-6 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Pencil className="size-3" />
                        </button>
                        <button
                          type="button"
                          aria-label="Eliminar"
                          onClick={(e) => {
                            e.stopPropagation()
                            void chat.deleteConversation(conversation.id)
                          }}
                          className="flex size-6 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </span>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </aside>
  )
}
