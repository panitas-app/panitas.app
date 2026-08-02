"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Send, Sparkles, Bot, Clock, TrendingUp, Package, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { useAssistant } from "@/components/assistant/assistant-provider"
import { cn } from "@/lib/utils"

const SUGGESTIONS = [
  { icon: TrendingUp, label: "¿Cómo van mis ventas hoy?" },
  { icon: Package, label: "¿Qué producto se agotará pronto?" },
  { icon: Clock, label: "Resumen de mi semana" },
]

const WELCOME =
  "¡Hola! Soy Panitas, tu asistente de negocios. Pregúntame sobre tus ventas, inventario, clientes o pedidos."

type ChatStatus = "completed" | "sending" | "thinking" | "error"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  status: ChatStatus
}

interface ConversationSummary {
  id: string
  title: string
  status: string
  updatedAt: string
}

interface ChatTurnResponse {
  conversationId: string
  message: { id: string; role: string; content: string; timestamp: string }
  response: { reply: string; ok: boolean; error?: string; toolCalls: { name: string }[] }
  metadata: Record<string, unknown>
}

function patchMessage(m: ChatMessage, status: ChatStatus, id?: string): ChatMessage {
  return { ...m, ...(id ? { id } : {}), status }
}

export function AssistantPanel() {
  const { open, closeAssistant } = useAssistant()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [value, setValue] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const scrollBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [])

  useEffect(() => {
    if (!open) return
    scrollBottom()
    loadConversations()
  }, [open, scrollBottom])

  useEffect(() => {
    if (open) scrollBottom()
  }, [open, messages, scrollBottom])

  async function loadConversations() {
    try {
      const res = await fetch("/api/conversations")
      if (!res.ok) return
      const data = await res.json()
      setConversations(Array.isArray(data.data) ? data.data : [])
    } catch {
      // silencioso: el panel sigue utilizable sin la lista
    }
  }

  function startNewConversation() {
    setActiveConversationId(null)
    setMessages([{ id: "welcome", role: "assistant", content: WELCOME, status: "completed" }])
  }

  async function openConversation(conversationId: string) {
    setLoadingHistory(true)
    setActiveConversationId(conversationId)
    try {
      const res = await fetch(`/api/conversations/${conversationId}`)
      if (!res.ok) {
        setMessages([{ id: "error", role: "assistant", content: "No se pudo cargar la conversación", status: "error" }])
        return
      }
      const data = await res.json()
      const history: ChatMessage[] = (data.messages ?? [])
        .filter((m: { role: string }) => m.role === "user" || m.role === "assistant")
        .map((m: { id: string; role: string; content: string }) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          status: "completed",
        }))
      setMessages(history.length > 0 ? history : [{ id: "welcome", role: "assistant", content: WELCOME, status: "completed" }])
    } catch {
      setMessages([{ id: "error", role: "assistant", content: "No se pudo cargar la conversación", status: "error" }])
    } finally {
      setLoadingHistory(false)
    }
  }

  async function deleteConversation(conversationId: string) {
    if (!window.confirm("¿Eliminar esta conversación?")) return
    try {
      const res = await fetch(`/api/conversations/${conversationId}`, { method: "DELETE" })
      if (!res.ok) return
      setConversations((prev) => prev.filter((c) => c.id !== conversationId))
      if (activeConversationId === conversationId) startNewConversation()
    } catch {
      // silencioso
    }
  }

  async function handleSend(text?: string) {
    const content = (text ?? value).trim()
    if (!content || loading) return

    const userMessage: ChatMessage = { id: `local-${Date.now()}`, role: "user", content, status: "sending" }
    setMessages((prev) => [...prev, userMessage])
    setValue("")
    setLoading(true)

    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConversationId ?? undefined,
          message: content,
        }),
      })
      const data = (await res.json()) as ChatTurnResponse
      if (!res.ok) {
        const errorText = data?.response?.error ?? (data as { error?: string })?.error ?? "Ocurrió un error. Intenta de nuevo."
        setMessages((prev) => [
          ...prev.map((m) => (m.id === userMessage.id ? patchMessage(m, "error") : m)),
          { id: `error-${Date.now()}`, role: "assistant", content: errorText, status: "error" },
        ])
        return
      }

      setActiveConversationId(data.conversationId)
      setMessages((prev) => [
        ...prev.map((m) => (m.id === userMessage.id ? patchMessage(m, "completed", data.message.id) : m)),
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.response.reply,
          status: data.response.ok ? "completed" : "error",
        },
      ])
      loadConversations()
    } catch {
      setMessages((prev) => [
        ...prev.map((m) => (m.id === userMessage.id ? patchMessage(m, "error") : m)),
        { id: `error-${Date.now()}`, role: "assistant", content: "No se pudo conectar. Intenta de nuevo.", status: "error" },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && closeAssistant()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border/60 px-5 pb-4 pt-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Bot className="size-5" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="font-heading text-base font-bold">Panitas IA</SheetTitle>
              <SheetDescription className="text-xs">Asistente de negocios</SheetDescription>
            </div>
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-brand/15 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-black/70">
              <Sparkles className="size-3" /> Beta
            </span>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={startNewConversation}
              className="h-8 gap-1 text-xs"
            >
              <Plus className="size-3.5" /> Nueva
            </Button>
            {activeConversationId && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => deleteConversation(activeConversationId)}
                className="h-8 gap-1 text-xs text-destructive hover:text-destructive"
              >
                <Trash2 className="size-3.5" /> Borrar
              </Button>
            )}
            <div className="ml-auto flex max-w-[55%] gap-1 overflow-x-auto scrollbar-none">
              {conversations.slice(0, 6).map((c) => (
                <button
                  key={c.id}
                  onClick={() => openConversation(c.id)}
                  title={c.title}
                  className={cn(
                    "shrink-0 rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                    c.id === activeConversationId
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  {c.title.length > 18 ? `${c.title.slice(0, 18)}…` : c.title}
                </button>
              ))}
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {loadingHistory ? (
            <p className="text-center text-xs text-muted-foreground">Cargando conversación…</p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    m.role === "user"
                      ? m.status === "error"
                        ? "bg-destructive/15 text-destructive"
                        : "bg-primary text-primary-foreground"
                      : m.status === "error"
                        ? "border border-destructive/40 bg-destructive/5 text-destructive"
                        : "bg-muted text-foreground",
                  )}
                >
                  {m.content}
                  {m.status === "sending" || m.status === "thinking" ? (
                    <span className="ml-1.5 inline-block">
                      <span className="inline-block size-1.5 animate-bounce rounded-full bg-current align-middle" />
                      <span className="ml-0.5 inline-block size-1.5 animate-bounce rounded-full bg-current align-middle [animation-delay:120ms]" />
                      <span className="ml-0.5 inline-block size-1.5 animate-bounce rounded-full bg-current align-middle [animation-delay:240ms]" />
                    </span>
                  ) : null}
                </div>
              </div>
            ))
          )}
          {loading ? (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                Panitas está pensando…
              </div>
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-border/60 px-5 pb-5 pt-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Sugerencias
          </p>
          <div className="mb-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => {
              const Icon = s.icon
              return (
                <button
                  key={s.label}
                  onClick={() => handleSend(s.label)}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
                >
                  <Icon className="size-3.5" />
                  {s.label}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend()
              }}
              placeholder="Pregúntale a Panitas…"
              className="h-11 flex-1 rounded-xl"
              disabled={loading}
            />
            <Button
              size="icon"
              onClick={() => handleSend()}
              disabled={!value.trim() || loading}
              className="size-11 shrink-0 rounded-xl"
              aria-label="Enviar mensaje"
            >
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
