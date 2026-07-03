"use client"

import { useCallback } from "react"
import { useTour } from "./tour-context"
import { TourSpotlight } from "./tour-spotlight"
import { TourTooltip } from "./tour-tooltip"
import { TourCelebration } from "./tour-celebration"

export function TourOverlay() {
  const {
    isActive,
    currentStep,
    currentIndex,
    steps,
    targetRect,
    tooltipPosition,
    isCelebrating,
    next,
    prev,
    skip,
    finish,
    start,
    stop,
  } = useTour()

  const handleCompleteAndDismiss = useCallback(() => {
    fetch("/api/tour/complete", { method: "POST" }).catch(console.error)
    stop()
  }, [stop])

  const handleReplay = useCallback(() => {
    fetch("/api/tour/reset", { method: "POST" }).catch(console.error)

    const planType = document.querySelector("[data-plan-type]")?.getAttribute("data-plan-type") || "tienda"
    start(planType)
  }, [start])

  if (!isActive && !isCelebrating) return null

  return (
    <>
      {isActive && (
        <div className="fixed inset-0 z-[9997]" onClick={skip} aria-hidden="true" />
      )}

      <TourSpotlight targetRect={targetRect} isActive={isActive} />

      {isActive && currentStep && (
        <TourTooltip
          step={currentStep}
          currentIndex={currentIndex}
          totalSteps={steps.length}
          targetRect={targetRect}
          position={tooltipPosition}
          onNext={next}
          onPrev={prev}
          onSkip={skip}
          onFinish={finish}
        />
      )}

      <TourCelebration
        isOpen={isCelebrating}
        onStart={handleCompleteAndDismiss}
        onReplay={handleReplay}
      />
    </>
  )
}
