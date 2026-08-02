"use client"

import { useState } from "react"
import { ArrowUp, Sparkles } from "lucide-react"

import { useAssistant } from "@/components/assistant/assistant-provider"

export function AskPanitas() {
  const { openAssistant } = useAssistant()
  const [value, setValue] = useState("")

  function handleSubmit() {
    openAssistant()
    setValue("")
  }

  return (
    <div className="flex h-12 w-full items-center gap-2 rounded-2xl border border-primary/20 bg-primary/[0.04] px-3.5 backdrop-blur-xl transition-colors focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20">
      <Sparkles className="size-4 shrink-0 text-brand" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit()
        }}
        placeholder="Pregúntale a Panitas…"
        className="min-h-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
      />
      <button
        type="button"
        onClick={handleSubmit}
        aria-label="Abrir asistente"
        className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform hover:bg-primary/90 active:scale-95"
      >
        <ArrowUp className="size-4" />
      </button>
    </div>
  )
}
