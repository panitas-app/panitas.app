"use client"

import { Bot, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAssistant } from "@/components/assistant/assistant-provider"
import { cn } from "@/lib/utils"

export function AssistantFab() {
  const { open, openAssistant, closeAssistant } = useAssistant()

  return (
    <div className="fixed bottom-20 right-4 z-40 lg:bottom-6 lg:right-6">
      <div className="relative">
        {!open && (
          <span className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-primary/40" />
        )}
        <Button
          size="icon-lg"
          onClick={open ? closeAssistant : openAssistant}
          aria-label={open ? "Cerrar asistente" : "Abrir asistente Panitas"}
          className={cn(
            "relative size-13 rounded-full shadow-xl shadow-primary/25 transition-transform",
            open && "rotate-90",
          )}
        >
          {open ? <X className="size-5" /> : <Bot className="size-5" />}
        </Button>
      </div>
    </div>
  )
}
