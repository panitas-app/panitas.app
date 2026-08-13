"use client"

import { useCallback, useEffect, useState } from "react"

const SIDEBAR_KEY = "panitas:sidebar:collapsed"

/**
 * FASE 9B: preferencia de colapso del sidebar, compartida por todos los shells
 * (DashboardShell y ImmersiveChatShell) para que colapsar en un lugar se
 * recuerde en el otro. Sustituye a las dos claves separadas de FASE 4F.
 */
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      try {
        setCollapsed(localStorage.getItem(SIDEBAR_KEY) === "1")
      } catch {}
    })
    return () => cancelAnimationFrame(id)
  }, [])

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0")
      } catch {}
      return next
    })
  }, [])

  return { collapsed, toggleCollapsed }
}
