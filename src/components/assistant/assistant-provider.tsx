"use client"

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"

interface AssistantContextValue {
  open: boolean
  /** FASE 4C: `openAssistant(prefill?)` recibe el texto tipeado para auto-enviarlo al abrir. */
  openAssistant: (prefill?: string) => void
  closeAssistant: () => void
  toggleAssistant: () => void
  /** Mensaje pendiente por consumir (se limpia al abrir el chat). */
  prefill: string | null
  consumePrefill: () => void
}

const AssistantContext = createContext<AssistantContextValue | null>(null)

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [prefill, setPrefill] = useState<string | null>(null)

  const openAssistant = useCallback((message?: string) => {
    if (message) setPrefill(message)
    setOpen(true)
  }, [])

  const closeAssistant = useCallback(() => {
    setOpen(false)
    setPrefill(null)
  }, [])

  const toggleAssistant = useCallback(() => {
    setOpen((o) => !o)
    setPrefill(null)
  }, [])

  const consumePrefill = useCallback(() => setPrefill(null), [])

  const value = useMemo(
    () => ({ open, openAssistant, closeAssistant, toggleAssistant, prefill, consumePrefill }),
    [open, openAssistant, closeAssistant, toggleAssistant, prefill, consumePrefill],
  )

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>
}

export function useAssistant(): AssistantContextValue {
  const ctx = useContext(AssistantContext)
  if (!ctx) throw new Error("useAssistant must be used within an AssistantProvider")
  return ctx
}
