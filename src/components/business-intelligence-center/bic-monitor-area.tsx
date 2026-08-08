"use client"

import { useState } from "react"
import { ListChecks, MessageSquareText } from "lucide-react"

import { BusinessMonitorSection } from "@/components/assistant/business-monitor-section"
import { Button } from "@/components/ui/button"
import { useAssistant } from "@/components/assistant/assistant-provider"
import { useBcvRate } from "@/lib/bcv-context"

/**
 * Área Monitor del Business Intelligence Center (FASE 5A).
 *
 * Protagonista: resumen conversacional de Panitas con máximo 3 hallazgos,
 * botón "Ver detalles" (expande todos) y "Preguntar a Panitas" (abre el chat
 * del agente con una pregunta pre-cargada).
 */
export function BicMonitorArea() {
  const { showBolivares } = useBcvRate()
  const { openAssistant } = useAssistant()
  const [showAll, setShowAll] = useState(false)

  return (
    <div className="space-y-4">
      <BusinessMonitorSection
        currency={showBolivares ? "Bs" : "USD"}
        maxInsights={showAll ? undefined : 3}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAll((v) => !v)}>
              <ListChecks className="size-3.5" />
              {showAll ? "Ver menos" : "Ver detalles"}
            </Button>
            <Button
              size="sm"
              onClick={() =>
                openAssistant("¿Cómo está mi negocio? Cuéntame lo más importante y qué debería revisar.")
              }
            >
              <MessageSquareText className="size-3.5" />
              Preguntar a Panitas
            </Button>
          </div>
        }
      />
    </div>
  )
}
