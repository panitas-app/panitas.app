"use client"

import { usePathname } from "next/navigation"
import { AssistantFab } from "@/components/assistant/assistant-fab"
import { AssistantPanel } from "@/components/assistant/assistant-panel"

const ASSISTANT_PAGE = "/dashboard/assistant"

/**
 * FASE 4C: el FAB y el Sheet se ocultan en la página dedicada del asistente
 * (ahí la interfaz principal ya está montada a ancho completo).
 */
export function AssistantDashboardChrome() {
  const pathname = usePathname()
  if (pathname === ASSISTANT_PAGE) return null
  return (
    <>
      <AssistantFab />
      <AssistantPanel />
    </>
  )
}
