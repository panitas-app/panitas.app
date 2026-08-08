"use client"

import { useState } from "react"
import { ArrowUp, Bot, CalendarCheck, Lightbulb, Package, Sparkles, TrendingUp } from "lucide-react"

import { useAssistant } from "@/components/assistant/assistant-provider"

const SUGGESTIONS = [
  { icon: TrendingUp, label: "¿Cómo van mis ventas hoy?" },
  { icon: Package, label: "¿Qué producto se agotará pronto?" },
  { icon: CalendarCheck, label: "¿Qué me recomiendas revisar?" },
  { icon: Lightbulb, label: "Resumen de mi negocio" },
]

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return "Buenos días"
  if (h < 19) return "Buenas tardes"
  return "Buenas noches"
}

/**
 * Protagonista del Panitas Home (FASE 4F): header personal + input de chat.
 * Al enviar abre el panel del asistente con el texto prefilled.
 */
export function AssistantHero({
  storeName,
  userName,
}: {
  storeName: string
  userName?: string | null
}) {
  const { openAssistant } = useAssistant()
  const [value, setValue] = useState("")
  const displayName = userName?.trim() || storeName

  function submit(text?: string) {
    const message = text?.trim() || value.trim()
    if (!message) return
    openAssistant(message)
    setValue("")
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-brand-primary/20 bg-gradient-to-br from-brand-soft via-surface to-surface p-5 shadow-sm sm:p-7">
      <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-brand-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 size-40 rounded-full bg-brand-secondary/15 blur-3xl" />

      <div className="relative">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl brand-gradient text-white shadow-lg shadow-brand-primary/30">
            <Bot className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-brand-primary">Panitas · Asistente de negocios</p>
            <h1 className="mt-0.5 font-heading text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
              {greeting()}, {displayName} 👋
            </h1>
          </div>
        </div>

        <p className="mt-3 text-sm text-muted-foreground">
          Panitas ya revisó tu negocio. <span className="font-semibold text-foreground">Pregúntale lo que necesites.</span>
        </p>

        <div className="mt-5 flex h-13 items-center gap-2 rounded-2xl border border-brand-primary/25 bg-surface px-4 shadow-sm focus-within:border-brand-primary/50 focus-within:ring-2 focus-within:ring-brand-primary/20">
          <Sparkles className="size-4 shrink-0 text-brand-primary" />
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit()
            }}
            placeholder={`Pregúntale cualquier cosa a Panitas...`}
            className="min-h-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
          />
          <button
            type="button"
            onClick={() => submit()}
            aria-label="Abrir asistente"
            className="flex size-9 shrink-0 items-center justify-center rounded-xl brand-gradient text-white shadow-md shadow-brand-primary/25 transition-transform hover:brightness-105 active:scale-95"
          >
            <ArrowUp className="size-4" />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => {
            const Icon = s.icon
            return (
              <button
                key={s.label}
                onClick={() => submit(s.label)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
              >
                <Icon className="size-3.5 text-brand-primary" />
                {s.label}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
