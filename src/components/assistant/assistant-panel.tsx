"use client"

import { useEffect } from "react"
import { Plus, Trash2, Bot, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { useAssistant } from "@/components/assistant/assistant-provider"
import { AssistantChatView } from "@/components/assistant/assistant-chat-view"
import { useAssistantChat } from "@/hooks/use-assistant-chat"
import { cn } from "@/lib/utils"

export function AssistantPanel() {
  const { open, closeAssistant, prefill, consumePrefill } = useAssistant()
  const chat = useAssistantChat()

  // FASE 4C: si llegó un prefill (p.ej. desde "Pregúntale a Panitas…"), se envía automáticamente.
  useEffect(() => {
    if (open && prefill) {
      const message = prefill
      consumePrefill()
      chat.handleSend(message)
    }
  }, [open, prefill, consumePrefill, chat])

  return (
    <Sheet open={open} onOpenChange={(v) => !v && closeAssistant()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border/60 px-5 pb-4 pt-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Bot className="size-5" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="font-heading text-base font-bold">Panitas</SheetTitle>
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
              onClick={chat.startNewConversation}
              className="h-8 gap-1 text-xs"
            >
              <Plus className="size-3.5" /> Nueva
            </Button>
            {chat.activeConversationId && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => chat.deleteConversation(chat.activeConversationId!)}
                className="h-8 gap-1 text-xs text-destructive hover:text-destructive"
              >
                <Trash2 className="size-3.5" /> Borrar
              </Button>
            )}
            <div className="ml-auto flex max-w-[55%] gap-1 overflow-x-auto scrollbar-none">
              {chat.conversations.slice(0, 6).map((c) => (
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
                  {c.title.length > 18 ? `${c.title.slice(0, 18)}…` : c.title}
                </button>
              ))}
            </div>
          </div>
        </SheetHeader>

        <AssistantChatView chat={chat} />
      </SheetContent>
    </Sheet>
  )
}
