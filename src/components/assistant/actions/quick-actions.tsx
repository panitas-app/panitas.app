"use client"

import Link from "next/link"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { QuickAction } from "@/lib/conversational-actions"
import { iconByName } from "@/components/assistant/renderers/icons"

/**
 * Botones de acción rápida (FASE 5E + 9B). Cada QuickAction reenvía texto
 * semántico al asistente (prop `onSend`) — nunca tool names ni IDs internos.
 * Si la acción define `href` (deep link FASE 9B), se renderiza como enlace al
 * módulo en vez de reenviarse al chat.
 */
export function QuickActions({
  actions,
  onSend,
  size = "sm",
  className,
}: {
  actions: QuickAction[]
  onSend?: (action: QuickAction) => void
  size?: "sm" | "default"
  className?: string
}) {
  return (
    <div data-slot="assistant-quick-actions" className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {actions.map((action, i) => {
        const Icon = action.icon ? iconByName(action.icon) : null
        const content = (
          <>
            {Icon ? <Icon className="size-3.5" aria-hidden /> : null}
            {action.label}
          </>
        )
        if (action.href) {
          return (
            <Button
              key={i}
              size={size}
              variant={action.variant ?? "secondary"}
              render={<Link href={action.href} />}
              title={action.label}
              className="shrink-0"
            >
              {content}
            </Button>
          )
        }
        return (
          <Button
            key={i}
            type="button"
            size={size}
            variant={action.variant ?? "secondary"}
            title={action.confirm ? "Pedirá confirmación" : undefined}
            onClick={() => onSend?.(action)}
            className="shrink-0"
          >
            {content}
          </Button>
        )
      })}
    </div>
  )
}

export { QuickActions as QuickActionsButtons }
