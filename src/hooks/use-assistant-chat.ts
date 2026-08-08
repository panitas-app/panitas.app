"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { BusinessSummary } from "@/lib/business-intelligence"
import type { RichResponse } from "@/lib/conversational-actions"
import type { AssistantRecommendation } from "@/lib/assistant-behavior"
import { recommendationsToMonitorRich } from "@/lib/conversational/recommendations"
import { sanitizeAssistantReply, humanizeError } from "@/lib/conversational"

export type ChatStatus = "completed" | "sending" | "thinking" | "error"

/** Acción pendiente de confirmación (vista de cliente, sin tool names). */
export interface ConfirmationActionView {
  stepId: string
  description: string
  impact: string
}

export type AssistantMessageKind = "text" | "confirmation" | "summary" | "rich"

export interface AssistantMessage {
  id: string
  role: "user" | "assistant"
  kind: AssistantMessageKind
  content: string
  status: ChatStatus
  confirmation?: ConfirmationActionView[]
  summary?: BusinessSummary
  /** FASE 5E: respuesta enriquecida (bloques semánticos renderizados por el ConversationRenderer). */
  rich?: RichResponse
}

/** Archivo adjuntado por el usuario para dar contexto al asistente. */
export interface ChatAttachment {
  id: string
  name: string
  type: string
  size: number
  dataUrl: string
}

export interface ConversationSummary {
  id: string
  title: string
  status: string
  updatedAt: string
  createdAt?: string
  messageCount?: number
  snippet?: string
}

interface ChatTurnResponse {
  conversationId: string
  message: { id: string; role: string; content: string; timestamp: string }
  response: { reply: string; ok: boolean; error?: string }
  metadata: { status: string; intent?: string }
  confirmation?: { actions: ConfirmationActionView[] }
  /** FASE 5E: respuesta enriquecida (bloques semánticos client-safe). */
  rich?: RichResponse
}

interface PendingConfirmation {
  text: string
  stepIds: string[]
  messageId: string
}

const WELCOME =
  "¡Hola! Soy Panitas, tu asistente de negocios. Pregúntame sobre tus ventas, inventario, clientes o pedidos."

const MAX_ATTACHMENTS = 4
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024

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
  const [attachments, setAttachments] = useState<ChatAttachment[]>([])
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

  /** FASE 5F: bienvenida contextual del gerente virtual (con fallback). */
  const loadProactiveWelcome = useCallback(async () => {
    try {
      const res = await fetch("/api/agent/proactive")
      const data = await res.json()
      if (!res.ok || !data?.greeting?.text) throw new Error("sin bienvenida")
      const recommendations = Array.isArray(data.recommendations) ? (data.recommendations as AssistantRecommendation[]) : []
      const messages: AssistantMessage[] = [
        { id: "welcome", role: "assistant", kind: "text", content: sanitizeAssistantReply(data.greeting.text), status: "completed" },
      ]
      if (recommendations.length > 0) {
        messages.push({
          id: `proactive-${Date.now()}`,
          role: "assistant",
          kind: "rich",
          content: "Esto es lo que encontré:",
          status: "completed",
          rich: recommendationsToMonitorRich(recommendations),
        })
      }
      setMessages(messages)
    } catch {
      setMessages([{ id: "welcome", role: "assistant", kind: "text", content: WELCOME, status: "completed" }])
    }
  }, [])

  const startNewConversation = useCallback(() => {
    pendingRef.current = null
    setActiveConversationId(null)
    setAttachments([])
    setMessages([])
    void loadProactiveWelcome()
  }, [loadProactiveWelcome])

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const clearAttachments = useCallback(() => setAttachments([]), [])

  const addAttachments = useCallback(
    (files: File[]) => {
      setAttachments((prev) => {
        const room = MAX_ATTACHMENTS - prev.length
        if (room <= 0) return prev
        const accepted: File[] = []
        for (const file of files) {
          if (accepted.length >= room) break
          if (file.size > MAX_ATTACHMENT_BYTES) continue
          if (!file.type.startsWith("image/") && !file.type.startsWith("audio/") && file.type !== "application/pdf") continue
          accepted.push(file)
        }
        if (accepted.length === 0) return prev
        void Promise.all(
          accepted.map(
            (file) =>
              new Promise<ChatAttachment | null>((resolve) => {
                const reader = new FileReader()
                reader.onload = () =>
                  resolve({
                    id: `attach-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    dataUrl: typeof reader.result === "string" ? reader.result : "",
                  })
                reader.onerror = () => resolve(null)
                reader.readAsDataURL(file)
              }),
          ),
        ).then((loaded) => {
          const valid = loaded.filter((a): a is ChatAttachment => a !== null)
          setAttachments((current) => {
            const merged = [...current, ...valid]
            return merged.slice(0, MAX_ATTACHMENTS)
          })
        })
        return prev
      })
    },
    [],
  )

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
            content: sanitizeAssistantReply(m.content),
            status: "completed" as const,
          }))
        if (history.length > 0) {
          setMessages(history)
        } else {
          void loadProactiveWelcome()
        }
      } catch {
        setMessages([{ id: "error", role: "assistant", kind: "text", content: "No se pudo cargar la conversación", status: "error" }])
      } finally {
        setLoadingHistory(false)
      }
    },
    [loadProactiveWelcome],
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

  const renameConversation = useCallback(async (conversationId: string, title: string) => {
    const clean = title.trim()
    if (!clean) return false
    try {
      const res = await fetch(`/api/conversations/${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: clean }),
      })
      if (!res.ok) return false
      setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, title: clean } : c)))
      return true
    } catch {
      return false
    }
  }, [])

  const searchConversations = useCallback(async (query: string) => {
    try {
      const params = new URLSearchParams()
      if (query.trim()) params.set("q", query.trim())
      const res = await fetch(`/api/conversations?${params.toString()}`)
      if (!res.ok) return
      const data = await res.json()
      setConversations(Array.isArray(data.data) ? data.data : [])
    } catch {
      // silencioso
    }
  }, [])

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
      setAttachments([])
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
          const rawError = data?.response?.error ?? (data as { error?: string }).error
          const errorText = rawError ? humanizeError(rawError) : "Ocurrió un error. Intenta de nuevo."
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
            { id: confirmId, role: "assistant", kind: "confirmation", content: sanitizeAssistantReply(data.response.reply), status: "completed", confirmation: confirmation.actions },
          ])
        } else {
          pendingRef.current = null
          setMessages((prev) => [
            ...(userMessage ? prev.map((m) => (m.id === userMessage.id ? patchMessage(m, "completed", data.message.id) : m)) : prev),
            {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              kind: data.rich && Array.isArray(data.rich.blocks) && data.rich.blocks.length > 0 ? "rich" : "text",
              content: sanitizeAssistantReply(data.response.reply),
              status: data.response.ok ? "completed" : "error",
              rich: data.rich,
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

  /** FASE 5E: reenvía una acción rápida (texto semántico) al asistente. */
  const sendQuickAction = useCallback(
    (action: { label: string; action: string }) => {
      void send(action.action)
    },
    [send],
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
    attachments,
    addAttachments,
    removeAttachment,
    clearAttachments,
    handleSend,
    send,
    sendQuickAction,
    confirmPending,
    cancelPending,
    loadBusinessSummary,
    loadConversations,
    startNewConversation,
    openConversation,
    deleteConversation,
    renameConversation,
    searchConversations,
  }
}

export type AssistantChat = ReturnType<typeof useAssistantChat>
