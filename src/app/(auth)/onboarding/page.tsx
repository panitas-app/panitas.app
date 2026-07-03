"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import type {
  OnboardingStep,
  QuizAnswers,
  BusinessConfig,
  OnboardingProgress,
} from "@/lib/onboarding/types"
import { getRecommendedPlan, getPlanById } from "@/lib/onboarding/constants"
import { track } from "@/lib/analytics/track"
import { toast } from "sonner"
import { WelcomeScreen } from "@/components/onboarding/welcome-screen"
import { QuizStep } from "@/components/onboarding/quiz-step"
import { PlanRecommendation } from "@/components/onboarding/plan-recommendation"
import { BusinessConfigSteps } from "@/components/onboarding/business-config-steps"
import { AiPreparingScreen } from "@/components/onboarding/ai-preparing-screen"
import { CelebrationScreen } from "@/components/onboarding/celebration-screen"

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<OnboardingStep>("welcome")
  const [answers, setAnswers] = useState<QuizAnswers>({})
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [businessConfig, setBusinessConfig] = useState<BusinessConfig>({ name: "" })
  const [negocioId, setNegocioId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProgress() {
      try {
        const res = await fetch("/api/onboarding/progress")
        if (res.ok) {
          const data: OnboardingProgress | null = await res.json()
          if (data && !data.completed) {
            if (data.step) setStep(data.step)
            if (data.answers) setAnswers(data.answers)
            if (data.selectedPlan) setSelectedPlan(data.selectedPlan)
            if (data.businessConfig) setBusinessConfig(data.businessConfig)
          }
        }
      } catch {}
      setLoading(false)
    }
    loadProgress()
  }, [])

  const saveProgress = useCallback(
    async (updates: Partial<OnboardingProgress>) => {
      const payload: Partial<OnboardingProgress> = {
        step,
        answers,
        selectedPlan,
        businessConfig,
        ...updates,
      }
      try {
        await fetch("/api/onboarding/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } catch {}
    },
    [step, answers, selectedPlan, businessConfig]
  )

  const handleQuizComplete = useCallback(
    (quizAnswers: QuizAnswers) => {
      setAnswers(quizAnswers)
      track("quiz_completed", { answers: quizAnswers })
      const plan = getRecommendedPlan(quizAnswers)
      setSelectedPlan(plan)
      track("plan_recommended", { plan })
      setStep("plan")
      saveProgress({ step: "plan", answers: quizAnswers, selectedPlan: plan })
    },
    [saveProgress]
  )

  const handleQuizSave = useCallback(
    (quizAnswers: QuizAnswers) => {
      setAnswers(quizAnswers)
      saveProgress({ answers: quizAnswers })
    },
    [saveProgress]
  )

  const handlePlanSelect = useCallback(
    (planId: string) => {
      setSelectedPlan(planId)
      setStep("config")
      saveProgress({ step: "config", selectedPlan: planId })
    },
    [saveProgress]
  )

  const handleConfigSave = useCallback(
    (config: BusinessConfig) => {
      setBusinessConfig(config)
      saveProgress({ businessConfig: config })
    },
    [saveProgress]
  )

  const handleConfigComplete = useCallback(
    async (config: BusinessConfig) => {
      track("config_completed", { config })
      setBusinessConfig(config)

      sessionStorage.setItem(
        "onboarding_business",
        JSON.stringify({
          businessName: config.name,
          storeType: answers?.storeType || "tienda",
          description: config.description,
          location: [config.pais, config.estado, config.municipio]
            .filter(Boolean)
            .join(", "),
        })
      )

      try {
        const res = await fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planId: selectedPlan,
            name: config.name,
            description: config.description,
            whatsapp: config.whatsapp,
            pais: config.pais,
            estado: config.estado,
            municipio: config.municipio,
            direccion: config.direccion,
          }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Error del servidor" }))
          if (res.status === 409) {
            setStep("celebration")
            return
          }
          toast.error(err.error || "Error al crear tu negocio. Intenta de nuevo.")
          return
        }

        const result = await res.json()
        setNegocioId(result.negocioId)
        track("business_created", { negocioId: result.negocioId })
      } catch {
        track("business_created", { fallback: true })
        return
      }

      setStep("ai")
      saveProgress({ step: "ai", businessConfig: config })
    },
    [selectedPlan, saveProgress, answers]
  )

  const handleAiComplete = useCallback(() => {
    setStep("celebration")
    saveProgress({ step: "celebration" })
  }, [saveProgress])

  const handleFinish = useCallback(() => {
    track("dashboard_loaded")
    saveProgress({ completed: true })
    router.push("/dashboard?tour=true")
  }, [router, saveProgress])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-[#0A1628] via-[#0F2240] to-[#102A43] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent pointer-events-none" />
      <div className="relative z-10">
      {/* Welcome */}
      {step === "welcome" && (
        <WelcomeScreen
          onStart={() => {
            setStep("quiz")
            track("quiz_started")
            saveProgress({ step: "quiz" })
          }}
        />
      )}

      {/* Quiz */}
      {step === "quiz" && (
        <QuizStep
          answers={answers}
          onComplete={handleQuizComplete}
          onSave={handleQuizSave}
        />
      )}

      {/* Plan recommendation */}
      {step === "plan" && selectedPlan && (
        <PlanRecommendation
          answers={answers}
          onSelect={handlePlanSelect}
        />
      )}

      {/* Business config */}
      {step === "config" && selectedPlan && (
        <BusinessConfigSteps
          config={businessConfig}
          planName={getPlanById(selectedPlan)?.name || selectedPlan}
          onComplete={handleConfigComplete}
          onSave={handleConfigSave}
        />
      )}

      {/* AI preparing */}
      {step === "ai" && (
        <AiPreparingScreen
          negocioId={negocioId || ""}
          onComplete={handleAiComplete}
        />
      )}

      {/* Celebration */}
      {step === "celebration" && (
        <CelebrationScreen
          businessName={businessConfig.name || "Tu negocio"}
          planName={selectedPlan || "Emprendedor"}
          storeUrl={`panitas.app/${businessConfig.name?.toLowerCase().replace(/\s+/g, "") || "tutienda"}`}
          onFinish={handleFinish}
        />
      )}
    </div>
    </div>
  )
}
