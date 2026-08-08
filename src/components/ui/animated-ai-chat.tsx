"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Bot, History, Lightbulb, LineChart, Package, Plus, Sparkles, TrendingUp } from "lucide-react"

import { useAssistantChat } from "@/hooks/use-assistant-chat"
import { ChatMessage } from "@/components/assistant/chat-message"
import { ChatThinking } from "@/components/assistant/chat-thinking"
import { ChatInput, type ChatCommand } from "@/components/assistant/chat-input"
import { ChatHistorySidebar } from "@/components/assistant/chat-history-sidebar"

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return "Buenos días"
  if (h < 19) return "Buenas tardes"
  return "Buenas noches"
}

const COMMANDS: ChatCommand[] = [
  {
    label: "Ventas de hoy",
    description: "¿Cómo van las ventas de hoy?",
    prefix: "/ventas",
    prompt: "¿Cómo van mis ventas hoy?",
  },
  {
    label: "Resumen del negocio",
    description: "Panorama general de tu tienda",
    prefix: "/resumen",
    prompt: "Dame un resumen de mi negocio",
  },
  {
    label: "Stock bajo",
    description: "Productos por agotarse",
    prefix: "/stock",
    prompt: "¿Qué producto se agotará pronto?",
  },
  {
    label: "Recomendaciones",
    description: "Qué te recomiendo revisar",
    prefix: "/recomendar",
    prompt: "¿Qué me recomiendas revisar?",
  },
]

const SUGGESTIONS = [
  { icon: TrendingUp, label: "¿Cómo van mis ventas hoy?" },
  { icon: Package, label: "¿Qué producto se agotará pronto?" },
  { icon: LineChart, label: "Resumen de mi negocio" },
  { icon: Lightbulb, label: "¿Qué me recomiendas revisar?" },
]

/**
 * Panitas Chat (FASE 4F + 5B + 5C): el dashboard convertido en una conversación
 * directa con el agente. Reutiliza `useAssistantChat`, los componentes de chat
 * compartidos y el historial de conversaciones (FASE 5C) con sidebar lateral.
 */
export function AnimatedAIChat({ storeName, userName }: { storeName?: string; userName?: string | null }) {
  const chat = useAssistantChat()
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)

  const busy = chat.loading || chat.loadingSummary || chat.loadingHistory
  const emptyState = chat.messages.length <= 1
  const showChat = !emptyState || chat.loading || chat.loadingHistory

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [chat.messages, chat.loading])

  const lastUserMessage = [...chat.messages].reverse().find((m) => m.role === "user")?.content

  return (
    <section className="relative flex h-full flex-col overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-20 size-96 rounded-full bg-brand-primary/15 blur-[128px]" />
        <div className="absolute -bottom-24 -right-16 size-96 rounded-full bg-brand-secondary/10 blur-[128px]" />
        <div className="absolute right-1/3 top-1/4 size-64 rounded-full bg-brand/10 blur-[96px]" />
      </div>

      <header className="relative z-10 flex shrink-0 items-center gap-3 border-b border-gray-200 px-5 py-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl brand-gradient text-white shadow-lg shadow-brand-primary/30">
          <Bot className="size-5" />
        </div>
        <div className="min-w-0">
          <h1 className="font-heading text-base font-extrabold tracking-tight text-gray-900">Panitas IA</h1>
          <p className="truncate text-xs text-gray-500">
            {storeName ? `Asistente de ${storeName}` : "Asistente de tu negocio"}
          </p>
        </div>
        <span className="ml-2 inline-flex shrink-0 items-center gap-1 rounded-full bg-brand/15 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-brand-primary">
          <Sparkles className="size-3" /> Beta
        </span>
        <button
          type="button"
          onClick={() => setHistoryOpen((v) => !v)}
          aria-label="Historial de conversaciones"
          className="ml-auto flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
        >
          <History className="size-3.5" /> Historial
        </button>
        <button
          type="button"
          onClick={chat.startNewConversation}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
        >
          <Plus className="size-3.5" /> Nueva
        </button>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1">
        {/* Sidebar de historial — escritorio */}
        {historyOpen ? (
          <div className="hidden shrink-0 lg:block lg:w-64">
            <ChatHistorySidebar chat={chat} onClose={() => setHistoryOpen(false)} />
          </div>
        ) : null}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            {showChat ? (
              <div className="mx-auto flex max-w-3xl flex-col gap-4">
                {chat.loadingHistory ? (
                  <p className="py-6 text-center text-xs text-gray-400">Cargando conversación…</p>
                ) : null}

                {chat.messages.map((m) => (
                  <ChatMessage key={m.id} message={m} chat={chat} />
                ))}

                {chat.loading ? <ChatThinking message={lastUserMessage} className="px-1" /> : null}
                {chat.loadingSummary ? <ChatThinking message="resumen de mi negocio" className="px-1" /> : null}

                <div ref={bottomRef} />
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-6 px-4 text-center">
                <div className="space-y-3">
                  <div className="inline-flex size-14 items-center justify-center rounded-2xl brand-gradient text-white shadow-xl shadow-brand-primary/30">
                    <Bot className="size-7" />
                  </div>
                  <h2 className="font-heading text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
                    {greeting()}
                    {userName?.trim() ? `, ${userName.trim()}` : ""} 👋
                  </h2>
                  <p className="mx-auto max-w-md text-sm text-gray-500">
                    Pregúntale a Panitas sobre tus ventas, inventario, clientes o pedidos.
                    Escribe <span className="font-semibold text-brand-primary">/</span> para ver los comandos rápidos.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {SUGGESTIONS.map((s, index) => {
                    const Icon = s.icon
                    return (
                      <motion.button
                        key={s.label}
                        type="button"
                        onClick={() => chat.handleSend(s.label)}
                        disabled={busy}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.08 }}
                        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 transition-colors hover:border-brand-primary/50 hover:bg-brand-soft hover:text-gray-900 disabled:opacity-50"
                      >
                        <Icon className="size-4 text-brand-secondary" />
                        {s.label}
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-gray-200 p-4">
            <div className="relative mx-auto max-w-3xl">
              <ChatInput chat={chat} commands={COMMANDS} disabled={busy} />
              <p className="mt-2 flex items-center justify-center gap-1 text-[10px] text-gray-400">
                <Sparkles className="size-3 text-brand" />
                Asistente con IA. Verifica los cambios importantes antes de confirmarlos.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar de historial — móvil/tablet (overlay) */}
      {historyOpen ? (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <button
            type="button"
            aria-label="Cerrar historial"
            onClick={() => setHistoryOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="relative h-full w-72 max-w-[85vw] border-r border-gray-200 bg-white">
            <ChatHistorySidebar chat={chat} onClose={() => setHistoryOpen(false)} />
          </div>
        </div>
      ) : null}
    </section>
  )
}
