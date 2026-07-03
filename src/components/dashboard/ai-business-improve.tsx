"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface AiBusinessImproveProps {
  businessName: string
  currentDescription: string
  currentColors: string
  onApply: (data: {
    improvedDescription?: string
    slogan?: string
    recommendedColors?: { primary: string; secondary: string }
    profileTips?: string[]
  }) => void
  mode?: "improve" | "seo"
}

export function AiBusinessImprove({
  businessName,
  currentDescription,
  currentColors,
  onApply,
  mode = "improve",
}: AiBusinessImproveProps) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)

    try {
      const res = await fetch("/api/ai/business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: mode === "seo" ? "seo" : "improve",
          businessName,
          name: businessName,
          description: currentDescription,
          colors: currentColors,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Error al generar")
      }

      const result = await res.json()
      onApply(result.data)
      toast.success(mode === "seo" ? "SEO optimizado con IA" : "Perfil mejorado con IA")
    } catch (err) {
      console.error("[AiBusinessImprove]", err)
      toast.error(
        err instanceof Error
          ? err.message
          : "No pudimos generar el contenido en este momento. Inténtalo nuevamente."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={loading}
      className="gap-1.5 rounded-xl border-primary/20 text-primary hover:bg-primary/5 text-xs h-8"
    >
      {loading ? (
        <>
          <Loader2 className="size-3 animate-spin" />
          Mejorando...
        </>
      ) : (
        <>
          <Sparkles className="size-3" />
          {mode === "seo" ? "Optimizar SEO" : "Mejorar con IA"}
        </>
      )}
    </Button>
  )
}
