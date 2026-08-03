"use client"

import { ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ConfirmationActionView } from "@/hooks/use-assistant-chat"

/**
 * Tarjeta de confirmación de acciones destructivas (FASE 4C).
 * Renderiza las acciones que requieren aprobación y permite confirmarlas
 * (segunda vuelta con `confirmedStepIds`) o cancelarlas.
 */
export function ConfirmationCard({
  actions,
  onConfirm,
  onCancel,
  busy,
}: {
  actions: ConfirmationActionView[]
  onConfirm: () => void
  onCancel: () => void
  busy: boolean
}) {
  return (
    <div className="w-full rounded-2xl border border-amber-400/40 bg-amber-50/60 p-4 text-sm dark:bg-amber-950/20">
      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <ShieldAlert className="size-4 text-amber-600" />
        Se requiere tu confirmación
      </p>
      <p className="mt-1 text-xs text-muted-foreground">Vas a realizar esta acción sobre tu negocio:</p>
      <ul className="mt-3 space-y-2.5">
        {actions.map((action) => (
          <li key={action.stepId} className="rounded-xl border border-border/60 bg-background/70 p-3">
            <p className="text-sm font-medium text-foreground">{action.description}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{action.impact}</p>
            <p className="mt-1.5 inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {action.tool}
            </p>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center gap-2">
        <Button size="sm" onClick={onConfirm} disabled={busy} className="gap-1.5">
          Confirmar
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
