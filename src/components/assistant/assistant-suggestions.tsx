"use client"

import { motion } from "framer-motion"
import { Lightbulb, LineChart, Package, TrendingUp, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export interface AssistantSuggestion {
  icon: LucideIcon
  label: string
}

/**
 * Sugerencias compartidas del asistente (FASE 9B): un solo lugar para las
 * preguntas de arranque usadas por el home (AnimatedAIChat) y el panel flotante
 * (AssistantChatView). Evita las duplicaciones de FASE 4F/5B.
 */
export const ASSISTANT_SUGGESTIONS: AssistantSuggestion[] = [
  { icon: TrendingUp, label: "¿Cómo van mis ventas hoy?" },
  { icon: Package, label: "¿Qué producto se agotará pronto?" },
  { icon: LineChart, label: "Resumen de mi negocio" },
  { icon: Lightbulb, label: "¿Qué me recomiendas revisar?" },
]

interface AssistantSuggestionsProps {
  onSelect: (label: string) => void
  disabled?: boolean
  variant?: "home" | "panel"
  className?: string
}

export function AssistantSuggestions({ onSelect, disabled, variant = "home", className }: AssistantSuggestionsProps) {
  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-2", className)}>
      {ASSISTANT_SUGGESTIONS.map((s, index) => {
        const Icon = s.icon
        return (
          <motion.button
            key={s.label}
            type="button"
            onClick={() => onSelect(s.label)}
            disabled={disabled}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50",
              variant === "home"
                ? "hover:bg-brand-soft hover:border-primary/50"
                : "hover:bg-muted/40",
              variant === "panel" && index === 0 && "border-primary/30",
            )}
          >
            <Icon className={cn("size-4", variant === "home" && "text-brand-secondary")} />
            {s.label}
          </motion.button>
        )
      })}
    </div>
  )
}
