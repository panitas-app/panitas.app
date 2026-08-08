"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { QuickAction } from "@/lib/conversational-actions"
import { iconByName } from "@/components/assistant/renderers/icons"

/**
 * Botones de acción rápida (FASE 5E). Cada QuickAction reenvía texto semántico
 * al asistente (prop `onSend`) — nunca tool names ni IDs internos.
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
            {Icon ? <Icon className="size-3.5" aria-hidden /> : null}
            {action.label}
          </Button>
        )
      })}
    </div>
  )
}

export { QuickActions as QuickActionsButtons }
