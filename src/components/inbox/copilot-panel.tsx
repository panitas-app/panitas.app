"use client"

import { useCallback, useEffect, useState } from "react"
import { Bot, ExternalLink, RefreshCw, Send, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { CopilotAnalysis, CopilotQueryAnswer } from "@/lib/conversation-ai/conversation-types"
import { COPILOT_INTENT_LABELS } from "@/lib/conversation-ai/conversation-types"
import { askCopilot, getCopilotAnalysis, refreshCopilotAnalysis } from "./api"

interface CopilotPanelProps {
  conversationId: string
  onUseSuggestion: (text: string) => void
}

const SOURCE_LABEL: Record<CopilotAnalysis["source"], string> = {
  ai: "Con IA",
  heuristic: "Reglas",
}

const TONE_BADGE: Record<string, string> = {
  success: "border-emerald-300 bg-emerald-50 text-emerald-700",
  warning: "border-amber-300 bg-amber-50 text-amber-700",
  danger: "border-red-300 bg-red-50 text-red-700",
  info: "border-sky-300 bg-sky-50 text-sky-700",
  default: "border-muted bg-muted text-muted-foreground",
}

export function CopilotPanel({ conversationId, onUseSuggestion }: CopilotPanelProps) {
  const [analysis, setAnalysis] = useState<CopilotAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState<CopilotQueryAnswer | null>(null)
  const [queryLoading, setQueryLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getCopilotAnalysis(conversationId)
      setAnalysis(res.analysis)
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el copiloto")
    } finally {
      setLoading(false)
    }
  }, [conversationId])

  useEffect(() => {
    void load()
  }, [load])

  async function handleRefresh() {
    setRefreshing(true)
    setError(null)
    try {
      const res = await refreshCopilotAnalysis(conversationId)
      setAnalysis(res.analysis)
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo re-analizar")
    } finally {
      setRefreshing(false)
    }
  }

  async function handleAsk() {
    const q = question.trim()
    if (!q || queryLoading) return
    setQueryLoading(true)
    setError(null)
    try {
      const res = await askCopilot(conversationId, q)
      setAnswer(res.answer)
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo responder la consulta")
    } finally {
      setQueryLoading(false)
    }
  }

  return (
    <div className="rounded-xl border bg-muted/40 p-3 text-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
          <Bot className="size-3.5 text-primary" />
          Copiloto conversacional
        </span>
        <div className="flex items-center gap-1.5">
          {analysis && (
            <Badge variant="outline" className={cn("text-[10px]", analysis.source === "ai" ? "border-violet-300 text-violet-700" : "")}>
              {SOURCE_LABEL[analysis.source]}
            </Badge>
          )}
          <Button variant="ghost" size="icon-xs" onClick={() => void handleRefresh()} disabled={refreshing} aria-label="Reanalizar">
            <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Analizando la conversación...</p>
      ) : error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : analysis ? (
        <div className="space-y-3">
          <div>
            <p className="mb-1 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <Sparkles className="size-3" />
              Resumen
            </p>
            <p className="text-xs leading-relaxed text-foreground">{analysis.summary.text}</p>
            {analysis.summary.keyFacts.length > 0 && (
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-[11px] text-muted-foreground">
                {analysis.summary.keyFacts.map((fact, index) => (
                  <li key={index} className="truncate">
                    {fact}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {analysis.intent.intents.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {analysis.intent.intents.map((intent) => (
                <Badge key={intent} variant="outline" className="text-[10px]">
                  {COPILOT_INTENT_LABELS[intent]}
                </Badge>
              ))}
            </div>
          )}

          {analysis.suggestions.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-muted-foreground">Respuestas sugeridas</p>
              {analysis.suggestions.map((suggestion, index) => (
                <div key={index} className="rounded-lg border bg-card p-2">
                  <p className="whitespace-pre-wrap break-words text-xs">{suggestion.text}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Button size="xs" onClick={() => onUseSuggestion(suggestion.text)}>
                      Usar como borrador
                    </Button>
                    {suggestion.grounded && (
                      <span className="text-[10px] text-emerald-600">Basado en datos reales</span>
                    )}
                    {suggestion.dataSources.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">{suggestion.dataSources.join(", ")}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {analysis.actions.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground">Acciones sugeridas</p>
              {analysis.actions.map((action) => (
                <div key={action.id} className="flex items-center justify-between gap-2 rounded-lg border bg-card px-2 py-1.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{action.label}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{action.description}</p>
                  </div>
                  {action.href ? (
                    <a href={action.href} className="shrink-0">
                      <Badge variant="outline" className={cn("gap-1 text-[10px]", TONE_BADGE[action.tone] ?? TONE_BADGE.default)}>
                        Abrir <ExternalLink className="size-2.5" />
                      </Badge>
                    </a>
                  ) : (
                    <Badge variant="outline" className={cn("text-[10px]", TONE_BADGE[action.tone] ?? TONE_BADGE.default)}>
                      {action.tone}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}

          <form
            className="flex items-center gap-1.5 border-t pt-2"
            onSubmit={(e) => {
              e.preventDefault()
              void handleAsk()
            }}
          >
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Pregunta: ¿cuánto debe? ¿última compra?"
              className="h-8 min-w-0 flex-1 rounded-lg border bg-background px-2 text-xs outline-none placeholder:text-muted-foreground/70"
            />
            <Button type="submit" size="xs" disabled={queryLoading || !question.trim()} className="gap-1">
              <Send className="size-3" />
              Consultar
            </Button>
          </form>
          {answer && (
            <div className="rounded-lg border bg-card p-2 text-xs">
              <p className="whitespace-pre-wrap break-words">{answer.content}</p>
              {answer.dataSources.length > 0 && (
                <p className="mt-1 text-[10px] text-muted-foreground">{answer.dataSources.join(", ")}</p>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
