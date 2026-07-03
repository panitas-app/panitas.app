"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Check, ArrowRight, Store, Calendar, Sparkles, ChevronRight } from "lucide-react"
import { PLAN_DEFINITIONS, type PlanId, type Modalidad } from "@/lib/plans"

interface PlanSelectorProps {
  onSelect: (planId: PlanId, modalidad: Modalidad | null) => void
  loading?: boolean
}

export function PlanSelector({ onSelect, loading }: PlanSelectorProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null)
  const [selectedModalidad, setSelectedModalidad] = useState<Modalidad | null>(null)

  const planes = Object.values(PLAN_DEFINITIONS).filter((p) => p.activo)

  function handlePlanClick(planId: PlanId) {
    const plan = PLAN_DEFINITIONS[planId]
    setSelectedPlan(planId)
    if (!plan.requiresSelection) {
      // Negocio o Empresarial: no pregunta modalidad
      setSelectedModalidad(null)
    } else {
      // Básico: resetear modalidad al cambiar plan
      setSelectedModalidad(null)
    }
  }

  function handleConfirm() {
    if (!selectedPlan) return
    const plan = PLAN_DEFINITIONS[selectedPlan]
    if (plan.requiresSelection && !selectedModalidad) return
    onSelect(selectedPlan, plan.requiresSelection ? selectedModalidad : null)
  }

  const selectedPlanDef = selectedPlan ? PLAN_DEFINITIONS[selectedPlan] : null
  const canConfirm = selectedPlan && (!selectedPlanDef?.requiresSelection || selectedModalidad)

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary px-3.5 py-1 mb-3">
          <Sparkles className="mr-1 size-3.5" />
          Elige tu plan
        </Badge>
        <h2 className="font-heading text-2xl font-extrabold text-accent">
          ¿Qué plan se ajusta a tu negocio?
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Puedes cambiar o actualizar tu plan en cualquier momento.
        </p>
      </div>

      {/* Grid de planes */}
      <div className="grid gap-4 md:grid-cols-3">
        {planes.map((plan) => {
          const isSelected = selectedPlan === plan.id
          const isPopular = plan.id === "negocio"
          const isDisabled = !plan.activo

          return (
            <button
              key={plan.id}
              type="button"
              disabled={isDisabled}
              onClick={() => handlePlanClick(plan.id)}
              className={`relative text-left rounded-2xl border-2 p-5 transition-all duration-200 ${
                isDisabled
                  ? "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
                  : isSelected
                  ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                  : "border-slate-200 bg-white hover:border-primary/40 hover:shadow-sm"
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-4 bg-primary text-accent px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm shadow-primary/20">
                  Más popular
                </div>
              )}

              <div className="flex items-center justify-between mb-3">
                <span className="font-heading text-lg font-bold text-accent">{plan.label}</span>
                {isSelected && (
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary text-accent">
                    <Check className="size-3.5" />
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-1">
                <span className="font-heading text-3xl font-extrabold text-accent">
                  ${plan.precioUsd}
                </span>
                <span className="text-sm text-slate-400">/mes</span>
              </div>

              {plan.precioUsdAnual > 0 && (
                <p className="text-xs text-slate-400 mt-1">
                  ${plan.precioUsdAnual}/año (ahorra ${(plan.precioUsd * 12 - plan.precioUsdAnual).toFixed(0)})
                </p>
              )}

              <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                {plan.descripcion}
              </p>

              {!isDisabled && (
                <div className="mt-4 space-y-1.5">
                  {plan.id === "basico" && (
                    <p className="text-xs font-semibold text-accent flex items-center gap-1">
                      <Check className="size-3 text-primary" /> Eliges una modalidad
                    </p>
                  )}
                  {plan.id === "negocio" && (
                    <>
                      <p className="text-xs font-semibold text-accent flex items-center gap-1">
                        <Check className="size-3 text-primary" /> Tienda + Agenda
                      </p>
                      <p className="text-xs font-semibold text-accent flex items-center gap-1">
                        <Check className="size-3 text-primary" /> Cambio libre entre módulos
                      </p>
                    </>
                  )}
                </div>
              )}

              {isDisabled && (
                <Badge variant="secondary" className="mt-3 text-[10px]">
                  Próximamente
                </Badge>
              )}
            </button>
          )
        })}
      </div>

      {/* Selector de modalidad (solo para Básico) */}
      <AnimatePresence>
        {selectedPlan === "basico" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Elige una modalidad para tu plan Básico:
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setSelectedModalidad("tienda")}
                    className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                      selectedModalidad === "tienda"
                        ? "border-primary bg-white shadow-sm"
                        : "border-slate-200 bg-white hover:border-primary/30"
                    }`}
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Store className="size-5" />
                    </div>
                    <div>
                      <p className="font-heading font-bold text-accent text-sm">Tienda</p>
                      <p className="text-xs text-slate-500">Vende productos online</p>
                    </div>
                    {selectedModalidad === "tienda" && (
                      <Check className="ml-auto size-5 text-primary shrink-0" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedModalidad("agenda")}
                    className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                      selectedModalidad === "agenda"
                        ? "border-primary bg-white shadow-sm"
                        : "border-slate-200 bg-white hover:border-primary/30"
                    }`}
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                      <Calendar className="size-5" />
                    </div>
                    <div>
                      <p className="font-heading font-bold text-accent text-sm">Agenda</p>
                      <p className="text-xs text-slate-500">Reserva de citas online</p>
                    </div>
                    {selectedModalidad === "agenda" && (
                      <Check className="ml-auto size-5 text-primary shrink-0" />
                    )}
                  </button>
                </div>
                <p className="mt-3 text-[10px] text-slate-400 leading-relaxed">
                  Esta elección define los módulos habilitados para tu cuenta. Si luego necesitas ambas modalidades, puedes migrar al plan Negocio.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botón continuar */}
      <Button
        type="button"
        className="w-full h-12 text-base font-bold gap-2"
        disabled={!canConfirm || loading}
        onClick={handleConfirm}
      >
        {loading ? "Creando cuenta..." : "Continuar"}
        {!loading && <ArrowRight className="size-4" />}
      </Button>

      {/* Información adicional */}
      <div className="text-center">
        <p className="text-xs text-slate-400">
          ¿Ya tienes cuenta?{' '}
          <a href="/login" className="text-primary font-semibold hover:underline">
            Inicia sesión
          </a>
        </p>
      </div>
    </div>
  )
}
