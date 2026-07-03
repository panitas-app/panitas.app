"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles, Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { RefObject } from "react"

interface AiProductButtonProps {
  editorRef: RefObject<HTMLDivElement | null>
  onCategorySuggested: (categoryName: string) => void
}

export function AiProductButton({ editorRef, onCategorySuggested }: AiProductButtonProps) {
  const [loading, setLoading] = useState(false)
  const [thinkingText, setThinkingText] = useState<string | null>(null)

  async function handleClick() {
    const nameInput = document.querySelector<HTMLInputElement>('input[name="name"]')
    const name = nameInput?.value?.trim()

    if (!name) {
      toast.error("Escribe el nombre del producto primero")
      return
    }

    setLoading(true)
    setThinkingText("Pensando...")

    try {
      const res = await fetch("/api/ai/product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName: name }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Error al generar contenido")
      }

      const data = await res.json()
      setThinkingText("Analizando...")

      setTimeout(() => {
        setThinkingText("Generando recomendaciones...")
        fillFormFields(data.data)
        toast.success("Producto completado con IA")
        setLoading(false)
        setThinkingText(null)
      }, 600)
    } catch (err) {
      console.error("[AiProductButton]", err)
      toast.error(err instanceof Error ? err.message : "No pudimos generar el contenido. Intenta nuevamente.")
      setLoading(false)
      setThinkingText(null)
    }
  }

  function fillFormFields(data: Record<string, unknown>) {
    const setInputValue = (name: string, value: string) => {
      const input = document.querySelector<HTMLInputElement>(`input[name="${name}"]`)
      if (input) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value"
        )?.set
        nativeInputValueSetter?.call(input, value)
        input.dispatchEvent(new Event("input", { bubbles: true }))
        input.dispatchEvent(new Event("change", { bubbles: true }))
      }
    }

    // Description (WYSIWYG editor)
    if (data.description && editorRef.current) {
      editorRef.current.innerHTML = data.description as string
      editorRef.current.dispatchEvent(new Event("input", { bubbles: true }))
    }

    // Short description (if there's a field for it in the future)
    // SEO Keywords → tags input
    if (data.seoKeywords && Array.isArray(data.seoKeywords)) {
      setInputValue("tags", data.seoKeywords.slice(0, 5).join(", "))
    }

    // Tags
    if (data.tags && Array.isArray(data.tags)) {
      setInputValue("tags", (data.tags as string[]).join(", "))
    }

    // Suggested category
    if (data.suggestedCategory) {
      const categorySelect = document.querySelector<HTMLSelectElement>('select[name="categoryId"]')
      if (categorySelect) {
        const hasOption = Array.from(categorySelect.options).some(
          (opt) => opt.value === data.suggestedCategory
        )
        if (!hasOption) {
          onCategorySuggested(data.suggestedCategory as string)
        }
      }
    }

    // Meta description → could go into a meta field
    if (data.metaDescription) {
      setInputValue("metaDescription", data.metaDescription as string)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={loading}
        className="gap-1.5 rounded-xl border-primary/20 text-primary hover:bg-primary/5"
      >
        {loading ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            {thinkingText || "Procesando..."}
          </>
        ) : (
          <>
            <Sparkles className="size-3.5" />
            Completar con IA
          </>
        )}
      </Button>
    </div>
  )
}
