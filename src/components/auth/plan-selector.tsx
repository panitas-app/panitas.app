"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Check, Sparkles, Store, Calendar, Crown } from "lucide-react"
import { PLAN_DEFINITIONS, type PlanId } from "@/lib/plans"

interface PlanSelectorProps {
  onSelect: (planId: PlanId) => void
  loading?: boolean
}

const planIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  agenda: Calendar,
  comercio: Store,
  mayorista: Crown,
}

const planAccents: Record<string, string> = {
  agenda: "from-amber-500 to-amber-700",
  comercio: "from-primary to-blue-600",
  mayorista: "from-slate-700 to-slate-900",
}

export function PlanSelector({ onSelect, loading }: PlanSelectorProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null)

  const planes = Object.values(PLAN_DEFINITIONS).filter((p) => p.activo)

  function handleConfirm() {
    if (!selectedPlan) return
    onSelect(selectedPlan)
  }

  const canConfirm = !!selectedPlan

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

      <div className="grid gap-4 md:grid-cols-3">
        {planes.map((plan) => {
          const isSelected = selectedPlan === plan.id
          const isPopular = plan.id === "comercio"
          const isDisabled = !plan.activo
          const Icon = planIcons[plan.id] || Calendar

          return (
            <button
              key={plan.id}
              type="button"
              disabled={isDisabled}
              onClick={() => setSelectedPlan(plan.id)}
              className={`relative flex flex-col items-center rounded-2xl border-2 p-6 text-center transition-all ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-md"
                  : isPopular
                  ? "border-primary/30 bg-white shadow-sm hover:shadow-md"
                  : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm"
              } ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              {isPopular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-accent text-[10px] font-bold px-3 whitespace-nowrap shadow-sm">
                  Más popular
                </Badge>
              )}
              <div className={`mb-3 inline-flex size-12 items-center justify-center rounded-xl bg-gradient-to-br ${planAccents[plan.id]}`}>
                <Icon className="size-5 text-white" />
              </div>
              <h3 className="font-heading text-base font-bold text-accent">{plan.label}</h3>
              <div className="mt-2">
                <span className="text-2xl font-black text-accent">${plan.precioUsd}</span>
                <span className="text-xs text-slate-400 ml-1">/mes</span>
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
                  {plan.modules.slice(0, 3).map((m) => (
                    <p key={m} className="text-xs font-semibold text-accent flex items-center gap-1">
                      <Check className="size-3 text-primary" /> {m}
                    </p>
                  ))}
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

      {canConfirm && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <Button
            size="lg"
            onClick={handleConfirm}
            disabled={loading}
            className="h-12 px-10 rounded-xl bg-primary text-accent font-bold text-base shadow-lg shadow-primary/20 hover:brightness-105"
          >
            {loading ? "Procesando..." : "Continuar"}
          </Button>
        </motion.div>
      )}
    </div>
  )
}
