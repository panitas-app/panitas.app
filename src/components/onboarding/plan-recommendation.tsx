"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, ChevronDown, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { PlanInfo, QuizAnswers } from "@/lib/onboarding/types"
import { getRecommendedPlan, getPlanById, PLANS } from "@/lib/onboarding/constants"
import { track } from "@/lib/analytics/track"

interface Props {
  answers: QuizAnswers
  onSelect: (planId: string) => void
}

export function PlanRecommendation({ answers, onSelect }: Props) {
  const recommendedId = getRecommendedPlan(answers)
  const recommended = getPlanById(recommendedId)
  const [selected, setSelected] = useState(recommendedId)
  const [showAll, setShowAll] = useState(false)

  const visiblePlans = showAll ? PLANS : [recommended!]

  const handleSelect = (planId: string) => {
    setSelected(planId)
  }

  const handleContinue = () => {
    track("plan_selected", { plan: selected, recommended: selected === recommendedId })
    onSelect(selected)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <motion.div
        className="mx-auto w-full max-w-2xl rounded-2xl bg-white/95 dark:bg-slate-900/95 p-8 shadow-2xl backdrop-blur-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="mb-4"
          >
            <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-2xl">
              <Sparkles className="size-7 text-primary" />
            </span>
          </motion.div>
          <h2 className="text-2xl font-bold tracking-tight">Plan recomendado para ti</h2>
          <p className="mt-2 text-muted-foreground">
            Según tus respuestas, creemos que este plan es perfecto para empezar
          </p>
        </div>

        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {visiblePlans.map((plan, i) => {
              const isRecommended = plan.id === recommendedId
              const isSelected = selected === plan.id
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i, duration: 0.4 }}
                >
                  <button
                    onClick={() => handleSelect(plan.id)}
                    className={cn(
                      "relative w-full rounded-2xl border-2 p-6 text-left transition-all",
                      isSelected
                        ? "border-primary bg-primary/5 shadow-lg"
                        : "border-border hover:border-primary/40 hover:shadow-md"
                    )}
                  >
                    {isRecommended && (
                      <span className="absolute -top-3 right-6 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
                        <Sparkles className="size-3" />
                        Recomendado
                      </span>
                    )}
                    {plan.badge && !isRecommended && (
                      <span className="absolute -top-3 right-6 inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                        {plan.badge}
                      </span>
                    )}
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-bold">{plan.name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="text-2xl font-bold">${plan.price}</p>
                        <p className="text-xs text-muted-foreground">/mes</p>
                      </div>
                    </div>
                    {isSelected && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        className="mt-4 space-y-1.5 overflow-hidden border-t pt-4"
                      >
                        {plan.features.map((f) => (
                          <div key={f} className="flex items-center gap-2 text-sm">
                            <Check className="size-4 shrink-0 text-primary" />
                            <span>{f}</span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className={cn("size-4 transition-transform", showAll && "rotate-180")} />
            {showAll ? "Mostrar solo el recomendado" : "Ver todos los planes disponibles"}
          </button>
        </div>

        <div className="mt-8 text-center">
          <p className="mb-4 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">14 días gratis</span> · Sin tarjeta de crédito · Cancela cuando quieras
          </p>
          <Button
            size="lg"
            className="h-14 w-full max-w-sm rounded-xl text-base font-semibold shadow-lg"
            onClick={handleContinue}
          >
            Continuar con {getPlanById(selected)?.name}
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
