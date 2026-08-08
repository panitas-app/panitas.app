"use client"

import { useEffect, useRef, useState } from "react"
import { History, Lightbulb, LineChart, Package, Sparkles, TrendingUp } from "lucide-react"

import { cn } from "@/lib/utils"
import type { AssistantChat } from "@/hooks/use-assistant-chat"
import { ChatMessage } from "./chat-message"
import { ChatThinking } from "./chat-thinking"
import { ChatInput } from "./chat-input"
import { ChatHistorySidebar } from "./chat-history-sidebar"

const SUGGESTIONS = [
  { icon: TrendingUp, label: "¿Cómo van mis ventas hoy?" },
  { icon: Package, label: "¿Qué producto se agotará pronto?" },
  { icon: LineChart, label: "¿Cómo está mi negocio?" },
  { icon: Lightbulb, label: "¿Qué me recomiendas revisar?" },
]

/**
 * Vista de chat estilo ChatGPT (FASE 5B).
 * Mensajes del asistente sin burbuja, usuario en burbuja pequeña, estados
 * contextuales de pensamiento e input con adjuntos.
 */
export function AssistantChatView({ chat }: { chat: AssistantChat }) {
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const busy = chat.loading || chat.loadingSummary || chat.loadingHistory
  const emptyState = chat.messages.length <= 1

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [chat.messages, chat.loading, chat.loadingSummary])

  const lastUserMessage = [...chat.messages].reverse().find((m) => m.role === "user")?.content

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1">
        {/* Historial de conversaciones (FASE 5C) — escritorio */}
        {historyOpen ? (
          <div className="hidden shrink-0 border-r border-border/60 lg:block lg:w-64">
            <ChatHistorySidebar chat={chat} onClose={() => setHistoryOpen(false)} />
          </div>
        ) : null}

        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            className={cn(
              "absolute left-3 top-2 z-10 flex h-7 items-center gap-1 rounded-full border border-border bg-background px-2.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground",
              historyOpen && "lg:hidden",
            )}
          >
            <History className="size-3" /> Historial
          </button>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            {chat.loadingHistory ? (
              <p className="py-6 text-center text-xs text-muted-foreground">Cargando conversación…</p>
            ) : (
              <div className="mx-auto flex max-w-3xl flex-col gap-4">
                {chat.messages.map((m) => (
                  <ChatMessage key={m.id} message={m} chat={chat} />
                ))}

                {chat.loading ? <ChatThinking message={lastUserMessage} className="px-1" /> : null}
                {chat.loadingSummary ? <ChatThinking message="resumen de mi negocio" className="px-1" /> : null}

                {emptyState && !chat.loading && !chat.loadingSummary ? (
                  <div className="flex flex-col items-center gap-4 pt-8 text-center">
                    <p className="text-sm text-muted-foreground">Prueba preguntar algo como:</p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {SUGGESTIONS.map((s, index) => {
                        const Icon = s.icon
                        return (
                          <button
                            key={s.label}
                            type="button"
                            onClick={() => chat.handleSend(s.label)}
                            disabled={busy}
                            className={cn(
                              "inline-flex items-center gap-2 rounded-full border border-border bg-background px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/40 hover:text-foreground disabled:opacity-50",
                              index === 0 && "border-primary/30",
                            )}
                          >
                            <Icon className="size-4" />
                            {s.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="shrink-0 border-t border-border/60 px-4 py-4 sm:px-6">
            <div className="mx-auto max-w-3xl">
              <ChatInput chat={chat} disabled={busy} />
              <p className="mt-2 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                <Sparkles className="size-3" />
                Asistente con IA. Verifica los cambios importantes antes de confirmarlos.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Historial — móvil/tablet (overlay) */}
      {historyOpen ? (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <button
            type="button"
            aria-label="Cerrar historial"
            onClick={() => setHistoryOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="relative h-full w-72 max-w-[85vw] border-r border-border bg-background">
            <ChatHistorySidebar chat={chat} onClose={() => setHistoryOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  )
}
