"use client"

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react"
import type { TourStep, TourPosition } from "@/lib/tour/types"
import { getTourSteps } from "@/lib/tour/registry"

interface TourState {
  isActive: boolean
  steps: TourStep[]
  currentIndex: number
  currentStep: TourStep | null
  isComplete: boolean
  isCelebrating: boolean
  targetRect: DOMRect | null
  tooltipPosition: TourPosition
}

interface TourContextValue extends TourState {
  start: (planType: string) => void
  stop: () => void
  next: () => void
  prev: () => void
  goTo: (index: number) => void
  skip: () => void
  finish: () => void
}

const TourContext = createContext<TourContextValue | null>(null)

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext)
  if (!ctx) throw new Error("useTour must be used within TourProvider")
  return ctx
}

function getTargetRect(selector: string): DOMRect | null {
  const el = document.querySelector(selector) as HTMLElement
  if (!el) return null
  const rect = el.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) return null
  return rect
}

function scrollToElement(selector: string) {
  const el = document.querySelector(selector) as HTMLElement
  if (el) {
    const rect = el.getBoundingClientRect()
    const isVisible =
      rect.width > 0 && rect.height > 0 &&
      rect.top >= 0 && rect.left >= 0 &&
      rect.bottom <= window.innerHeight && rect.right <= window.innerWidth
    if (!isVisible) {
      el.scrollIntoView({ behavior: "auto", block: "center" })
    }
  }
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TourState>({
    isActive: false,
    steps: [],
    currentIndex: 0,
    currentStep: null,
    isComplete: false,
    isCelebrating: false,
    targetRect: null,
    tooltipPosition: "bottom",
  })

  const persistedRef = useRef(false)

  useEffect(() => {
    if (state.isComplete && !persistedRef.current) {
      persistedRef.current = true
      fetch("/api/tour/complete", { method: "POST" }).catch(console.error)
    }
  }, [state.isComplete])

  const updateTargetRect = useCallback((selector: string) => {
    const rect = getTargetRect(selector)
    if (rect) {
      setState((s) => ({ ...s, targetRect: rect }))
    }
  }, [])

  const start = useCallback((planType: string) => {
    persistedRef.current = false
    const steps = getTourSteps(planType)
    const firstStep = steps[0]
    const rect = firstStep ? getTargetRect(firstStep.selector) : null
    setState({
      isActive: true,
      steps,
      currentIndex: 0,
      currentStep: firstStep || null,
      isComplete: false,
      isCelebrating: false,
      targetRect: rect,
      tooltipPosition: firstStep?.position || "bottom",
    })
  }, [])

  const stop = useCallback(() => {
    setState((s) => ({
      ...s,
      isActive: false,
      currentIndex: 0,
      currentStep: null,
      isComplete: false,
      isCelebrating: false,
      targetRect: null,
    }))
  }, [])

  const goTo = useCallback(async (index: number) => {
    setState((s) => {
      if (index < 0 || index >= s.steps.length) return s
      const step = s.steps[index]
      scrollToElement(step.selector)
      const rect = getTargetRect(step.selector)
      return {
        ...s,
        currentIndex: index,
        currentStep: step,
        targetRect: rect,
        tooltipPosition: step.position || "bottom",
        isComplete: false,
        isCelebrating: false,
      }
    })
  }, [])

  const next = useCallback(() => {
    setState((s) => {
      let nextIndex = s.currentIndex + 1

      // Skip steps where the target doesn't exist
      while (nextIndex < s.steps.length) {
        const nextStep = s.steps[nextIndex]
        if (nextStep.selector && document.querySelector(nextStep.selector)) break
        nextIndex++
      }

      if (nextIndex >= s.steps.length) {
        return { ...s, isComplete: true, isCelebrating: true, isActive: false }
      }
      const step = s.steps[nextIndex]
      if (step.beforeEnter) step.beforeEnter()
      scrollToElement(step.selector)
      const rect = getTargetRect(step.selector)
      return {
        ...s,
        currentIndex: nextIndex,
        currentStep: step,
        targetRect: rect,
        tooltipPosition: step.position || "bottom",
      }
    })
  }, [])

  const prev = useCallback(() => {
    setState((s) => {
      if (s.currentIndex <= 0) return s
      const prevIdx = s.currentIndex - 1
      const step = s.steps[prevIdx]
      if (step.beforeEnter) step.beforeEnter()
      scrollToElement(step.selector)
      const rect = getTargetRect(step.selector)
      return {
        ...s,
        currentIndex: prevIdx,
        currentStep: step,
        targetRect: rect,
        tooltipPosition: step.position || "bottom",
      }
    })
  }, [])

  const skip = useCallback(() => { stop() }, [stop])

  const finish = useCallback(() => {
    setState((s) => ({ ...s, isComplete: true, isCelebrating: true, isActive: false }))
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!state.isActive) return
      if (e.key === "Escape") skip()
      if (e.key === "ArrowRight") next()
      if (e.key === "ArrowLeft") prev()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [state.isActive, next, prev, skip])

  useEffect(() => {
    const handleResize = () => {
      if (state.currentStep) {
        updateTargetRect(state.currentStep.selector)
      }
    }
    window.addEventListener("resize", handleResize)
    window.addEventListener("scroll", handleResize, true)
    return () => {
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("scroll", handleResize, true)
    }
  }, [state.currentStep, updateTargetRect])

  return (
    <TourContext.Provider value={{ ...state, start, stop, next, prev, goTo, skip, finish }}>
      {children}
    </TourContext.Provider>
  )
}
