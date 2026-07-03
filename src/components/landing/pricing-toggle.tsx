"use client"

import { useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Store, Calendar, Building2, Crown } from "lucide-react"

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Store, Calendar, Building2, Crown,
}

interface PlanMode {
  label: string
  icon: string
  features: string[]
}

interface Plan {
  name: string
  priceMonthly: string
  priceYearly: string
  description: string
  features?: string[]
  modes?: PlanMode[]
  cta: string
  highlight: boolean
  badge?: string
}

export default function PricingToggle({ plans }: { plans: Plan[] }) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")
  const [emprendedorMode, setEmprendedorMode] = useState<number>(0)

  return (
    <div className="pt-6">
      <div className="flex justify-center items-center gap-3 mb-10">
        <span className={`text-sm font-semibold transition-colors duration-200 ${billingCycle === "monthly" ? "text-accent" : "text-slate-400 dark:text-slate-500"}`}>Mensual</span>
        <button
          onClick={() => setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")}
          className="w-14 h-7 rounded-full bg-slate-200 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 p-0.5 transition-all duration-300 flex relative"
        >
          <span
            className="size-5.5 rounded-full bg-white shadow-md block transition-all duration-300"
            style={{ marginLeft: billingCycle === "monthly" ? "0" : "auto" }}
          />
        </button>
        <div className="flex items-center gap-1.5">
          <span className={`text-sm font-semibold transition-colors duration-200 ${billingCycle === "yearly" ? "text-accent" : "text-slate-400 dark:text-slate-500"}`}>Anual</span>
          <span className="rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold">Ahorra 20%</span>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-3 pt-6 items-stretch">
        {plans.map((plan, idx) => {
          const currentPrice = billingCycle === "monthly" ? plan.priceMonthly : plan.priceYearly
          const hasModes = !!plan.modes
          const activeMode = hasModes ? plan.modes![emprendedorMode] : null
          const features = hasModes ? activeMode!.features : plan.features!

          return (
            <div key={idx} className="flex h-full animate-fade-up" style={{ animationDelay: `${idx * 0.1}s` }}>
              <div className={`relative flex flex-col w-full rounded-3xl border transition-all duration-300 overflow-hidden bg-white/80 dark:bg-slate-900/80 p-7 shadow-xs backdrop-blur-md ${
                plan.highlight
                  ? "border-primary shadow-xl ring-4 ring-primary/10 -translate-y-2"
                  : "border-slate-200/80 dark:border-slate-700 hover:border-primary/30 hover:shadow-md"
              }`}>
                {plan.highlight && (
                  <div className="absolute top-0 right-0 rounded-bl-2xl bg-primary px-4 py-1 text-[10px] font-black uppercase tracking-wider text-accent">Más Elegido</div>
                )}
                <div className="mb-6 space-y-1">
                  <h3 className="font-heading text-xl font-bold text-accent">{plan.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{plan.description}</p>
                </div>

                {hasModes && (
                  <div className="mb-5 flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                    {plan.modes!.map((mode, mIdx) => {
                      const Icon = iconMap[mode.icon] || Store
                      const isActive = emprendedorMode === mIdx
                      return (
                        <button
                          key={mIdx}
                          onClick={() => setEmprendedorMode(mIdx)}
                          className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                            isActive
                              ? "bg-white dark:bg-slate-700 text-accent shadow-sm"
                              : "text-slate-500 dark:text-slate-400 hover:text-accent"
                          }`}
                        >
                          <Icon className="mr-1.5 inline size-3.5" />
                          {mode.label}
                        </button>
                      )
                    })}
                  </div>
                )}

                <div className="mb-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-accent tracking-tight">${currentPrice}</span>
                  <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">/mes</span>
                  {billingCycle === "yearly" && plan.priceMonthly !== "0" && (
                    <span className="text-[10px] text-slate-500 block ml-2">Facturado anual</span>
                  )}
                </div>

                <ul className="mb-8 flex-1 space-y-3.5">
                  {features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400">
                      <CheckCircle className="size-4 shrink-0 text-emerald-500 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/register" className={`flex w-full items-center justify-center rounded-xl py-3.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 active:scale-[0.98] ${
                  plan.highlight
                    ? "bg-primary text-accent hover:brightness-105 shadow-md shadow-primary/15"
                    : "border border-slate-200 dark:border-slate-700 text-accent dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}>
                  {plan.cta}
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
