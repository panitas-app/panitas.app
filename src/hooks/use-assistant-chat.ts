"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { BusinessSummary } from "@/lib/business-intelligence"

export type ChatStatus = "completed" | "sending" | "thinking" | "error"

/** Acción pendiente de confirmación (vista de cliente). */
export interface ConfirmationActionView {
  stepId: string
  tool: string
  description: string
  impact: string
}

export type AssistantMessageKind = "text" | "confirmation" | "summary"

export interface AssistantMessage {
  id: string
  role: "user" | "assistant"
  kind: AssistantMessageKind
  content: string
  status: ChatStatus
  confirmation?: ConfirmationActionView[]
  summary?: BusinessSummary
}

export interface ConversationSummary {
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
  confirmation?: { actions: ConfirmationActionView[] }
}

interface PendingConfirmation {
  text: string
  stepIds: string[]
  messageId: string
}

const WELCOME =
  "¡Hola! Soy Panitas, tu asistente de negocios. Pregúntame sobre tus ventas, inventario, clientes o pedidos."

function patchMessage(m: AssistantMessage, status: ChatStatus, id?: string): AssistantMessage {
  return { ...m, ...(id ? { id } : {}), status }
}

export function useAssistantChat() {
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [value, setValue] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const pendingRef = useRef<PendingConfirmation | null>(null)

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations")
      if (!res.ok) return
      const data = await res.json()
      setConversations(Array.isArray(data.data) ? data.data : [])
    } catch {
      // silencioso: el chat sigue utilizable sin la lista
    }
  }, [])

  const startNewConversation = useCallback(() => {
    pendingRef.current = null
    setActiveConversationId(null)
    setMessages([{ id: "welcome", role: "assistant", kind: "text", content: WELCOME, status: "completed" }])
  }, [])

  const openConversation = useCallback(
    async (conversationId: string) => {
      pendingRef.current = null
      setLoadingHistory(true)
      setActiveConversationId(conversationId)
      try {
        const res = await fetch(`/api/conversations/${conversationId}`)
        if (!res.ok) {
          setMessages([{ id: "error", role: "assistant", kind: "text", content: "No se pudo cargar la conversación", status: "error" }])
          return
        }
        const data = await res.json()
        const history: AssistantMessage[] = (data.messages ?? [])
          .filter((m: { role: string }) => m.role === "user" || m.role === "assistant")
          .map((m: { id: string; role: string; content: string }) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            kind: "text" as const,
            content: m.content,
            status: "completed" as const,
          }))
        setMessages(history.length > 0 ? history : [{ id: "welcome", role: "assistant", kind: "text", content: WELCOME, status: "completed" }])
      } catch {
        setMessages([{ id: "error", role: "assistant", kind: "text", content: "No se pudo cargar la conversación", status: "error" }])
      } finally {
        setLoadingHistory(false)
      }
    },
    [],
  )

  const deleteConversation = useCallback(
    async (conversationId: string) => {
      if (!window.confirm("¿Eliminar esta conversación?")) return
      try {
        const res = await fetch(`/api/conversations/${conversationId}`, { method: "DELETE" })
        if (!res.ok) return
        setConversations((prev) => prev.filter((c) => c.id !== conversationId))
        if (activeConversationId === conversationId) startNewConversation()
      } catch {
        // silencioso
      }
    },
    [activeConversationId, startNewConversation],
  )

  const send = useCallback(
    async (text: string, confirmedStepIds?: string[], appendUser = true) => {
      if (loading) return
      const content = text.trim()
      if (!content) return

      const userMessage: AssistantMessage | null = appendUser
        ? { id: `local-${Date.now()}`, role: "user", kind: "text", content, status: "sending" }
        : null
      if (userMessage) setMessages((prev) => [...prev, userMessage])
      setValue("")
      setLoading(true)

      try {
        const res = await fetch("/api/agent/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: activeConversationId ?? undefined,
            message: content,
            ...(confirmedStepIds && confirmedStepIds.length > 0 ? { confirmedStepIds } : {}),
          }),
        })
        const data = (await res.json()) as ChatTurnResponse
        if (!res.ok) {
          const errorText = data?.response?.error ?? (data as { error?: string }).error ?? "Ocurrió un error. Intenta de nuevo."
          setMessages((prev) => [
            ...(userMessage ? prev.map((m) => (m.id === userMessage.id ? patchMessage(m, "error") : m)) : prev),
            { id: `error-${Date.now()}`, role: "assistant", kind: "text", content: errorText, status: "error" },
          ])
          return
        }

        setActiveConversationId(data.conversationId)

        const confirmation = data.confirmation
        if (data.metadata.status === "confirmation_required" && confirmation?.actions?.length) {
          const confirmId = `confirm-${Date.now()}`
          pendingRef.current = { text: content, stepIds: confirmation.actions.map((a) => a.stepId), messageId: confirmId }
          setMessages((prev) => [
            ...(userMessage ? prev.map((m) => (m.id === userMessage.id ? patchMessage(m, "completed", data.message.id) : m)) : prev),
            { id: confirmId, role: "assistant", kind: "confirmation", content: data.response.reply, status: "completed", confirmation: confirmation.actions },
          ])
        } else {
          pendingRef.current = null
          setMessages((prev) => [
            ...(userMessage ? prev.map((m) => (m.id === userMessage.id ? patchMessage(m, "completed", data.message.id) : m)) : prev),
            {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              kind: "text",
              content: data.response.reply,
              status: data.response.ok ? "completed" : "error",
            },
          ])
        }
        loadConversations()
      } catch {
        setMessages((prev) => [
          ...(userMessage ? prev.map((m) => (m.id === userMessage.id ? patchMessage(m, "error") : m)) : prev),
          { id: `error-${Date.now()}`, role: "assistant", kind: "text", content: "No se pudo conectar. Intenta de nuevo.", status: "error" },
        ])
      } finally {
        setLoading(false)
      }
    },
    [activeConversationId, loading, loadConversations],
  )

  const handleSend = useCallback(
    (text?: string) => {
      void send(text ?? value)
    },
    [send, value],
  )

  const confirmPending = useCallback(() => {
    const pending = pendingRef.current
    if (!pending || loading) return
    const messageId = pending.messageId
    setMessages((prev) => prev.filter((m) => m.id !== messageId))
    void send(pending.text, pending.stepIds, false)
  }, [loading, send])

  const cancelPending = useCallback(() => {
    const pending = pendingRef.current
    if (!pending) return
    pendingRef.current = null
    setMessages((prev) =>
      prev.flatMap((m) =>
        m.id === pending.messageId
          ? [{ id: `cancelled-${Date.now()}`, role: "assistant" as const, kind: "text" as const, content: "Acción cancelada. No se realizó ningún cambio.", status: "completed" as const }]
          : [m],
      ),
    )
  }, [])

  const loadBusinessSummary = useCallback(async () => {
    if (loadingSummary) return
    setLoadingSummary(true)
    const id = `summary-${Date.now()}`
    try {
      const res = await fetch("/api/agent/business-summary")
      const data = await res.json()
      if (!res.ok || !data?.summary) {
        setMessages((prev) => [
          ...prev,
          { id: `summary-error-${Date.now()}`, role: "assistant", kind: "text", content: data?.error ?? "No se pudo cargar el resumen de tu negocio.", status: "error" },
        ])
        return
      }
      setMessages((prev) => [
        ...prev,
        { id, role: "assistant", kind: "summary", content: "", status: "completed", summary: data.summary as BusinessSummary },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `summary-error-${Date.now()}`, role: "assistant", kind: "text", content: "No se pudo conectar. Intenta de nuevo.", status: "error" },
      ])
    } finally {
      setLoadingSummary(false)
    }
  }, [loadingSummary])

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const res = await fetch("/api/conversations")
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) setConversations(Array.isArray(data.data) ? data.data : [])
      } catch {
        // silencioso: el chat sigue utilizable sin la lista
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  return {
    messages,
    conversations,
    activeConversationId,
    value,
    setValue,
    loading,
    loadingHistory,
    loadingSummary,
    handleSend,
    send,
    confirmPending,
    cancelPending,
    loadBusinessSummary,
    loadConversations,
    startNewConversation,
    openConversation,
    deleteConversation,
  }
}

export type AssistantChat = ReturnType<typeof useAssistantChat>
