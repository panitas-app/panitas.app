"use client"

import { usePathname } from "next/navigation"
import { AssistantFab } from "@/components/assistant/assistant-fab"
import { AssistantPanel } from "@/components/assistant/assistant-panel"

const ASSISTANT_PAGES = ["/dashboard", "/dashboard/assistant"]

/**
 * FASE 4C: el FAB y el Sheet se ocultan en la página dedicada del asistente
 * y en el home del dashboard (ahí el chat principal ya está montado a ancho completo).
 */
export function AssistantDashboardChrome() {
  const pathname = usePathname()
  if (ASSISTANT_PAGES.includes(pathname)) return null
  return (
    <>
      <AssistantFab />
      <AssistantPanel />
    </>
  )
}
