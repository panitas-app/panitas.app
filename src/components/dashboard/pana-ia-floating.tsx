"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sparkles, X, SendHorizonal, Loader2, Bot, MessageSquare } from "lucide-react"
import { toast } from "sonner"

interface Message {
  role: "user" | "assistant"
  content: string
  suggestions?: string[]
}

interface PanaIaFloatingProps {
  businessName: string
  storeType: string
}

export function PanaIaFloating({ businessName, storeType }: PanaIaFloatingProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `¡Hola! Soy **Pana IA**, tu asistente inteligente. ¿En qué puedo ayudarte hoy?`,
      suggestions: [
        "¿Cómo puedo vender más?",
        "Resume mis ventas",
        "Analiza mi negocio",
        "¿Qué promociones puedo hacer?",
      ],
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [thinkingText, setThinkingText] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, thinkingText])

  async function handleSend(text: string) {
    if (!text.trim() || loading) return

    const userMessage = text.trim()
    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: userMessage }])
    setLoading(true)
    setThinkingText("Pensando...")

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          businessName,
          storeType,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Error al procesar mensaje")
      }

      setThinkingText("Analizando...")
      await new Promise((r) => setTimeout(r, 400))

      const result = await res.json()
      setThinkingText("Generando recomendaciones...")
      await new Promise((r) => setTimeout(r, 300))

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result.data.answer,
          suggestions: result.data.suggestions,
        },
      ])
    } catch (err) {
      console.error("[PanaIA Error]", err)
      toast.error("No pudimos procesar tu mensaje. Intenta nuevamente.")
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Lo siento, tuve un problema al procesar tu mensaje. ¿Puedes intentarlo de nuevo?",
        },
      ])
    } finally {
      setLoading(false)
      setThinkingText(null)
    }
  }

  function handleSuggestionClick(suggestion: string) {
    handleSend(suggestion)
  }

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all cursor-pointer"
            style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}
          >
            <Bot className="size-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 flex w-[380px] max-w-[calc(100vw-2rem)] flex-col rounded-2xl border bg-background shadow-2xl"
            style={{ height: "min(600px, calc(100vh - 80px))", boxShadow: "0 8px 40px rgba(0,0,0,0.12)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between rounded-t-2xl border-b bg-primary/5 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                  <Sparkles className="size-4 text-primary" />
                </span>
                <div>
                  <p className="text-sm font-bold">Pana IA</p>
                  <p className="text-[10px] text-muted-foreground">Asistente inteligente</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="size-8 rounded-lg"
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted/50 text-foreground rounded-bl-md"
                    }`}
                  >
                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: msg.content }} />
                    {msg.suggestions && msg.suggestions.length > 0 && msg.role === "assistant" && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {msg.suggestions.map((s, j) => (
                          <button
                            key={j}
                            type="button"
                            onClick={() => handleSuggestionClick(s)}
                            className="rounded-full bg-background/80 px-2.5 py-1 text-[10px] font-medium text-primary hover:bg-primary/10 transition-colors border border-primary/20"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {thinkingText && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-muted/50 px-4 py-2.5 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Loader2 className="size-3.5 animate-spin" />
                      <span className="text-xs">{thinkingText}</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t p-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSend(input)
                }}
                className="flex items-center gap-2"
              >
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Escribe tu mensaje..."
                  disabled={loading}
                  className="flex-1 rounded-xl border-slate-200 bg-muted/30 text-sm h-10"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || loading}
                  className="size-10 shrink-0 rounded-xl"
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <SendHorizonal className="size-4" />
                  )}
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
