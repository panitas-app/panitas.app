"use client"

import { cn } from "@/lib/utils"
import { inferThinkingLabel } from "@/lib/conversational"

/**
 * Indicador contextual de "pensando" (FASE 5B).
 * Muestra una acción específica según lo que pidió el usuario, nunca un spinner genérico.
 */
export function ChatThinking({ message, className }: { message?: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5 text-sm text-muted-foreground", className)}>
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-primary/60" />
        <span className="relative inline-flex size-2 rounded-full bg-brand-primary" />
      </span>
      {inferThinkingLabel(message ?? "")}
    </div>
  )
}
