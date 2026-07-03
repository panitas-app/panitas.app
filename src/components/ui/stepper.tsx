import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface Step {
  label: string
  description?: string
}

interface StepperProps {
  steps: Step[]
  currentStep: number
  className?: string
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <div className={cn("flex items-center justify-center gap-0 sm:gap-1", className)}>
      {steps.map((step, i) => {
        const isCompleted = i < currentStep - 1
        const isCurrent = i === currentStep - 1
        return (
          <div key={i} className="flex items-center gap-0 sm:gap-2">
            <div className="relative flex flex-col items-center">
              <div
                className={cn(
                  "relative flex size-8 items-center justify-center rounded-full text-xs font-medium transition-colors sm:size-9",
                  isCompleted && "bg-primary text-primary-foreground",
                  isCurrent && "bg-primary text-primary-foreground ring-2 ring-primary/30",
                  !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="size-4" />
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              <span
                className={cn(
                  "mt-1 hidden text-[10px] font-medium sm:inline",
                  isCurrent ? "text-primary font-semibold" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "mx-1 h-0.5 sm:w-10 w-4 rounded-full transition-colors",
                  isCompleted ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
