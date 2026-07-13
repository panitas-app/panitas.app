"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function TourResetButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleRestart = async () => {
    setLoading(true)
    try {
      await fetch("/api/tour/reset", { method: "POST" })
      router.push("/dashboard?tour=true")
    } catch {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleRestart}
      disabled={loading}
      className="flex items-center gap-2 rounded-xl bg-muted px-4 py-3 text-sm font-semibold text-foreground/80 shadow-xs hover:bg-muted hover:text-primary transition-all cursor-pointer disabled:opacity-50"
    >
      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 4v6h6" />
        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
      </svg>
      {loading ? "Cargando..." : "Volver a ver el tutorial"}
    </button>
  )
}
