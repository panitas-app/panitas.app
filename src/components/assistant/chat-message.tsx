"use client"

import { LineChart } from "lucide-react"

import { cn } from "@/lib/utils"
import { BusinessSummaryView } from "@/components/business/business-summary"
import { ConversationRenderer } from "@/components/assistant/renderers/conversation-renderer"
import type { AssistantChat, AssistantMessage } from "@/hooks/use-assistant-chat"
import { ChatMarkdown } from "./chat-markdown"
import { ChatThinking } from "./chat-thinking"
import { ConfirmationCard } from "./assistant-confirmation"

/**
 * Render de un mensaje del chat (FASE 5B / FASE 5E).
 *
 * - Usuario: burbuja pequeña y pegada a la derecha (máx 90% móvil / 70% tablet / 45% escritorio).
 * - Asistente: texto libre sin burbuja, markdown enriquecido.
 * - Confirmaciones y resúmenes: tarjetas visuales.
 * - FASE 5E: mensajes `rich` renderizan los bloques semánticos con el
 *   ConversationRenderer y sus acciones rápidas se reenvían al chat.
 */
export function ChatMessage({ message, chat }: { message: AssistantMessage; chat: AssistantChat }) {
  if (message.kind === "confirmation" && message.confirmation) {
    return (
      <div className="flex w-full justify-start">
        <div className="w-full max-w-2xl">
          <ChatMarkdown className="mb-3">{message.content}</ChatMarkdown>
          <ConfirmationCard
            actions={message.confirmation}
            onConfirm={chat.confirmPending}
            onCancel={chat.cancelPending}
            busy={chat.loading}
          />
        </div>
      </div>
    )
  }

  if (message.kind === "summary" && message.summary) {
    return (
      <div className="flex w-full justify-start">
        <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border/60 bg-card/70 p-4">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <LineChart className="size-3.5" /> Resumen de tu negocio
          </p>
          <BusinessSummaryView summary={message.summary} />
        </div>
      </div>
    )
  }

  if (message.kind === "rich" && message.rich) {
    return (
      <div className="flex w-full justify-start">
        <div className="w-full max-w-2xl space-y-3">
          <ChatMarkdown className="mb-1">{message.content}</ChatMarkdown>
          <ConversationRenderer rich={message.rich} onSend={chat.sendQuickAction} />
        </div>
      </div>
    )
  }

  if (message.role === "user") {
    const isError = message.status === "error"
    return (
      <div className="flex w-full justify-end">
        <div
          className={cn(
            "max-w-[90%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed md:max-w-[70%] lg:max-w-[45%]",
            isError ? "bg-destructive/15 text-destructive" : "bg-primary text-primary-foreground",
          )}
        >
          {message.content}
        </div>
      </div>
    )
  }

  if (message.status === "error") {
    return (
      <div className="flex w-full justify-start">
        <p className="text-sm leading-relaxed text-destructive">{message.content}</p>
      </div>
    )
  }

  if (message.status === "sending" || message.status === "thinking") {
    return <ChatThinking message={message.content} className="py-1" />
  }

  return (
    <div className="flex w-full justify-start">
      <div className="min-w-0 flex-1">
        <ChatMarkdown>{message.content}</ChatMarkdown>
      </div>
    </div>
  )
}
