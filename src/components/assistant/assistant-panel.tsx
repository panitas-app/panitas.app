"use client"

import { useEffect, useRef, useState } from "react"
import { Send, Sparkles, Bot, Clock, TrendingUp, Package } from "lucide-react"

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

interface Message {
  role: "user" | "assistant"
  content: string
}

const COMING_SOON =
  "¡Hola! Soy Panitas, tu asistente inteligente. Esta vista es solo una muestra de la experiencia que viene. En la FASE 2B podré responder con tus datos reales de ventas, inventario y clientes."

export function AssistantPanel() {
  const { open, closeAssistant } = useAssistant()
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "¡Hola! Soy Panitas, tu asistente de negocios. Pregúntame sobre tus ventas, inventario o clientes. (Funcionalidad completa disponible pronto)",
    },
  ])
  const [value, setValue] = useState("")
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [open, messages])

  function handleSend(text?: string) {
    const content = (text ?? value).trim()
    if (!content) return
    setMessages((prev) => [...prev, { role: "user", content }])
    setValue("")
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: "assistant", content: COMING_SOON }])
    }, 400)
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && closeAssistant()}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
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
        </SheetHeader>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "flex",
                m.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground",
                )}
              >
                {m.content}
              </div>
            </div>
          ))}
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
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
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
            />
            <Button
              size="icon"
              onClick={() => handleSend()}
              disabled={!value.trim()}
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
