"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { CheckIcon } from "lucide-react"

const STEPS = [
  { num: 1, label: "Verifica" },
  { num: 2, label: "Envío" },
  { num: 3, label: "Datos" },
  { num: 4, label: "Resumen" },
  { num: 5, label: "Pago" },
]

interface CheckoutStepsProps {
  currentStep: number
}

export function CheckoutSteps({ currentStep }: CheckoutStepsProps) {
  return (
    <div className="flex items-center justify-center gap-0 sm:gap-1">
      {STEPS.map((step, i) => {
        const isCompleted = step.num < currentStep
        const isCurrent = step.num === currentStep
        return (
          <div key={step.num} className="flex items-center gap-0 sm:gap-2">
            <div className="relative flex flex-col items-center">
              <motion.div
                layout
                className={cn(
                  "relative flex size-8 items-center justify-center rounded-full text-xs font-medium transition-colors sm:size-9",
                  isCompleted && "bg-primary text-primary-foreground",
                  isCurrent && "bg-primary text-primary-foreground",
                  !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    <CheckIcon className="size-4" />
                  </motion.div>
                ) : (
                  <span>{step.num}</span>
                )}
                {isCurrent && (
                  <motion.div
                    layoutId="step-pulse"
                    className="absolute -inset-1 rounded-full border-2 border-primary"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
              </motion.div>
              <span
                className={cn(
                  "mt-1 hidden text-[10px] font-medium sm:inline",
                  isCurrent ? "text-primary" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <motion.div
                className={cn(
                  "mx-1 h-0.5 sm:w-10 w-4 rounded-full",
                  isCompleted ? "bg-primary" : "bg-border"
                )}
                animate={isCompleted ? { backgroundColor: "var(--primary)" } : {}}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
