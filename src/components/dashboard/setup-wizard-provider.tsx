"use client"

import { useState, useEffect, createContext, useContext, useCallback, type ReactNode } from "react"
import { SetupWizard } from "./setup-wizard"

interface SetupContextValue {
  isOpen: boolean
  completeStep: (step: number) => void
  close: () => void
}

const SetupContext = createContext<SetupContextValue>({
  isOpen: false,
  completeStep: () => {},
  close: () => {},
})

export function useSetupWizard() {
  return useContext(SetupContext)
}

interface Props {
  storeId: string
  negocioId: string | null
  planId: string
  planType: string
  storeSetupComplete: boolean
  children: ReactNode
}

export function SetupWizardProvider({ storeId, negocioId, planId, planType, storeSetupComplete, children }: Props) {
  const [status, setStatus] = useState<"loading" | "open" | "closed">("loading")
  const [completedSteps, setCompletedSteps] = useState<number[]>([])

  useEffect(() => {
    const stored = localStorage.getItem(`setup:${storeId}`)
    if (stored) {
      const data = JSON.parse(stored)
      setCompletedSteps(data.completed || [])
      if (data.finished) {
        setStatus("closed")
        return
      }
    }
    // Mayorista only needs name+logo (step 1)
    if (planId === "mayorista") {
      if (storeSetupComplete) {
        setStatus("closed")
        setFinished(storeId)
      } else {
        setStatus("open")
      }
      return
    }
    // Agenda / Comercio: needs steps 1-3
    if (storeSetupComplete) {
      setStatus("closed")
      setFinished(storeId)
    } else {
      setStatus("open")
    }
  }, [storeId, planId, storeSetupComplete])

  const setFinished = useCallback((sid: string) => {
    localStorage.setItem(`setup:${sid}`, JSON.stringify({ completed: [1, 2, 3], finished: true }))
  }, [])

  const completeStep = useCallback((step: number) => {
    setCompletedSteps((prev) => {
      const next = prev.includes(step) ? prev : [...prev, step]
      localStorage.setItem(`setup:${storeId}`, JSON.stringify({ completed: next, finished: false }))
      return next
    })
  }, [storeId])

  const close = useCallback(() => {
    setStatus("closed")
    localStorage.setItem(`setup:${storeId}`, JSON.stringify({ completed: completedSteps, finished: true }))
  }, [storeId, completedSteps])

  const wizardPlanType = planId === "mayorista" ? "mayorista" : planType === "agenda" ? "agenda" : "comercio"

  return (
    <SetupContext.Provider value={{ isOpen: status === "open", completeStep, close }}>
      {status === "open" && (
        <SetupWizard
          storeId={storeId}
          negocioId={negocioId}
          planType={wizardPlanType}
          completedSteps={completedSteps}
          onCompleteStep={completeStep}
          onClose={close}
        />
      )}
      {children}
    </SetupContext.Provider>
  )
}
