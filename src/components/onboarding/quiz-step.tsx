"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { QuizQuestion, QuizAnswers } from "@/lib/onboarding/types"
import { getActiveQuestions } from "@/lib/onboarding/constants"
import { OnboardingProgress } from "./progress-bar"
import { QuizOptionCard } from "./quiz-question"

interface Props {
  answers: QuizAnswers
  onComplete: (answers: QuizAnswers) => void
  onSave: (answers: QuizAnswers) => void
}

export function QuizStep({ answers, onComplete, onSave }: Props) {
  const [currentAnswers, setCurrentAnswers] = useState<QuizAnswers>(answers)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [direction, setDirection] = useState(0)

  const activeQuestions = getActiveQuestions(currentAnswers)
  const totalQuestions = activeQuestions.length
  const question = activeQuestions[currentIdx] as QuizQuestion | undefined
  const selectedValue = question ? currentAnswers[question.id as keyof QuizAnswers] : undefined

  const saveProgress = useCallback(
    (updated: QuizAnswers) => {
      onSave(updated)
    },
    [onSave]
  )

  const handleSelect = useCallback(
    (value: string) => {
      if (!question) return
      const updated = { ...currentAnswers, [question.id]: value }
      setCurrentAnswers(updated)
      saveProgress(updated)

      setTimeout(() => {
        if (currentIdx < totalQuestions - 1) {
          setDirection(1)
          setCurrentIdx((i) => i + 1)
        } else {
          onComplete(updated)
        }
      }, 400)
    },
    [question, currentAnswers, currentIdx, totalQuestions, onComplete, saveProgress]
  )

  useEffect(() => {
    setCurrentAnswers(answers)
  }, [answers])

  if (!question) return null

  return (
    <div className="flex min-h-screen flex-col">
      <OnboardingProgress current={currentIdx} total={totalQuestions} />

      <div className="flex flex-1 items-center justify-center px-6 py-20">
        <div className="w-full max-w-lg rounded-2xl bg-white/95 dark:bg-slate-900/95 p-8 shadow-2xl backdrop-blur-md overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={question.id}
              custom={direction}
              initial={{ opacity: 0, x: direction * 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -direction * 60 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
            >
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-bold tracking-tight">{question.title}</h2>
                {question.subtitle && (
                  <p className="mt-2 text-muted-foreground">{question.subtitle}</p>
                )}
              </div>

              <div className="space-y-3">
                {question.options.map((opt) => (
                  <QuizOptionCard
                    key={opt.value}
                    {...opt}
                    selected={selectedValue === opt.value}
                    onSelect={() => handleSelect(opt.value)}
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
