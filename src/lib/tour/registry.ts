import type { TourPlanConfig, TourStep } from "./types"
import { entrepreneurSteps } from "./entrepreneur"
import { reservationSteps } from "./reservation"
import { businessSteps } from "./business"
import { enterpriseSteps } from "./enterprise"

const registry: Record<string, TourPlanConfig> = {
  emprendedor: { id: "emprendedor", name: "Plan Emprendedor", steps: entrepreneurSteps },
  tienda: { id: "tienda", name: "Plan Tienda", steps: entrepreneurSteps },
  reservas: { id: "reservas", name: "Plan Reservas", steps: reservationSteps },
  agenda: { id: "agenda", name: "Plan Agenda", steps: reservationSteps },
  negocio: { id: "negocio", name: "Plan Negocio", steps: businessSteps },
  empresa: { id: "empresa", name: "Plan Empresa", steps: enterpriseSteps },
  empresarial: { id: "empresarial", name: "Plan Empresarial", steps: enterpriseSteps },
}

export function getTourSteps(planType: string): TourStep[] {
  const config = registry[planType] || registry["emprendedor"]
  return config.steps
}

export function getTourPlanName(planType: string): string {
  const config = registry[planType] || registry["emprendedor"]
  return config.name
}
