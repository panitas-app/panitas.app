"use client"

import { useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  FileText,
  Paperclip,
  Pin,
  PinOff,
  Send,
  Sparkles,
  UserRound,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  INBOX_CHANNEL_META,
  INBOX_PRIORITIES,
  INBOX_STATUSES,
  INBOX_STATUS_META,
  type InboxAiActionKind,
  type InboxConversationDetail,
  type InboxMessageDTO,
} from "@/lib/inbox/conversation-types"
import { aiAction, patchConversation, sendMessage, addTag } from "./api"
import { CopilotPanel } from "./copilot-panel"

interface ConversationThreadProps {
  detail: InboxConversationDetail
  onBack: () => void
  onOpenContext: () => void
  onDataChange: () => void
  onMessageSent: (message: InboxMessageDTO) => void
}

interface AiPanelState {
  open: boolean
  loading: boolean
  action: InboxAiActionKind | null
  content: string
  suggestion?: string
  error: string | null
}

const AI_LABELS: Record<InboxAiActionKind, string> = {
  summary: "Resumir",
  intent: "Analizar intención",
  suggestion: "Sugerir respuesta",
  relevant_history: "Historial relevante",
}

function MessageBubble({ message, channelColor }: { message: InboxMessageDTO; channelColor: string }) {
  if (message.sender === "system") {
    return (
      <div className="flex justify-center">
        <div className="max-w-[80%] rounded-lg bg-muted/60 px-3 py-1.5 text-center text-[11px] text-muted-foreground">
          {message.content}
        </div>
      </div>
    )
  }
  const isAgent = message.sender === "agent"
  return (
    <div className={cn("flex", isAgent ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-xs",
          isAgent
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md border border-border bg-card",
        )}
        style={!isAgent ? { borderLeft: `3px solid ${channelColor}` } : undefined}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <div className={cn("mt-1 flex items-center gap-2", isAgent ? "text-primary-foreground/70" : "text-muted-foreground")}>
          <span className="text-[10px]">
            {new Date(message.createdAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
          </span>
          {message.attachments.length > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px]">
              <Paperclip className="size-2.5" />
              {message.attachments.length}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export function ConversationThread({
  detail,
  onBack,
  onOpenContext,
  onDataChange,
  onMessageSent,
}: ConversationThreadProps) {
  const channelMeta = INBOX_CHANNEL_META[detail.channelType] ?? INBOX_CHANNEL_META.other
  const [composer, setComposer] = useState("")
  const [attachments, setAttachments] = useState<Array<{ type: string; url: string; name?: string; size?: number }>>([])
  const [sending, setSending] = useState(false)
  const [newTag, setNewTag] = useState("")
  const [ai, setAi] = useState<AiPanelState>({ open: false, loading: false, action: null, content: "", error: null })
  const [copilotOpen, setCopilotOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const customerName = detail.customer?.name ?? detail.title
  const aiResults = useMemo(() => detail.messages.slice(-50), [detail.messages])

  async function handleSend() {
    const content = composer.trim()
    if (!content && attachments.length === 0) return
    setSending(true)
    try {
      const message = await sendMessage(detail.id, {
        sender: "agent",
        content,
        contentType: "text",
        attachments,
      })
      setComposer("")
      setAttachments([])
      onMessageSent(message)
    } catch (error) {
      console.error("[inbox] no se pudo enviar", error)
    } finally {
      setSending(false)
    }
  }

  async function handlePatch(patch: { status?: never; priority?: never; isPinned?: boolean }) {
    try {
      await patchConversation(detail.id, patch as never)
      onDataChange()
    } catch (error) {
      console.error("[inbox] no se pudo actualizar", error)
    }
  }

  async function handleStatus(status: string) {
    await handlePatch({ status: status as never })
  }

  async function handlePriority(priority: string) {
    await handlePatch({ priority: priority as never })
  }

  async function handleAddTag() {
    const name = newTag.trim()
    if (!name) return
    try {
      await addTag(detail.id, name)
      setNewTag("")
      onDataChange()
    } catch (error) {
      console.error("[inbox] no se pudo etiquetar", error)
    }
  }

  async function runAi(action: InboxAiActionKind, query?: string) {
    setAi({ open: true, loading: true, action, content: "", error: null })
    try {
      const result = await aiAction(detail.id, action, query)
      setAi({
        open: true,
        loading: false,
        action,
        content: result.content,
        suggestion:
          result.kind === "suggestion"
            ? (result.structured as { suggestion?: string } | undefined)?.suggestion ?? result.content
            : undefined,
        error: null,
      })
    } catch (error) {
      setAi({
        open: true,
        loading: false,
        action,
        content: "",
        error: error instanceof Error ? error.message : "No se pudo completar el análisis",
      })
    }
  }

  function useSuggestion() {
    if (ai.suggestion) setComposer(ai.suggestion)
    setAi((prev) => ({ ...prev, open: false }))
  }

  function useCopilotSuggestion(text: string) {
    setComposer(text)
    setCopilotOpen(false)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b p-3">
        <Button variant="ghost" size="icon-sm" onClick={onBack} className="md:hidden" aria-label="Volver a la lista">
          <ArrowLeft />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate font-semibold">{customerName}</h2>
            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: channelMeta.color }} />
            <span className="shrink-0 text-xs text-muted-foreground">{channelMeta.name}</span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="text-[10px]">
              {INBOX_STATUS_META[detail.status].label}
            </Badge>
            {detail.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={() => handlePatch({ isPinned: !detail.isPinned })} aria-label="Fijar conversación">
          {detail.isPinned ? <Pin className="text-primary" /> : <PinOff />}
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onOpenContext} className="lg:hidden" aria-label="Contexto del cliente">
          <UserRound />
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1 px-3 py-3">
        <div className="space-y-2.5">
          {aiResults.map((message) => (
            <MessageBubble key={message.id} message={message} channelColor={channelMeta.color} />
          ))}
          {aiResults.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-14 text-center text-sm text-muted-foreground">
              <Bot className="size-8" />
              <p>Esta conversación aún no tiene mensajes.</p>
              <p className="text-xs">Escribe el primer mensaje para el cliente.</p>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t p-3">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <Button
            variant="outline"
            size="xs"
            onClick={() => runAi("summary")}
            disabled={ai.loading}
            className="gap-1"
          >
            <Sparkles className="size-3" />
            {AI_LABELS.summary}
          </Button>
          <Button variant="outline" size="xs" onClick={() => runAi("intent")} disabled={ai.loading} className="gap-1">
            <Bot className="size-3" />
            {AI_LABELS.intent}
          </Button>
          <Button variant="outline" size="xs" onClick={() => runAi("suggestion")} disabled={ai.loading} className="gap-1">
            <FileText className="size-3" />
            {AI_LABELS.suggestion}
          </Button>
          <Button variant="outline" size="xs" onClick={() => runAi("relevant_history", composer.trim() || "últimos mensajes")} disabled={ai.loading}>
            {AI_LABELS.relevant_history}
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={() => setCopilotOpen((prev) => !prev)}
            className={cn("gap-1", copilotOpen && "border-primary text-primary")}
          >
            <Bot className="size-3" />
            Copiloto
          </Button>
        </div>

        {copilotOpen && (
          <div className="mb-2">
            <CopilotPanel conversationId={detail.id} onUseSuggestion={useCopilotSuggestion} />
          </div>
        )}

        {ai.open && (
          <div className="mb-2 rounded-xl border bg-muted/40 p-3 text-sm">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                <Sparkles className="size-3.5 text-primary" />
                Panitas — {ai.action ? AI_LABELS[ai.action] : ""}
              </span>
              <Button variant="ghost" size="icon-xs" onClick={() => setAi((prev) => ({ ...prev, open: false }))} aria-label="Cerrar">
                <X />
              </Button>
            </div>
            {ai.loading ? (
              <p className="text-xs text-muted-foreground">Analizando la conversación...</p>
            ) : ai.error ? (
              <p className="text-xs text-destructive">{ai.error}</p>
            ) : (
              <>
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap font-sans text-xs text-foreground">
                  {ai.content}
                </pre>
                {ai.suggestion && (
                  <div className="mt-2 flex gap-2">
                    <Button size="xs" onClick={useSuggestion}>
                      Usar como borrador
                    </Button>
                    <span className="self-center text-[11px] text-muted-foreground">
                      Panitas nunca envía automáticamente: tú decides.
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div className="mb-2 flex items-center gap-1.5">
          <Select
            value={detail.status}
            onValueChange={(value) => {
              if (value) void handleStatus(value)
            }}
          >
            <SelectTrigger size="sm" className="h-9 w-auto min-w-32">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              {INBOX_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {INBOX_STATUS_META[status].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={detail.priority}
            onValueChange={(value) => {
              if (value) void handlePriority(value)
            }}
          >
            <SelectTrigger size="sm" className="h-9 w-auto min-w-28">
              <SelectValue placeholder="Prioridad" />
            </SelectTrigger>
            <SelectContent>
              {INBOX_PRIORITIES.map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {priority}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {detail.status !== "resuelta" && (
            <Button variant="secondary" size="xs" onClick={() => handleStatus("resuelta")} className="gap-1">
              <CheckCircle2 className="size-3.5" />
              Resolver
            </Button>
          )}
        </div>

        <div className="mb-2 flex flex-wrap items-center gap-1">
          {detail.tags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
              #{tag}
            </span>
          ))}
          <form
            className="inline-flex items-center gap-1"
            onSubmit={(e) => {
              e.preventDefault()
              void handleAddTag()
            }}
          >
            <input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="+ etiqueta"
              className="h-6 w-20 rounded bg-muted px-1.5 text-[11px] outline-none placeholder:text-muted-foreground/70"
            />
          </form>
        </div>

        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {attachments.map((file, index) => (
              <span key={index} className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px]">
                <Paperclip className="size-3" />
                {file.name ?? file.type}
                <button type="button" onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== index))}>
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? [])
              setAttachments((prev) => [
                ...prev,
                ...files.map((file) => ({
                  type: file.type || "file",
                  url: URL.createObjectURL(file),
                  name: file.name,
                  size: file.size,
                })),
              ])
              e.target.value = ""
            }}
          />
          <Button variant="outline" size="icon" onClick={() => fileRef.current?.click()} aria-label="Adjuntar archivo">
            <Paperclip />
          </Button>
          <Textarea
            value={composer}
            onChange={(e) => setComposer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                void handleSend()
              }
            }}
            placeholder="Escribe una respuesta al cliente..."
            className="max-h-32 min-h-10 flex-1 resize-none"
            rows={1}
          />
          <Button onClick={() => void handleSend()} disabled={sending || (!composer.trim() && attachments.length === 0)} size="icon" aria-label="Enviar mensaje">
            <Send />
          </Button>
        </div>
      </div>
    </div>
  )
}
