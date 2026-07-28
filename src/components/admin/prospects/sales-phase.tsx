"use client"

import { Button } from "@/components/ui/button"
import { SalesQuestionRenderer } from "./sales-question-renderer"
import { cn } from "@/lib/utils"
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react"

interface Question {
  id: string
  texto: string
  tipo: string
  opciones?: string | null
  requerida: boolean
  placeholder?: string | null
  condicionLogica?: string | null
  subtexto?: string | null
  maxChars?: number | null
}

interface Section {
  id: string
  nombre: string
  descripcion?: string | null
  icono?: string | null
  questions: Question[]
}

interface SalesPhaseProps {
  section: Section
  answers: Record<string, string>
  onAnswer: (questionId: string, value: string) => void
  currentIndex: number
  totalSections: number
}

export function SalesPhase({
  section,
  answers,
  onAnswer,
  currentIndex,
  totalSections,
}: SalesPhaseProps) {
  const visibleQuestions = section.questions.filter((q) => {
    if (!q.condicionLogica) return true
    try {
      const condition = JSON.parse(q.condicionLogica) as { questionId: string; value: string }
      return answers[condition.questionId] === condition.value
    } catch {
      return true
    }
  })

  const progress = ((currentIndex + 1) / totalSections) * 100

  return (
    <div className="space-y-5">
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            Fase {currentIndex + 1} de {totalSections}
          </p>
          <p className="text-sm font-medium">{section.nombre}</p>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        {section.descripcion && (
          <p className="text-sm text-muted-foreground">{section.descripcion}</p>
        )}
      </div>

      <div className="space-y-6">
        {visibleQuestions.map((question) => (
          <SalesQuestionRenderer
            key={question.id}
            question={question}
            value={answers[question.id] || ""}
            onChange={(value) => onAnswer(question.id, value)}
            allAnswers={answers}
          />
        ))}
      </div>
    </div>
  )
}

interface SalesPhaseNavProps {
  onPrev: () => void
  onNext: () => void
  isFirst: boolean
  isLast: boolean
  canAdvance: boolean
}

export function SalesPhaseNav({
  onPrev,
  onNext,
  isFirst,
  isLast,
  canAdvance,
}: SalesPhaseNavProps) {
  return (
    <div className="flex flex-col-reverse sm:flex-row gap-2 sticky bottom-0 bg-background/95 backdrop-blur-sm py-3 -mx-4 px-4 border-t sm:border-t-0 sm:mx-0 sm:px-0 sm:py-0">
      {!isFirst && (
        <Button
          variant="outline"
          onClick={onPrev}
          className="flex-1 sm:flex-none"
        >
          <ArrowLeft className="size-4" />
          Anterior
        </Button>
      )}
      <Button
        onClick={onNext}
        disabled={!canAdvance}
        className={cn("flex-1 sm:flex-none", isFirst && "sm:ml-auto")}
      >
        {isLast ? (
          <>
            <CheckCircle className="size-4" />
            Finalizar
          </>
        ) : (
          <>
            Siguiente
            <ArrowRight className="size-4" />
          </>
        )}
      </Button>
    </div>
  )
}
