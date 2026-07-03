"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Store, MapPin, Phone, FileText, ArrowRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { BusinessConfig } from "@/lib/onboarding/types"
import { OnboardingProgress } from "./progress-bar"
import { track } from "@/lib/analytics/track"
import { COUNTRIES, VENEZUELA_STATES } from "@/lib/locations"
import { PhoneInput } from "@/components/ui/phone-input"

interface Props {
  config: BusinessConfig
  planName: string
  onComplete: (config: BusinessConfig) => void
  onSave: (config: BusinessConfig) => void
}

type StepId = "name" | "location" | "whatsapp" | "description"

interface StepDef {
  key: StepId
  title: string
  placeholder: string
  icon: React.ComponentType<{ className?: string }>
  validate: (v: string) => string | null
}

const STEPS: StepDef[] = [
  {
    key: "name",
    title: "¿Cómo se llama tu negocio?",
    placeholder: "Ej: Heladería La Especial",
    icon: Store,
    validate: (v: string) => v.length >= 2 ? null : "Mínimo 2 caracteres",
  },
  {
    key: "location",
    title: "¿Dónde está ubicado?",
    placeholder: "País, estado y ciudad",
    icon: MapPin,
    validate: (v: string) => v.length >= 2 ? null : "Indica al menos el país",
  },
  {
    key: "whatsapp",
    title: "¿Cuál es tu WhatsApp?",
    placeholder: "Ej: +58 412 123 4567",
    icon: Phone,
    validate: (_v: string) => null,
  },
  {
    key: "description",
    title: "Cuéntanos sobre tu negocio",
    placeholder: "Describe brevemente qué ofreces...",
    icon: FileText,
    validate: (_v: string) => null,
  },
]

export function BusinessConfigSteps({ config, planName, onComplete, onSave }: Props) {
  const [step, setStep] = useState(0)
  const [data, setData] = useState<BusinessConfig>(config)
  const [direction, setDirection] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const currentStep = STEPS[step]
  const fieldValue = currentStep.key === "location"
    ? [data.pais, data.estado, data.municipio, data.direccion].filter(Boolean).join(", ")
    : String(data[currentStep.key as keyof BusinessConfig] ?? "")

  const updateField = useCallback(
    (key: StepId, value: string) => {
      const updated = { ...data }
      if (key === "location") {
        updated.pais = value
      } else {
        (updated as any)[key] = value
      }
      setData(updated)
      onSave(updated)
    },
    [data, onSave]
  )

  const handleNext = () => {
    if (currentStep) {
      if (currentStep.key === "location") {
        if (!data.pais) { setError("Selecciona un país"); return }
        if (!data.direccion?.trim()) { setError("La dirección es obligatoria"); return }
      } else {
        const err = currentStep.validate(fieldValue)
        if (err) { setError(err); return }
      }
    }
    setError(null)
    track("config_step_completed", { step: currentStep.key })
    if (step < STEPS.length - 1) {
      setDirection(1)
      setStep((s) => s + 1)
    } else {
      onComplete(data)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <OnboardingProgress current={step} total={STEPS.length} />

      <div className="flex flex-1 items-center justify-center px-6 py-20">
        <div className="w-full max-w-md rounded-2xl bg-white/95 dark:bg-slate-900/95 p-8 shadow-2xl backdrop-blur-md overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep.key}
              custom={direction}
              initial={{ opacity: 0, x: direction * 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -direction * 60 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="space-y-6"
            >
              <div className="text-center">
                <span className="mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-primary/10">
                  <currentStep.icon className="size-7 text-primary" />
                </span>
                <h2 className="mt-4 text-2xl font-bold tracking-tight">{currentStep.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Plan: {planName}
                </p>
              </div>

              {currentStep.key === "name" && (
                <div className="space-y-2">
                  <Input
                    value={fieldValue}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder={currentStep.placeholder}
                    className="h-14 text-center text-lg"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleNext()}
                  />
                  {error && <p className="text-center text-sm text-destructive">{error}</p>}
                </div>
              )}

              {currentStep.key === "location" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>País</Label>
                    <Select
                      value={data.pais || ""}
                      onValueChange={(v) => setData({ ...data, pais: v ?? "", estado: "" })}
                    >
                      <SelectTrigger className="h-12 w-full rounded-xl border-slate-200 bg-white">
                        <SelectValue placeholder="Selecciona tu país" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {COUNTRIES.map((c) => (
                          <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Estado</Label>
                    {data.pais === "Venezuela" ? (
                      <Select
                        value={data.estado || ""}
                        onValueChange={(v) => setData({ ...data, estado: v ?? "" })}
                      >
                        <SelectTrigger className="h-12 w-full rounded-xl border-slate-200 bg-white">
                          <SelectValue placeholder="Selecciona un estado" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {VENEZUELA_STATES.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={data.estado || ""}
                        onChange={(e) => setData({ ...data, estado: e.target.value })}
                        placeholder={data.pais ? "Escribe el estado o región" : "Primero selecciona un país"}
                        className="h-12 w-full rounded-xl border-slate-200 bg-white"
                        disabled={!data.pais}
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Municipio / Ciudad</Label>
                    <Input
                      value={data.municipio || ""}
                      onChange={(e) => setData({ ...data, municipio: e.target.value })}
                      placeholder="Ej: Baruta, Chacao, Libertador"
                      className="h-12 w-full rounded-xl border-slate-200 bg-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Dirección</Label>
                    <Input
                      value={data.direccion || ""}
                      onChange={(e) => setData({ ...data, direccion: e.target.value })}
                      placeholder="Calle, número, referencia"
                      className="h-12 w-full rounded-xl border-slate-200 bg-white"
                    />
                  </div>

                  {error && <p className="text-center text-sm text-destructive">{error}</p>}
                </div>
              )}

              {currentStep.key === "whatsapp" && (
                <div className="space-y-2">
                  <PhoneInput
                    value={fieldValue}
                    onChange={(v) => updateField("whatsapp", v)}
                    autoFocus
                    onEnter={handleNext}
                  />
                  <p className="text-center text-xs text-muted-foreground">
                    Tus clientes te escribirán aquí
                  </p>
                </div>
              )}

              {currentStep.key === "description" && (
                <div className="space-y-2">
                  <Textarea
                    value={fieldValue}
                    onChange={(e) => updateField("description", e.target.value)}
                    placeholder={currentStep.placeholder}
                    className="min-h-[120px] resize-none text-center"
                    autoFocus
                  />
                  <p className="text-center text-xs text-muted-foreground">
                    Opcional — puedes editarlo después
                  </p>
                </div>
              )}

              <div className="pt-4 text-center">
                <Button
                  size="lg"
                  className="h-14 w-full max-w-xs rounded-xl text-base font-semibold shadow-lg"
                  onClick={handleNext}
                >
                  {step < STEPS.length - 1 ? (
                    <>Continuar <ArrowRight className="ml-2 size-4" /></>
                  ) : (
                    <>Listo <Check className="ml-2 size-4" /></>
                  )}
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
