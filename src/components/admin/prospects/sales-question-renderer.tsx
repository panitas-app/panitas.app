"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { AlertCircle } from "lucide-react"

interface SalesQuestion {
  id: string
  texto: string
  subtexto?: string | null
  tipo: string
  opciones?: string | null
  requerida: boolean
  placeholder?: string | null
  condicionLogica?: string | null
  maxChars?: number | null
}

interface SalesQuestionRendererProps {
  question: SalesQuestion
  value: string
  onChange: (value: string) => void
  allAnswers?: Record<string, string>
}

function parseCondition(condicionLogica: string | null | undefined, allAnswers?: Record<string, string>): boolean {
  if (!condicionLogica || !allAnswers) return true
  try {
    const condition = JSON.parse(condicionLogica) as { questionId: string; value: string }
    const answer = allAnswers[condition.questionId]
    if (answer === undefined) return false
    return answer === condition.value
  } catch {
    return true
  }
}

export function SalesQuestionRenderer({
  question,
  value,
  onChange,
  allAnswers,
}: SalesQuestionRendererProps) {
  if (!parseCondition(question.condicionLogica, allAnswers)) return null

  let options: string[] = []
  if (question.opciones) {
    try {
      options = JSON.parse(question.opciones)
    } catch {
      options = []
    }
  }

  const isYesNo =
    options.length === 2 &&
    options.every((o) => ["si", "no", "sí"].includes(o.toLowerCase()))

  return (
    <div className="space-y-2.5">
      <div className="space-y-1">
        <Label className="text-base font-medium leading-snug flex items-start gap-1.5">
          {question.texto}
          {question.requerida && <span className="text-destructive">*</span>}
        </Label>
        {question.subtexto && (
          <p className="text-sm text-muted-foreground">{question.subtexto}</p>
        )}
      </div>

      {question.tipo === "radio" && isYesNo && (
        <div className="grid grid-cols-2 gap-3">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={cn(
                "min-h-[48px] rounded-xl border-2 px-4 py-3 text-base font-medium transition-all",
                value.toLowerCase() === option.toLowerCase()
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-background hover:border-primary/50 hover:bg-muted/50"
              )}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {question.tipo === "radio" && !isYesNo && (
        <div className="grid grid-cols-2 sm:grid-cols-auto gap-2.5">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={cn(
                "min-h-[48px] rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all text-left sm:text-center",
                value === option
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-background hover:border-primary/50 hover:bg-muted/50"
              )}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {question.tipo === "text" && (
        <Input
          value={value}
          onChange={(e) => {
            if (question.maxChars && e.target.value.length > question.maxChars) return
            onChange(e.target.value)
          }}
          placeholder={question.placeholder || "Escribe tu respuesta..."}
          className="h-12 text-base"
        />
      )}

      {question.tipo === "number" && (
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder || "0"}
          min={0}
          className="h-12 text-base"
        />
      )}

      {question.tipo === "checklist" && (
        <div className="space-y-2">
          {options.map((option) => {
            const selected = value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
            const isChecked = selected.includes(option)

            return (
              <label
                key={option}
                className={cn(
                  "flex items-center gap-3 min-h-[48px] rounded-xl border-2 px-4 py-3 transition-all cursor-pointer",
                  isChecked
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={(checked) => {
                    const current = value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                    if (checked) {
                      onChange([...current, option].join(", "))
                    } else {
                      onChange(current.filter((s) => s !== option).join(", "))
                    }
                  }}
                />
                <span className="text-sm font-medium">{option}</span>
              </label>
            )
          })}
        </div>
      )}

      {value && question.maxChars && question.tipo === "text" && (
        <p className="text-xs text-muted-foreground text-right">
          {value.length}/{question.maxChars}
        </p>
      )}
    </div>
  )
}
