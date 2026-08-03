"use client"

import { useEffect, useRef } from "react"
import { Send, Sparkles, TrendingUp, Package, Clock, LineChart, Lightbulb } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { BusinessSummaryView } from "@/components/business/business-summary"
import { ConfirmationCard } from "@/components/assistant/assistant-confirmation"
import type { AssistantChat } from "@/hooks/use-assistant-chat"

const SUGGESTIONS = [
  { icon: TrendingUp, label: "¿Cómo van mis ventas hoy?" },
  { icon: Package, label: "¿Qué producto se agotará pronto?" },
  { icon: Clock, label: "Resumen de mi semana" },
  { icon: LineChart, label: "¿Cómo está mi negocio?" },
  { icon: Lightbulb, label: "¿Qué me recomiendas revisar?" },
]

export function AssistantChatView({ chat }: { chat: AssistantChat }) {
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const busy = chat.loading || chat.loadingSummary || chat.loadingHistory

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [chat.messages, chat.loading])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {chat.loadingHistory ? (
          <p className="text-center text-xs text-muted-foreground">Cargando conversación…</p>
        ) : (
          chat.messages.map((m) => {
            if (m.kind === "confirmation" && m.confirmation) {
              return (
                <div key={m.id} className="flex justify-start">
                  <div className="w-full">
                    <p className="mb-2 max-w-[85%] whitespace-pre-wrap rounded-2xl bg-muted px-4 py-2.5 text-sm leading-relaxed text-foreground">
                      {m.content}
                    </p>
                    <ConfirmationCard
                      actions={m.confirmation}
                      onConfirm={chat.confirmPending}
                      onCancel={chat.cancelPending}
                      busy={chat.loading}
                    />
                  </div>
                </div>
              )
            }

            if (m.kind === "summary" && m.summary) {
              return (
                <div key={m.id} className="flex justify-start">
                  <div className="w-full rounded-2xl border border-border/60 bg-card/70 p-4">
                    <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <LineChart className="size-3.5" /> Resumen de tu negocio
                    </p>
                    <BusinessSummaryView summary={m.summary} />
                  </div>
                </div>
              )
            }

            return (
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
            )
          })
        )}
        {chat.loading ? (
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
            const isSummary = s.label === "¿Cómo está mi negocio?"
            return (
              <button
                key={s.label}
                onClick={() => {
                  if (isSummary) chat.loadBusinessSummary()
                  else chat.handleSend(s.label)
                }}
                disabled={busy}
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
            value={chat.value}
            onChange={(e) => chat.setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") chat.handleSend()
            }}
            placeholder="Pregúntale a Panitas…"
            className="h-11 flex-1 rounded-xl"
            disabled={chat.loading}
          />
          <Button
            size="icon"
            onClick={() => chat.handleSend()}
            disabled={!chat.value.trim() || chat.loading}
            className="size-11 shrink-0 rounded-xl"
            aria-label="Enviar mensaje"
          >
            <Send className="size-4" />
          </Button>
        </div>
        <p className="mt-2 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
          <Sparkles className="size-3" />
          Asistente con IA. Verifica los cambios importantes antes de confirmarlos.
        </p>
      </div>
    </div>
  )
}
