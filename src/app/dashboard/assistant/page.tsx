"use client"

import { Plus, Bot } from "lucide-react"

import { Button } from "@/components/ui/button"
import { AssistantChatView } from "@/components/assistant/assistant-chat-view"
import { BusinessMonitorPanel } from "@/components/assistant/business-monitor-panel"
import { useAssistantChat } from "@/hooks/use-assistant-chat"
import { cn } from "@/lib/utils"

/**
 * Panitas Main Assistant (FASE 4C).
 * Página dedicada: chat a ancho completo + monitor de negocio 4B lateral.
 * Reutiliza el mismo hook y componentes que el Sheet del dashboard.
 */
export default function AssistantPage() {
  const chat = useAssistantChat()

  return (
    <div className="flex h-[calc(100dvh-6.5rem)] flex-col gap-4 lg:h-[calc(100dvh-5rem)] lg:flex-row">
      <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-border/60 bg-background/70 shadow-sm">
        <header className="flex items-center gap-3 border-b border-border/60 px-5 py-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bot className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="font-heading text-base font-bold">Panitas IA</h1>
            <p className="text-xs text-muted-foreground">Asistente principal de tu negocio</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={chat.startNewConversation}
            className="ml-auto h-8 gap-1 text-xs"
          >
            <Plus className="size-3.5" /> Nueva
          </Button>
        </header>

        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border/60 px-5 py-2.5 scrollbar-none">
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Conversaciones
          </span>
          {chat.conversations.slice(0, 8).map((c) => (
            <button
              key={c.id}
              onClick={() => chat.openConversation(c.id)}
              title={c.title}
              className={cn(
                "shrink-0 rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                c.id === chat.activeConversationId
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              {c.title.length > 22 ? `${c.title.slice(0, 22)}…` : c.title}
            </button>
          ))}
        </div>

        <AssistantChatView chat={chat} />
      </section>

      <aside className="hidden min-h-0 w-80 shrink-0 flex-col rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm lg:flex">
        <BusinessMonitorPanel />
      </aside>
    </div>
  )
}
